import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { v4 as uuidv4 } from 'uuid';
import type {
  WhiteboardElement,
  DrawingElement,
  StickyNoteElement,
  TextBoxElement,
  ShapeElement,
  ImageElement,
  Connection,
  PendingConnection,
  ToolType,
  ShapeType,
  FontFamily,
  StickyColor,
  HistorySnapshot
} from '../types';

const MAX_HISTORY = 60;
const CANVAS_WIDTH = 6000;
const CANVAS_HEIGHT = 4000;

interface WhiteboardState {
  // Canvas elements
  elements: WhiteboardElement[];
  connections: Connection[];

  // Selection
  selectedId: string | null;
  selectedIds: string[];

  // Active tool & options
  tool: ToolType;
  color: string;
  strokeWidth: number;
  font: FontFamily;
  fontSize: number;
  shapeType: ShapeType;
  stickyColor: StickyColor;
  roughness: number;
  opacity: number;

  // Viewport
  zoom: number;
  pan: { x: number; y: number };

  // Connection building
  pendingConnection: PendingConnection | null;

  // Undo/Redo stacks
  undoStack: HistorySnapshot[];
  redoStack: HistorySnapshot[];

  // Canvas dimensions (virtual)
  canvasWidth: number;
  canvasHeight: number;

  // Persisted file path
  currentFile: string | null;

  // Grid
  gridEnabled: boolean;
  gridSize: number;
}

interface WhiteboardActions {
  // Tool selection
  setTool: (tool: ToolType) => void;
  setColor: (color: string) => void;
  setStrokeWidth: (width: number) => void;
  setFont: (font: FontFamily) => void;
  setFontSize: (size: number) => void;
  setShapeType: (shape: ShapeType) => void;
  setStickyColor: (color: StickyColor) => void;
  setRoughness: (roughness: number) => void;
  setOpacity: (opacity: number) => void;

  // Element CRUD
  addElement: (element: Omit<WhiteboardElement, 'id' | 'zIndex'>) => string;
  updateElement: (id: string, updates: Partial<WhiteboardElement>) => void;
  removeElement: (id: string) => void;
  removeDrawingsAt: (x: number, y: number, radius: number) => void;
  bringToFront: (id: string) => void;
  sendToBack: (id: string) => void;

  // Connection CRUD
  addConnection: (sourceId: string, targetId: string, color?: string, label?: string) => void;
  removeConnection: (id: string) => void;
  removeConnectionsFor: (elementId: string) => void;

  // Selection
  setSelectedId: (id: string | null) => void;
  setSelectedIds: (ids: string[]) => void;

  // Connection building
  setPendingConnection: (pending: PendingConnection | null) => void;

  // Viewport
  setZoom: (zoom: number) => void;
  setPan: (pan: { x: number; y: number }) => void;
  resetView: () => void;

  // History
  undo: () => void;
  redo: () => void;
  snapshot: () => void;

  // Bulk
  clearAll: () => void;

  // File
  loadBoard: (elements: WhiteboardElement[], connections: Connection[], filePath: string | null) => void;
  setCurrentFile: (filePath: string | null) => void;

  // Grid
  setGridEnabled: (enabled: boolean) => void;
  setGridSize: (size: number) => void;
}

type WhiteboardStore = WhiteboardState & WhiteboardActions;

const getMaxZIndex = (elements: WhiteboardElement[]): number =>
  elements.reduce((max, el) => Math.max(max, el.zIndex), 0);

export const useWhiteboardStore = create<WhiteboardStore>()(
  immer((set, get) => ({
    // ── Initial State ──────────────────────────────────────────────────────
    elements: [],
    connections: [],
    selectedId: null,
    selectedIds: [],

    tool: 'select',
    color: '#1a1a1a',
    strokeWidth: 4,
    font: 'Caveat',
    fontSize: 20,
    shapeType: 'rectangle',
    stickyColor: '#fef08a',
    roughness: 1.5,
    opacity: 1,

    zoom: 1,
    pan: { x: 0, y: 0 },
    pendingConnection: null,

    undoStack: [],
    redoStack: [],
    canvasWidth: CANVAS_WIDTH,
    canvasHeight: CANVAS_HEIGHT,
    currentFile: null,
    gridEnabled: false,
    gridSize: 20,

    // ── Tool Actions ───────────────────────────────────────────────────────
    setTool: (tool) =>
      set((state) => {
        state.tool = tool;
        state.selectedId = null;
        state.selectedIds = [];
        state.pendingConnection = null;
      }),
    setColor: (color) => set((state) => { state.color = color; }),
    setStrokeWidth: (width) => set((state) => { state.strokeWidth = width; }),
    setFont: (font) => set((state) => { state.font = font; }),
    setFontSize: (size) => set((state) => { state.fontSize = size; }),
    setShapeType: (shape) => set((state) => { state.shapeType = shape; }),
    setStickyColor: (color) => set((state) => { state.stickyColor = color; }),
    setRoughness: (roughness) => set((state) => { state.roughness = roughness; }),
    setOpacity: (opacity) => set((state) => { state.opacity = opacity; }),

    // ── Element Actions ────────────────────────────────────────────────────
    addElement: (elementData) => {
      const id = uuidv4();
      set((state) => {
        const zIndex = getMaxZIndex(state.elements) + 1;
        state.elements.push({ ...elementData, id, zIndex } as WhiteboardElement);
      });
      return id;
    },

    updateElement: (id, updates) =>
      set((state) => {
        const idx = state.elements.findIndex((el) => el.id === id);
        if (idx !== -1) {
          Object.assign(state.elements[idx], updates);
        }
      }),

    removeElement: (id) =>
      set((state) => {
        state.elements = state.elements.filter((el) => el.id !== id);
        state.connections = state.connections.filter(
          (c) => c.sourceId !== id && c.targetId !== id
        );
        if (state.selectedId === id) state.selectedId = null;
        state.selectedIds = state.selectedIds.filter((sid) => sid !== id);
      }),

    removeDrawingsAt: (x, y, radius) =>
      set((state) => {
        state.elements = state.elements.filter((el) => {
          if (el.type !== 'drawing') return true;
          return !el.points.some(
            ([px, py]) => Math.hypot(px - x, py - y) < radius
          );
        });
      }),

    bringToFront: (id) =>
      set((state) => {
        const idx = state.elements.findIndex((el) => el.id === id);
        if (idx !== -1) {
          state.elements[idx].zIndex = getMaxZIndex(state.elements) + 1;
        }
      }),

    sendToBack: (id) =>
      set((state) => {
        const idx = state.elements.findIndex((el) => el.id === id);
        if (idx !== -1) {
          state.elements[idx].zIndex = 0;
        }
      }),

    // ── Connection Actions ─────────────────────────────────────────────────
    addConnection: (sourceId, targetId, color = '#b22222', label = '') =>
      set((state) => {
        // Prevent duplicate connections
        const exists = state.connections.some(
          (c) =>
            (c.sourceId === sourceId && c.targetId === targetId) ||
            (c.sourceId === targetId && c.targetId === sourceId)
        );
        if (!exists) {
          state.connections.push({ id: uuidv4(), sourceId, targetId, color, label });
        }
      }),

    removeConnection: (id) =>
      set((state) => {
        state.connections = state.connections.filter((c) => c.id !== id);
      }),

    removeConnectionsFor: (elementId) =>
      set((state) => {
        state.connections = state.connections.filter(
          (c) => c.sourceId !== elementId && c.targetId !== elementId
        );
      }),

    // ── Selection ─────────────────────────────────────────────────────────
    setSelectedId: (id) =>
      set((state) => {
        state.selectedId = id;
        state.selectedIds = [];
      }),

    setSelectedIds: (ids) =>
      set((state) => {
        state.selectedIds = ids;
        state.selectedId = null;
      }),

    // ── Connection Building ────────────────────────────────────────────────
    setPendingConnection: (pending) =>
      set((state) => {
        state.pendingConnection = pending;
      }),

    // ── Viewport ─────────────────────────────────────────────────────────
    setZoom: (zoom) =>
      set((state) => {
        state.zoom = Math.min(Math.max(zoom, 0.15), 4);
      }),
    setPan: (pan) => set((state) => { state.pan = pan; }),
    resetView: () =>
      set((state) => {
        state.zoom = 1;
        state.pan = { x: 0, y: 0 };
      }),

    // ── History ───────────────────────────────────────────────────────────
    snapshot: () =>
      set((state) => {
        const snap: HistorySnapshot = {
          elements: JSON.parse(JSON.stringify(state.elements)),
          connections: JSON.parse(JSON.stringify(state.connections))
        };
        state.undoStack.push(snap);
        if (state.undoStack.length > MAX_HISTORY) {
          state.undoStack.shift();
        }
        state.redoStack = [];
      }),

    undo: () =>
      set((state) => {
        if (state.undoStack.length === 0) return;
        const current: HistorySnapshot = {
          elements: JSON.parse(JSON.stringify(state.elements)),
          connections: JSON.parse(JSON.stringify(state.connections))
        };
        state.redoStack.push(current);
        if (state.redoStack.length > MAX_HISTORY) {
          state.redoStack.shift();
        }
        const prev = state.undoStack.pop()!;
        state.elements = prev.elements;
        state.connections = prev.connections;
        state.selectedId = null;
      }),

    redo: () =>
      set((state) => {
        if (state.redoStack.length === 0) return;
        const current: HistorySnapshot = {
          elements: JSON.parse(JSON.stringify(state.elements)),
          connections: JSON.parse(JSON.stringify(state.connections))
        };
        state.undoStack.push(current);
        const next = state.redoStack.pop()!;
        state.elements = next.elements;
        state.connections = next.connections;
        state.selectedId = null;
      }),

    clearAll: () =>
      set((state) => {
        get().snapshot();
        state.elements = [];
        state.connections = [];
        state.selectedId = null;
        state.selectedIds = [];
      }),

    loadBoard: (elements, connections, filePath) =>
      set((state) => {
        state.elements = elements;
        state.connections = connections;
        state.selectedId = null;
        state.selectedIds = [];
        state.undoStack = [];
        state.redoStack = [];
        state.currentFile = filePath;
        state.zoom = 1;
        state.pan = { x: 0, y: 0 };
      }),

    setCurrentFile: (filePath) =>
      set((state) => {
        state.currentFile = filePath;
      }),

    setGridEnabled: (enabled) => set((state) => { state.gridEnabled = enabled; }),
    setGridSize: (size) => set((state) => { state.gridSize = size; })
  }))
);

// ── Selector helpers ───────────────────────────────────────────────────────

export const selectSortedElements = (state: WhiteboardStore) =>
  [...state.elements].sort((a, b) => a.zIndex - b.zIndex);

export const selectElement = (id: string) => (state: WhiteboardStore) =>
  state.elements.find((el) => el.id === id);
