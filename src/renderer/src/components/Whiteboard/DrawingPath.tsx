import React, { useRef } from 'react';
import { useWhiteboardStore } from '../../store/whiteboardStore';
import { generateDrawingPath } from '../../utils/drawing';
import { snapVal } from '../../utils/snap';
import type { DrawingElement, WhiteboardElement } from '../../types';

export interface DrawingPathProps {
  element: DrawingElement;
  isSelected: boolean;
  tool: string;
  zoom: number;
  pan: { x: number; y: number };
  onSelect: () => void;
  onUpdate: (updates: Partial<WhiteboardElement>) => void;
}

export const DrawingPath: React.FC<DrawingPathProps> = ({
  element, isSelected, tool, zoom, pan, onSelect, onUpdate,
}) => {
  const gridEnabled = useWhiteboardStore((s) => s.gridEnabled);
  const gridSize = useWhiteboardStore((s) => s.gridSize);
  const dragRef = useRef<{ mx: number; my: number; points: [number, number, number][] } | null>(null);

  const pathD = generateDrawingPath(element.points, element.size, true);
  if (!pathD) return null;

  const pts = element.points;
  const xs = pts.map((p) => p[0]);
  const ys = pts.map((p) => p[1]);
  const bx = Math.min(...xs);
  const by = Math.min(...ys);
  const bw = Math.max(Math.max(...xs) - bx, 1);
  const bh = Math.max(Math.max(...ys) - by, 1);
  const cx = bx + bw / 2;
  const cy = by + bh / 2;
  const rotation = element.rotation ?? 0;
  const transform = rotation !== 0 ? `rotate(${rotation}, ${cx}, ${cy})` : undefined;

  const pad = 8;
  const ROTATE_OFFSET = 28;
  const HS = 8;

  const handleMouseDown = (e: React.MouseEvent) => {
    if (tool !== 'select') return;
    e.stopPropagation();
    onSelect();
    const origPts = element.points.slice() as [number, number, number][];
    dragRef.current = { mx: e.clientX, my: e.clientY, points: origPts };
    const onMove = (ev: MouseEvent) => {
      if (!dragRef.current) return;
      const ddx = (ev.clientX - dragRef.current.mx) / zoom;
      const ddy = (ev.clientY - dragRef.current.my) / zoom;
      const newPts = dragRef.current.points.map(([px, py, pr]) => [
        gridEnabled ? snapVal(px + ddx, gridSize) : px + ddx,
        gridEnabled ? snapVal(py + ddy, gridSize) : py + ddy,
        pr,
      ] as [number, number, number]);
      onUpdate({ x: newPts[0][0], y: newPts[0][1], points: newPts });
    };
    const onUp = () => {
      dragRef.current = null;
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  const handleResizeMD = (e: React.MouseEvent, hId: string) => {
    e.stopPropagation();
    e.preventDefault();
    const origPts = element.points.slice() as [number, number, number][];
    const startMx = e.clientX, startMy = e.clientY;
    const onMove = (ev: MouseEvent) => {
      const ddx = (ev.clientX - startMx) / zoom;
      const ddy = (ev.clientY - startMy) / zoom;
      let nbx = bx, nby = by, nbw = bw, nbh = bh;
      if (hId.includes('w')) { nbx = bx + ddx; nbw = bw - ddx; }
      if (hId.includes('e')) { nbw = bw + ddx; }
      if (hId.includes('n')) { nby = by + ddy; nbh = bh - ddy; }
      if (hId.includes('s')) { nbh = bh + ddy; }
      if (nbw < 10) { if (hId.includes('w')) nbx = bx + bw - 10; nbw = 10; }
      if (nbh < 10) { if (hId.includes('n')) nby = by + bh - 10; nbh = 10; }
      const sx = nbw / bw, sy = nbh / bh;
      const newPts = origPts.map(([px, py, pr]) => [
        nbx + (px - bx) * sx, nby + (py - by) * sy, pr,
      ] as [number, number, number]);
      onUpdate({ x: newPts[0][0], y: newPts[0][1], points: newPts });
    };
    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  const handleRotateMD = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    const screenCX = cx * zoom + pan.x;
    const screenCY = cy * zoom + pan.y;
    const startAngle = Math.atan2(e.clientY - screenCY, e.clientX - screenCX) * (180 / Math.PI);
    const startRot = rotation;
    const onMove = (ev: MouseEvent) => {
      const angle = Math.atan2(ev.clientY - screenCY, ev.clientX - screenCX) * (180 / Math.PI);
      let newRot = startRot + (angle - startAngle);
      if (ev.shiftKey) newRot = Math.round(newRot / 45) * 45;
      onUpdate({ rotation: newRot });
    };
    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  const handles: { id: string; hx: number; hy: number; cursor: string }[] = [
    { id: 'nw', hx: bx - pad,      hy: by - pad,      cursor: 'nwse-resize' },
    { id: 'n',  hx: bx + bw / 2,   hy: by - pad,      cursor: 'ns-resize'   },
    { id: 'ne', hx: bx + bw + pad, hy: by - pad,      cursor: 'nesw-resize' },
    { id: 'e',  hx: bx + bw + pad, hy: by + bh / 2,   cursor: 'ew-resize'   },
    { id: 'se', hx: bx + bw + pad, hy: by + bh + pad, cursor: 'nwse-resize' },
    { id: 's',  hx: bx + bw / 2,   hy: by + bh + pad, cursor: 'ns-resize'   },
    { id: 'sw', hx: bx - pad,      hy: by + bh + pad, cursor: 'nesw-resize' },
    { id: 'w',  hx: bx - pad,      hy: by + bh / 2,   cursor: 'ew-resize'   },
  ];

  return (
    <g
      transform={transform}
      style={{ cursor: tool === 'select' ? 'grab' : 'pointer', pointerEvents: 'all' }}
      onMouseDown={handleMouseDown}
    >
      {isSelected && (
        <path
          d={pathD}
          fill="none"
          stroke="#7c6aff"
          strokeWidth={element.size + 8}
          opacity={0.3}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}
      <path
        d={pathD}
        fill={element.color}
        opacity={element.opacity}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {isSelected && tool === 'select' && (
        <>
          <rect
            x={bx - pad} y={by - pad} width={bw + pad * 2} height={bh + pad * 2}
            fill="none" stroke="#7c6aff" strokeWidth={1} strokeDasharray="4 3" rx={3}
          />
          <line
            x1={bx + bw / 2} y1={by - pad}
            x2={bx + bw / 2} y2={by - pad - ROTATE_OFFSET}
            stroke="#7c6aff" strokeWidth={1.5}
          />
          <circle
            cx={bx + bw / 2} cy={by - pad - ROTATE_OFFSET}
            r={6} fill="white" stroke="#7c6aff" strokeWidth={1.5}
            style={{ cursor: 'grab' }}
            onMouseDown={handleRotateMD}
          />
          {handles.map(({ id, hx, hy, cursor }) => (
            <rect
              key={id}
              x={hx - HS / 2} y={hy - HS / 2} width={HS} height={HS}
              fill="white" stroke="#7c6aff" strokeWidth={1.5} rx={1}
              style={{ cursor }}
              onMouseDown={(e) => handleResizeMD(e, id)}
            />
          ))}
        </>
      )}
    </g>
  );
};
