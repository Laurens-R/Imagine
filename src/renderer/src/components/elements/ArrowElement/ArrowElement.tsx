import React, { useRef, useState } from 'react';
import { useWhiteboardStore } from '../../../store/whiteboardStore';
import { snapVal } from '../../../utils/snap';
import type { ArrowElement } from '../../../types';

interface ArrowElProps {
  element: ArrowElement;
  isSelected: boolean;
  tool: string;
  onSelect: () => void;
  onUpdate: (updates: Partial<ArrowElement>) => void;
}

export const ArrowEl: React.FC<ArrowElProps> = ({ element, isSelected, tool, onSelect, onUpdate }) => {
  const zoom = useWhiteboardStore((s) => s.zoom);
  const gridEnabled = useWhiteboardStore((s) => s.gridEnabled);
  const gridSize = useWhiteboardStore((s) => s.gridSize);
  const dragStart = useRef<{ mx: number; my: number; ex: number; ey: number; ex2: number; ey2: number } | null>(null);
  const [hovered, setHovered] = useState(false);

  const { x, y, x2, y2, color, strokeWidth, rotation, zIndex } = element;

  // Arrowhead geometry
  const dx = x2 - x;
  const dy = y2 - y;
  const len = Math.hypot(dx, dy);
  const ux = len > 0 ? dx / len : 1;
  const uy = len > 0 ? dy / len : 0;
  const headLen = Math.max(12, strokeWidth * 4);
  const headAngle = 0.45; // radians
  const p1x = x2 - headLen * (ux * Math.cos(headAngle) - uy * Math.sin(headAngle));
  const p1y = y2 - headLen * (uy * Math.cos(headAngle) + ux * Math.sin(headAngle));
  const p2x = x2 - headLen * (ux * Math.cos(headAngle) + uy * Math.sin(headAngle));
  const p2y = y2 - headLen * (uy * Math.cos(headAngle) - ux * Math.sin(headAngle));

  const handleMouseDown = (e: React.MouseEvent) => {
    if (tool !== 'select') return;
    e.stopPropagation();
    onSelect();
    dragStart.current = { mx: e.clientX, my: e.clientY, ex: x, ey: y, ex2: x2, ey2: y2 };
    const onMove = (ev: MouseEvent) => {
      if (!dragStart.current) return;
      const ddx = (ev.clientX - dragStart.current.mx) / zoom;
      const ddy = (ev.clientY - dragStart.current.my) / zoom;
      const rawX = dragStart.current.ex + ddx;
      const rawY = dragStart.current.ey + ddy;
      if (gridEnabled) {
        const snappedX = snapVal(rawX, gridSize);
        const snappedY = snapVal(rawY, gridSize);
        const offX = dragStart.current.ex2 - dragStart.current.ex;
        const offY = dragStart.current.ey2 - dragStart.current.ey;
        onUpdate({ x: snappedX, y: snappedY, x2: snappedX + offX, y2: snappedY + offY });
      } else {
        onUpdate({ x: rawX, y: rawY, x2: dragStart.current.ex2 + ddx, y2: dragStart.current.ey2 + ddy });
      }
    };
    const onUp = () => {
      dragStart.current = null;
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  const transform = rotation !== 0 ? `rotate(${rotation} ${(x + x2) / 2} ${(y + y2) / 2})` : undefined;
  const hitWidth = Math.max(12, strokeWidth + 8);

  return (
    <g
      transform={transform}
      style={{ zIndex, cursor: tool === 'select' ? 'grab' : 'default', pointerEvents: 'all' }}
      onMouseDown={handleMouseDown}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Invisible wide hit area */}
      <line x1={x} y1={y} x2={x2} y2={y2} stroke="transparent" strokeWidth={hitWidth} />

      {/* Selection glow */}
      {(isSelected || hovered) && (
        <line
          x1={x} y1={y} x2={x2} y2={y2}
          stroke="#7c6aff"
          strokeWidth={strokeWidth + 4}
          strokeLinecap="round"
          opacity={isSelected ? 0.35 : 0.18}
        />
      )}

      {/* Shaft */}
      <line
        x1={x} y1={y} x2={x2} y2={y2}
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />

      {/* Arrowhead – only rendered for arrow elements (showArrowhead !== false) */}
      {(element.showArrowhead ?? true) && (
      <polyline
        points={`${p1x},${p1y} ${x2},${y2} ${p2x},${p2y}`}
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      )}

      {/* Endpoint handles when selected */}
      {isSelected && (
        <>
          <circle cx={x} cy={y} r={5} fill="white" stroke="#7c6aff" strokeWidth={1.5}
            style={{ cursor: 'crosshair' }}
            onMouseDown={(e) => {
              e.stopPropagation();
              const start = { mx: e.clientX, my: e.clientY, ox: x, oy: y };
              const onMove = (ev: MouseEvent) => {
                const rawX = start.ox + (ev.clientX - start.mx) / zoom;
                const rawY = start.oy + (ev.clientY - start.my) / zoom;
                onUpdate({
                  x: gridEnabled ? snapVal(rawX, gridSize) : rawX,
                  y: gridEnabled ? snapVal(rawY, gridSize) : rawY
                });
              };
              const onUp = () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
              window.addEventListener('mousemove', onMove); window.addEventListener('mouseup', onUp);
            }}
          />
          <circle cx={x2} cy={y2} r={5} fill="white" stroke="#7c6aff" strokeWidth={1.5}
            style={{ cursor: 'crosshair' }}
            onMouseDown={(e) => {
              e.stopPropagation();
              const start = { mx: e.clientX, my: e.clientY, ox: x2, oy: y2 };
              const onMove = (ev: MouseEvent) => {
                const rawX2 = start.ox + (ev.clientX - start.mx) / zoom;
                const rawY2 = start.oy + (ev.clientY - start.my) / zoom;
                onUpdate({
                  x2: gridEnabled ? snapVal(rawX2, gridSize) : rawX2,
                  y2: gridEnabled ? snapVal(rawY2, gridSize) : rawY2
                });
              };
              const onUp = () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
              window.addEventListener('mousemove', onMove); window.addEventListener('mouseup', onUp);
            }}
          />
        </>
      )}
    </g>
  );
};
