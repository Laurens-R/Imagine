import React, { useCallback, useRef, useState } from 'react';
import { useWhiteboardStore } from '../../../store/whiteboardStore';
import { snapVal } from '../../../utils/snap';
import { ICON_DEFS_MAP } from '../../../utils/iconData';
import type { IconElement } from '../../../types';

interface IconElProps {
  element: IconElement;
  isSelected: boolean;
  tool: string;
  onSelect: (ctrlKey?: boolean) => void;
  onUpdate: (updates: Partial<IconElement>) => void;
  onStartConnection: () => void;
  onCompleteConnection: () => void;
}

export const IconEl: React.FC<IconElProps> = ({
  element,
  isSelected,
  tool,
  onSelect,
  onUpdate,
  onStartConnection,
  onCompleteConnection,
}) => {
  const zoom = useWhiteboardStore((s) => s.zoom);
  const pendingConn = useWhiteboardStore((s) => s.pendingConnection);
  const gridEnabled = useWhiteboardStore((s) => s.gridEnabled);
  const gridSize = useWhiteboardStore((s) => s.gridSize);
  const dragStart = useRef<{ mx: number; my: number; ex: number; ey: number } | null>(null);
  const [isConnHovered, setIsConnHovered] = useState(false);

  const iconDef = ICON_DEFS_MAP[element.iconId];
  const { x, y, width, height, rotation, zIndex, color, strokeWidth } = element;
  const pad = 6;

  const isPendingSource = pendingConn != null && pendingConn.sourceId === element.id;
  const showConnHighlight = pendingConn != null && pendingConn.sourceId !== element.id;
  const showConnSource = tool === 'connection' && !isPendingSource && pendingConn == null;

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (pendingConn && pendingConn.sourceId !== element.id) {
        e.stopPropagation();
        onCompleteConnection();
        return;
      }
      if (tool === 'connection') {
        e.stopPropagation();
        onStartConnection();
        return;
      }
      if (tool !== 'select') return;
      e.stopPropagation();
      onSelect(e.ctrlKey);
      dragStart.current = { mx: e.clientX, my: e.clientY, ex: element.x, ey: element.y };

      const onMove = (ev: MouseEvent) => {
        if (!dragStart.current) return;
        const ddx = (ev.clientX - dragStart.current.mx) / zoom;
        const ddy = (ev.clientY - dragStart.current.my) / zoom;
        const effDdx = ev.shiftKey ? (Math.abs(ddx) >= Math.abs(ddy) ? ddx : 0) : ddx;
        const effDdy = ev.shiftKey ? (Math.abs(ddy) > Math.abs(ddx) ? ddy : 0) : ddy;
        const rawX = dragStart.current.ex + effDdx;
        const rawY = dragStart.current.ey + effDdy;
        onUpdate({
          x: gridEnabled ? snapVal(rawX, gridSize) : rawX,
          y: gridEnabled ? snapVal(rawY, gridSize) : rawY,
        });
      };
      const onUp = () => {
        dragStart.current = null;
        window.removeEventListener('mousemove', onMove);
        window.removeEventListener('mouseup', onUp);
      };
      window.addEventListener('mousemove', onMove);
      window.addEventListener('mouseup', onUp);
    },
    [tool, element.id, element.x, element.y, pendingConn, zoom, gridEnabled, gridSize, onSelect, onUpdate, onStartConnection, onCompleteConnection]
  );

  const cx = x + width / 2;
  const cy = y + height / 2;
  const transform = rotation !== 0 ? `rotate(${rotation}, ${cx}, ${cy})` : undefined;

  if (!iconDef) return null;

  return (
    <g
      transform={transform}
      style={{
        zIndex,
        cursor: tool === 'select' ? 'grab' : (showConnHighlight || showConnSource) ? 'crosshair' : 'default',
        pointerEvents: 'all',
      }}
      onMouseDown={handleMouseDown}
      onMouseEnter={() => setIsConnHovered(true)}
      onMouseLeave={() => setIsConnHovered(false)}
    >
      {/* Transparent hit area */}
      <rect x={x} y={y} width={width} height={height} fill="transparent" stroke="none" />

      {/* Selection highlight */}
      {isSelected && (
        <rect
          x={x - pad} y={y - pad}
          width={width + pad * 2} height={height + pad * 2}
          fill="none" stroke="#7c6aff" strokeWidth={1.5} strokeDasharray="5 3" rx={4}
        />
      )}

      {/* Icon SVG scaled to element bounds */}
      <svg x={x} y={y} width={width} height={height} viewBox="0 0 24 24" overflow="visible">
        {iconDef.paths.map((d, i) => (
          <path
            key={i}
            d={d}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ))}
      </svg>

      {/* Connection highlights */}
      {isPendingSource && (
        <rect
          x={x - pad} y={y - pad}
          width={width + pad * 2} height={height + pad * 2}
          fill="none" stroke="#27ae60" strokeWidth={2.5} rx={4} opacity={0.9}
        />
      )}
      {showConnHighlight && (
        <rect
          x={x - pad} y={y - pad}
          width={width + pad * 2} height={height + pad * 2}
          fill={isConnHovered ? 'rgba(231,76,60,0.08)' : 'none'}
          stroke="#e74c3c"
          strokeWidth={isConnHovered ? 2.5 : 1.5}
          rx={4}
          opacity={isConnHovered ? 1 : 0.5}
          style={{ transition: 'opacity 0.12s, stroke-width 0.12s' }}
        />
      )}
      {showConnSource && (
        <rect
          x={x - pad} y={y - pad}
          width={width + pad * 2} height={height + pad * 2}
          fill="rgba(231,76,60,0.04)" stroke="#e74c3c" strokeWidth={1.5} rx={4} opacity={0.6}
        />
      )}
    </g>
  );
};
