import React, { useCallback, useRef, useState } from 'react';
import { useWhiteboardStore } from '../../../store/whiteboardStore';
import { generateRoughPaths } from '../../../utils/roughShapes';
import { snapVal } from '../../../utils/snap';
import type { ShapeElement } from '../../../types';

interface ShapeElProps {
  element: ShapeElement;
  isSelected: boolean;
  tool: string;
  onSelect: () => void;
  onUpdate: (updates: Partial<ShapeElement>) => void;
  onStartConnection: () => void;
  onCompleteConnection: () => void;
}

export const ShapeEl: React.FC<ShapeElProps> = ({
  element,
  isSelected,
  tool,
  onSelect,
  onUpdate,
  onStartConnection,
  onCompleteConnection
}) => {
  const zoom = useWhiteboardStore((s) => s.zoom);
  const pan = useWhiteboardStore((s) => s.pan);
  const pendingConn = useWhiteboardStore((s) => s.pendingConnection);
  const gridEnabled = useWhiteboardStore((s) => s.gridEnabled);
  const gridSize = useWhiteboardStore((s) => s.gridSize);
  const dragStart = useRef<{ mx: number; my: number; ex: number; ey: number } | null>(null);
  const [isConnHovered, setIsConnHovered] = useState(false);

  const paths = generateRoughPaths(element);
  const { x, y, width, height, rotation, zIndex } = element;
  const pad = 6;

  const isPendingSource = pendingConn != null && pendingConn.sourceId === element.id;
  const showConnHighlight = pendingConn != null && pendingConn.sourceId !== element.id;
  const showConnSource = tool === 'connection' && !isPendingSource && pendingConn == null;

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      // Complete a pending connection
      if (pendingConn && pendingConn.sourceId !== element.id) {
        e.stopPropagation();
        onCompleteConnection();
        return;
      }
      // Start a connection
      if (tool === 'connection') {
        e.stopPropagation();
        onStartConnection();
        return;
      }
      if (tool !== 'select') return;
      e.stopPropagation();
      onSelect();
      dragStart.current = { mx: e.clientX, my: e.clientY, ex: element.x, ey: element.y };

      const onMove = (ev: MouseEvent) => {
        if (!dragStart.current) return;
        const ddx = (ev.clientX - dragStart.current.mx) / zoom;
        const ddy = (ev.clientY - dragStart.current.my) / zoom;
        const effDdx = ev.shiftKey ? (Math.abs(ddx) >= Math.abs(ddy) ? ddx : 0) : ddx;
        const effDdy = ev.shiftKey ? (Math.abs(ddy) >  Math.abs(ddx) ? ddy : 0) : ddy;
        const rawX = dragStart.current.ex + effDdx;
        const rawY = dragStart.current.ey + effDdy;
        onUpdate({
          x: gridEnabled ? snapVal(rawX, gridSize) : rawX,
          y: gridEnabled ? snapVal(rawY, gridSize) : rawY
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

  const transform = rotation !== 0
    ? `rotate(${rotation}, ${x + width / 2}, ${y + height / 2})`
    : undefined;

  return (
    <g
      transform={transform}
      style={{
        zIndex,
        cursor: tool === 'select' ? 'grab' : (showConnHighlight || showConnSource) ? 'crosshair' : 'default',
        pointerEvents: 'all'
      }}
      onMouseDown={handleMouseDown}
      onMouseEnter={() => setIsConnHovered(true)}
      onMouseLeave={() => setIsConnHovered(false)}
    >
      {/* Selection highlight */}
      {isSelected && (
        <rect
          x={x - pad}
          y={y - pad}
          width={width + pad * 2}
          height={height + pad * 2}
          fill="none"
          stroke="#7c6aff"
          strokeWidth={1.5}
          strokeDasharray="5 3"
          rx={4}
        />
      )}

      {/* Rough.js drawn paths */}
      {paths.map((p, i) => (
        <path
          key={i}
          d={p.d}
          fill={p.fill}
          stroke={p.stroke}
          strokeWidth={p.strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ))}

      {/* Connection mode highlights */}
      {isPendingSource && (
        <rect
          x={x - pad} y={y - pad}
          width={width + pad * 2} height={height + pad * 2}
          fill="none" stroke="#27ae60" strokeWidth={2.5} rx={4}
          opacity={0.9}
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
          fill={isConnHovered ? 'rgba(39,174,96,0.07)' : 'none'}
          stroke="#27ae60"
          strokeWidth={isConnHovered ? 2 : 1.5}
          rx={4}
          opacity={isConnHovered ? 1 : 0.45}
          style={{ transition: 'opacity 0.12s, stroke-width 0.12s' }}
        />
      )}

      {/* Transparent hit area */}
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        fill="transparent"
        stroke="none"
        style={{ cursor: tool === 'select' ? 'grab' : 'default' }}
      />

      {/* Resize handles – 8 positions */}
      {isSelected && tool === 'select' && (
        <SVGResizeHandles
          el={{ x, y, width, height, rotation }}
          zoom={zoom}
          pan={pan}
          onUpdate={onUpdate}
        />
      )}
    </g>
  );
};

// ── SVG Resize Handles ────────────────────────────────────────────────────────

type HandleType = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w';

const SVG_HANDLES: { handle: HandleType; cursor: string }[] = [
  { handle: 'nw', cursor: 'nwse-resize' },
  { handle: 'n',  cursor: 'ns-resize'   },
  { handle: 'ne', cursor: 'nesw-resize' },
  { handle: 'e',  cursor: 'ew-resize'   },
  { handle: 'se', cursor: 'nwse-resize' },
  { handle: 's',  cursor: 'ns-resize'   },
  { handle: 'sw', cursor: 'nesw-resize' },
  { handle: 'w',  cursor: 'ew-resize'   },
];

interface SVGResizeHandlesProps {
  el: { x: number; y: number; width: number; height: number; rotation: number };
  zoom: number;
  pan: { x: number; y: number };
  onUpdate: (updates: Partial<ShapeElement>) => void;
}

const SVGResizeHandles: React.FC<SVGResizeHandlesProps> = ({ el, zoom, pan, onUpdate }) => {
  const startRef = useRef<{
    mx: number; my: number;
    ex: number; ey: number; ew: number; eh: number;
  } | null>(null);
  const rotateStartRef = useRef<{ startAngle: number; startRotation: number } | null>(null);

  const gridEnabled = useWhiteboardStore((s) => s.gridEnabled);
  const gridSize = useWhiteboardStore((s) => s.gridSize);

  const getHandlePos = (handle: HandleType) => {
    const { x, y, width, height } = el;
    const map: Record<HandleType, [number, number]> = {
      nw: [x,            y           ],
      n:  [x + width / 2, y           ],
      ne: [x + width,    y           ],
      e:  [x + width,    y + height / 2],
      se: [x + width,    y + height  ],
      s:  [x + width / 2, y + height  ],
      sw: [x,            y + height  ],
      w:  [x,            y + height / 2],
    };
    return map[handle];
  };

  const handleMouseDown = (e: React.MouseEvent, handle: HandleType) => {
    e.stopPropagation();
    e.preventDefault();
    startRef.current = {
      mx: e.clientX, my: e.clientY,
      ex: el.x, ey: el.y, ew: el.width, eh: el.height,
    };

    const onMove = (ev: MouseEvent) => {
      if (!startRef.current) return;
      const { mx, my, ex, ey, ew, eh } = startRef.current;
      const dx = (ev.clientX - mx) / zoom;
      const dy = (ev.clientY - my) / zoom;

      let nx = ex, ny = ey, nw = ew, nh = eh;
      if (handle.includes('w')) { nx = ex + dx; nw = ew - dx; }
      if (handle.includes('e')) { nw = ew + dx; }
      if (handle.includes('n')) { ny = ey + dy; nh = eh - dy; }
      if (handle.includes('s')) { nh = eh + dy; }

      // Snap moving edge to grid
      if (gridEnabled) {
        if (handle.includes('w')) { nx = snapVal(nx, gridSize); nw = ex + ew - nx; }
        else if (handle.includes('e')) { nw = snapVal(nx + nw, gridSize) - nx; }
        if (handle.includes('n')) { ny = snapVal(ny, gridSize); nh = ey + eh - ny; }
        else if (handle.includes('s')) { nh = snapVal(ny + nh, gridSize) - ny; }
      }

      const MIN = 20;
      if (nw < MIN) { if (handle.includes('w')) nx = ex + ew - MIN; nw = MIN; }
      if (nh < MIN) { if (handle.includes('n')) ny = ey + eh - MIN; nh = MIN; }

      onUpdate({ x: nx, y: ny, width: nw, height: nh });
    };

    const onUp = () => {
      startRef.current = null;
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  const hs = 6 / zoom; // half handle size in canvas units → ~6px on screen
  const pad = 6; // matches selection rect padding
  const rotOff = 22 / zoom; // rotation handle distance above selection box

  const rotateMD = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    const screenCX = (el.x + el.width / 2) * zoom + pan.x;
    const screenCY = (el.y + el.height / 2) * zoom + pan.y;
    const startAngle = Math.atan2(e.clientY - screenCY, e.clientX - screenCX) * (180 / Math.PI);
    rotateStartRef.current = { startAngle, startRotation: el.rotation };

    const onMove = (ev: MouseEvent) => {
      if (!rotateStartRef.current) return;
      const { startAngle: sa, startRotation } = rotateStartRef.current;
      const angle = Math.atan2(ev.clientY - screenCY, ev.clientX - screenCX) * (180 / Math.PI);
      let newRotation = startRotation + (angle - sa);
      if (ev.shiftKey) newRotation = Math.round(newRotation / 45) * 45;
      onUpdate({ rotation: newRotation });
    };
    const onUp = () => {
      rotateStartRef.current = null;
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  return (
    <>
      {SVG_HANDLES.map(({ handle, cursor }) => {
        const [cx, cy] = getHandlePos(handle);
        return (
          <rect
            key={handle}
            x={cx - hs}
            y={cy - hs}
            width={hs * 2}
            height={hs * 2}
            rx={hs * 0.33}
            fill="white"
            stroke="#7c6aff"
            strokeWidth={1.5 / zoom}
            style={{ cursor }}
            onMouseDown={(e) => handleMouseDown(e, handle)}
          />
        );
      })}      {/* Rotation stem */}
      <line
        x1={el.x + el.width / 2}
        y1={el.y - pad}
        x2={el.x + el.width / 2}
        y2={el.y - pad - rotOff}
        stroke="#7c6aff"
        strokeWidth={1.5 / zoom}
        opacity={0.6}
        pointerEvents="none"
      />
      {/* Rotation handle */}
      <circle
        cx={el.x + el.width / 2}
        cy={el.y - pad - rotOff}
        r={hs * 1.5}
        fill="white"
        stroke="#7c6aff"
        strokeWidth={1.5 / zoom}
        style={{ cursor: 'grab' }}
        onMouseDown={rotateMD}
      />    </>
  );
};
