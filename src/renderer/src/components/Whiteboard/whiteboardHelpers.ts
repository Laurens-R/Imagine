import type { WhiteboardElement, DrawingElement, ArrowElement, ElementGroup } from '../../types';

export const ERASE_RADIUS = 20;

export type LassoRect = { startX: number; startY: number; currentX: number; currentY: number };

/** Promote element IDs to their parent group ID where applicable */
export function promoteToTopLevel(ids: string[], groups: ElementGroup[]): string[] {
  const result = new Set<string>();
  for (const id of ids) {
    const grp = groups.find((g) => g.childIds.includes(id));
    result.add(grp ? grp.id : id);
  }
  return [...result];
}

/** Returns axis-aligned bounding box for any element (ignores rotation for simplicity) */
export function getElementBounds(el: WhiteboardElement): { x: number; y: number; w: number; h: number } {
  if (el.type === 'drawing') {
    const d = el as DrawingElement;
    if (d.points.length === 0) return { x: d.x, y: d.y, w: 1, h: 1 };
    const xs = d.points.map((p) => p[0]);
    const ys = d.points.map((p) => p[1]);
    const x = Math.min(...xs);
    const y = Math.min(...ys);
    return { x, y, w: Math.max(...xs) - x || 1, h: Math.max(...ys) - y || 1 };
  }
  if (el.type === 'arrow') {
    const a = el as ArrowElement;
    const x = Math.min(a.x, a.x2);
    const y = Math.min(a.y, a.y2);
    return { x, y, w: Math.abs(a.x2 - a.x) || 1, h: Math.abs(a.y2 - a.y) || 1 };
  }
  const s = el as { x: number; y: number; width: number; height: number };
  return { x: s.x, y: s.y, w: s.width, h: s.height };
}
