import { getStroke } from 'perfect-freehand';

export interface DrawingPoint {
  x: number;
  y: number;
  pressure?: number;
}

/** Convert perfect-freehand outline points to an SVG path string */
export function pointsToSvgPath(outlinePoints: number[][]): string {
  if (outlinePoints.length < 2) return '';

  const d: (string | number)[] = [
    'M',
    outlinePoints[0][0].toFixed(1),
    outlinePoints[0][1].toFixed(1)
  ];

  for (let i = 1; i < outlinePoints.length - 1; i++) {
    const midX = ((outlinePoints[i][0] + outlinePoints[i + 1][0]) / 2).toFixed(1);
    const midY = ((outlinePoints[i][1] + outlinePoints[i + 1][1]) / 2).toFixed(1);
    d.push('Q', outlinePoints[i][0].toFixed(1), outlinePoints[i][1].toFixed(1), midX, midY);
  }

  d.push('Z');
  return d.join(' ');
}

/** Generate a smooth SVG path from raw input points */
export function generateDrawingPath(
  points: [number, number, number][],
  size: number,
  isComplete = false
): string {
  if (points.length === 0) return '';

  const outline = getStroke(points, {
    size,
    thinning: 0.5,
    smoothing: 0.5,
    streamline: 0.5,
    easing: (t) => t,
    simulatePressure: true,
    last: isComplete
  });

  return pointsToSvgPath(outline);
}

/** Generate a small dot path for single-click marks */
export function generateDotPath(x: number, y: number, size: number): string {
  const r = size / 2;
  return `M ${x} ${y - r} A ${r} ${r} 0 1 1 ${x} ${y + r} A ${r} ${r} 0 1 1 ${x} ${y - r} Z`;
}
