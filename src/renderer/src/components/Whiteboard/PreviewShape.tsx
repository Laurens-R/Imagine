import React from 'react';
import { generatePreviewRoughPaths } from '../../utils/roughShapes';
import type { ShapePreview } from '../../types';

export interface PreviewShapeProps {
  preview: ShapePreview;
}

export const PreviewShape: React.FC<PreviewShapeProps> = ({ preview }) => {
  const paths = generatePreviewRoughPaths(
    preview.shapeType,
    preview.x,
    preview.y,
    preview.width,
    preview.height,
    'transparent',
    preview.strokeColor,
    preview.roughness,
    preview.seed
  );

  return (
    <g opacity={0.7}>
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
    </g>
  );
};
