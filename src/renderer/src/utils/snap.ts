/** Snap a canvas coordinate to the nearest grid line. */
export const snapVal = (v: number, gridSize: number): number =>
  Math.round(v / gridSize) * gridSize;
