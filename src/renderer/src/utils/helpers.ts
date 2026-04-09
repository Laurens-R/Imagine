import type { WhiteboardElement, Point } from '../types';

/** Get the center point of any whiteboard element */
export function getElementCenter(element: WhiteboardElement): Point {
  if (element.type === 'drawing') {
    if (element.points.length === 0) return { x: element.x, y: element.y };
    const xs = element.points.map((p) => p[0]);
    const ys = element.points.map((p) => p[1]);
    return {
      x: (Math.min(...xs) + Math.max(...xs)) / 2,
      y: (Math.min(...ys) + Math.max(...ys)) / 2
    };
  }
  return {
    x: element.x + (element as { width: number }).width / 2,
    y: element.y + (element as { height: number }).height / 2
  };
}

/** Generate a "drooping string" SVG path between two points */
export function getStringPath(from: Point, to: Point): { d: string; midX: number; midY: number } {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const dist = Math.hypot(dx, dy);

  // Sag: 20% of distance, gravity pulls down (~+Y), capped
  const sag = Math.min(dist * 0.22, 120);
  const midX = (from.x + to.x) / 2;
  const midY = (from.y + to.y) / 2 + sag;

  return {
    d: `M ${from.x.toFixed(1)} ${from.y.toFixed(1)} Q ${midX.toFixed(1)} ${midY.toFixed(1)} ${to.x.toFixed(1)} ${to.y.toFixed(1)}`,
    midX,
    midY
  };
}

/** Convert screen/client coords to whiteboard canvas coords */
export function screenToCanvas(
  clientX: number,
  clientY: number,
  containerRect: DOMRect,
  pan: Point,
  zoom: number
): Point {
  return {
    x: (clientX - containerRect.left - pan.x) / zoom,
    y: (clientY - containerRect.top - pan.y) / zoom
  };
}

/** Clamp a number between min and max */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/** Generate a random rotation in a small range for natural placement feel */
export function naturalRotation(range = 4): number {
  return (Math.random() - 0.5) * range * 2;
}

/** Generate a random polaroid rotation */
export function polaroidRotation(): number {
  return (Math.random() - 0.5) * 14;
}

/** Check if a point is near a line segment (for eraser) */
export function pointNearSegment(
  px: number,
  py: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  radius: number
): boolean {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return Math.hypot(px - x1, py - y1) < radius;
  const t = clamp(((px - x1) * dx + (py - y1) * dy) / lenSq, 0, 1);
  const nearX = x1 + t * dx;
  const nearY = y1 + t * dy;
  return Math.hypot(px - nearX, py - nearY) < radius;
}
