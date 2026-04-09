// ─── Tool Types ───────────────────────────────────────────────────────────────

export type ToolType =
  | 'select'
  | 'sharpie'
  | 'eraser'
  | 'sticky-note'
  | 'text-box'
  | 'shape'
  | 'connection'
  | 'image'
  | 'arrow';

export type ShapeType =
  | 'rectangle'
  | 'square'
  | 'circle'
  | 'ellipse'
  | 'triangle'
  | 'diamond'
  | 'star'
  | 'arrow';

export type FontFamily =
  | 'Caveat'
  | 'Indie Flower'
  | 'Kalam'
  | 'Patrick Hand'
  | 'Permanent Marker';

export type StickyColor =
  | '#fef08a'
  | '#f9a8d4'
  | '#93c5fd'
  | '#86efac'
  | '#fcd34d'
  | '#c4b5fd'
  | '#ffffff';

// ─── Element Types ────────────────────────────────────────────────────────────

export interface BaseElement {
  id: string;
  x: number;
  y: number;
  rotation: number;
  zIndex: number;
}

export interface SizedElement extends BaseElement {
  width: number;
  height: number;
}

/** Freehand drawing stroke */
export interface DrawingElement extends BaseElement {
  type: 'drawing';
  /** Array of [x, y, pressure] points */
  points: [number, number, number][];
  color: string;
  size: number;
  opacity: number;
}

/** Post-it sticky note */
export interface StickyNoteElement extends SizedElement {
  type: 'sticky-note';
  text: string;
  backgroundColor: StickyColor;
  font: FontFamily;
  fontSize: number;
}

/** Editable free text box */
export interface TextBoxElement extends SizedElement {
  type: 'text-box';
  text: string;
  font: FontFamily;
  fontSize: number;
  color: string;
  bold: boolean;
  italic: boolean;
}

/** Hand-drawn shape (rendered with rough.js) */
export interface ShapeElement extends SizedElement {
  type: 'shape';
  shapeType: ShapeType;
  fillColor: string;
  strokeColor: string;
  roughness: number;
  seed: number;
}

/** Polaroid-style image */
export interface ImageElement extends SizedElement {
  type: 'image';
  dataUrl: string;
  caption: string;
}

/** Two-point arrow */
export interface ArrowElement extends BaseElement {
  type: 'arrow';
  x2: number;
  y2: number;
  color: string;
  strokeWidth: number;
}

export type WhiteboardElement =
  | DrawingElement
  | StickyNoteElement
  | TextBoxElement
  | ShapeElement
  | ImageElement
  | ArrowElement;

// ─── Connection Types ─────────────────────────────────────────────────────────

export interface Connection {
  id: string;
  sourceId: string;
  targetId: string;
  color: string;
  label: string;
}

export interface PendingConnection {
  sourceId: string;
  sourceX: number;
  sourceY: number;
  currentX: number;
  currentY: number;
}

// ─── Interaction State ────────────────────────────────────────────────────────

export interface ActiveDrawing {
  points: [number, number, number][];
  color: string;
  size: number;
  opacity: number;
}

export interface ShapePreview {
  shapeType: ShapeType;
  x: number;
  y: number;
  width: number;
  height: number;
  fillColor: string;
  strokeColor: string;
  roughness: number;
  seed: number;
}

export interface Point {
  x: number;
  y: number;
}

// ─── History Snapshot ────────────────────────────────────────────────────────

export interface HistorySnapshot {
  elements: WhiteboardElement[];
  connections: Connection[];
}

// ─── Font Definitions ─────────────────────────────────────────────────────────

export const FONT_OPTIONS: { value: FontFamily; label: string }[] = [
  { value: 'Caveat', label: 'Caveat' },
  { value: 'Indie Flower', label: 'Indie Flower' },
  { value: 'Kalam', label: 'Kalam' },
  { value: 'Patrick Hand', label: 'Patrick Hand' },
  { value: 'Permanent Marker', label: 'Permanent Marker' }
];

export const STICKY_COLORS: StickyColor[] = [
  '#fef08a',
  '#f9a8d4',
  '#93c5fd',
  '#86efac',
  '#fcd34d',
  '#c4b5fd',
  '#ffffff'
];

export const BRUSH_COLORS = [
  '#1a1a1a',
  '#c0392b',
  '#2980b9',
  '#27ae60',
  '#f39c12',
  '#8e44ad',
  '#e67e22',
  '#16a085',
  '#ffffff'
];
