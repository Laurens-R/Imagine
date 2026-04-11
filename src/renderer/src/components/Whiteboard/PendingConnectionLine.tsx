import React from 'react';
import { getStringPath } from '../../utils/helpers';

interface PendingConnectionLineProps {
  pending: { sourceX: number; sourceY: number; currentX: number; currentY: number };
}

export const PendingConnectionLine: React.FC<PendingConnectionLineProps> = ({ pending }) => {
  const { d } = getStringPath(
    { x: pending.sourceX, y: pending.sourceY },
    { x: pending.currentX, y: pending.currentY }
  );

  return (
    <g>
      <path
        d={d}
        fill="none"
        stroke="#b22222"
        strokeWidth={1.5}
        strokeDasharray="6 4"
        strokeLinecap="round"
        opacity={0.7}
      />
      <circle cx={pending.sourceX} cy={pending.sourceY} r={6} fill="#c0392b" />
    </g>
  );
};
