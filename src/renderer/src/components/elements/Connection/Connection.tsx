import React from 'react';
import { getStringPath } from '../../../utils/helpers';
import type { Connection as ConnectionType, Point } from '../../../types';

interface ConnectionProps {
  connection: ConnectionType;
  sourceCenter: Point;
  targetCenter: Point;
  isSelected: boolean;
}

export const Connection: React.FC<ConnectionProps> = ({
  connection,
  sourceCenter,
  targetCenter,
  isSelected
}) => {
  const { d, midX, midY } = getStringPath(sourceCenter, targetCenter);
  const pinColor = connection.color;
  const pinShadow = 'rgba(0,0,0,0.4)';

  return (
    <g style={{ pointerEvents: 'all', cursor: 'pointer' }}>
      {/* String shadow for depth */}
      <path
        d={d}
        fill="none"
        stroke="rgba(0,0,0,0.15)"
        strokeWidth={3}
        strokeLinecap="round"
        transform="translate(0, 2)"
      />

      {/* Main string */}
      <path
        d={d}
        fill="none"
        stroke={connection.color}
        strokeWidth={isSelected ? 2.5 : 1.8}
        strokeLinecap="round"
        style={{
          filter: `drop-shadow(0 1px 2px ${pinShadow})`
        }}
      />

      {/* Source pin */}
      <Pin x={sourceCenter.x} y={sourceCenter.y} color={pinColor} />

      {/* Target pin */}
      <Pin x={targetCenter.x} y={targetCenter.y} color={pinColor} />

      {/* Optional label along the string */}
      {connection.label && (
        <text
          x={midX}
          y={midY - 10}
          textAnchor="middle"
          fill="#333"
          fontSize={13}
          fontFamily="Caveat, cursive"
          style={{ pointerEvents: 'none', userSelect: 'none' }}
        >
          {connection.label}
        </text>
      )}
    </g>
  );
};

// ── Pin thumbtack ────────────────────────────────────────────────────────────

interface PinProps {
  x: number;
  y: number;
  color: string;
}

const Pin: React.FC<PinProps> = ({ x, y, color }) => {
  return (
    <g>
      {/* Pin needle shadow */}
      <circle cx={x + 0.5} cy={y + 1} r={5.5} fill="rgba(0,0,0,0.25)" />
      {/* Pin head */}
      <circle cx={x} cy={y} r={6} fill={color} />
      {/* Pin highlight */}
      <circle cx={x - 1.5} cy={y - 1.5} r={2} fill="rgba(255,255,255,0.55)" />
      {/* Pin center */}
      <circle cx={x} cy={y} r={1.5} fill="rgba(0,0,0,0.3)" />
    </g>
  );
};
