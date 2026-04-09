import React, { useCallback, useRef, useState } from 'react';
import { useWhiteboardStore } from '../../../store/whiteboardStore';
import { generateRoughPaths } from '../../../utils/roughShapes';
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
  const pendingConn = useWhiteboardStore((s) => s.pendingConnection);
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
        onUpdate({
          x: dragStart.current.ex + (ev.clientX - dragStart.current.mx) / zoom,
          y: dragStart.current.ey + (ev.clientY - dragStart.current.my) / zoom
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
    [tool, element.id, element.x, element.y, pendingConn, zoom, onSelect, onUpdate, onStartConnection, onCompleteConnection]
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

      {/* Resize handle (bottom-right corner) */}
      {isSelected && (
        <ResizeHandle
          x={x + width}
          y={y + height}
          zoom={zoom}
          onResize={(dx, dy) => {
            onUpdate({ width: Math.max(20, width + dx), height: Math.max(20, height + dy) });
          }}
        />
      )}
    </g>
  );
};

interface ResizeHandleProps {
  x: number;
  y: number;
  zoom: number;
  onResize: (dx: number, dy: number) => void;
}

const ResizeHandle: React.FC<ResizeHandleProps> = ({ x, y, zoom, onResize }) => {
  const start = useRef<{ mx: number; my: number } | null>(null);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    start.current = { mx: e.clientX, my: e.clientY };

    const onMove = (ev: MouseEvent) => {
      if (!start.current) return;
      const dx = (ev.clientX - start.current.mx) / zoom;
      const dy = (ev.clientY - start.current.my) / zoom;
      start.current = { mx: ev.clientX, my: ev.clientY };
      onResize(dx, dy);
    };
    const onUp = () => {
      start.current = null;
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  return (
    <rect
      x={x - 6}
      y={y - 6}
      width={12}
      height={12}
      rx={2}
      fill="#7c6aff"
      stroke="white"
      strokeWidth={1.5}
      style={{ cursor: 'nwse-resize' }}
      onMouseDown={handleMouseDown}
    />
  );
};
