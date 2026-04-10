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
  HistorySnapshot,
  ElementGroup,
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
  selectedConnectionId: string | null;

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

  // Groups
  groups: ElementGroup[];
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
  updateConnection: (id: string, updates: Partial<{ color: string; label: string }>) => void;

  // Selection
  setSelectedId: (id: string | null) => void;
  setSelectedIds: (ids: string[]) => void;
  setSelectedConnectionId: (id: string | null) => void;

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
  loadBoard: (elements: WhiteboardElement[], connections: Connection[], filePath: string | null, groups?: ElementGroup[]) => void;
  setCurrentFile: (filePath: string | null) => void;

  // Grid
  setGridEnabled: (enabled: boolean) => void;
  setGridSize: (size: number) => void;

  // Alignment
  alignSelected: (op: 'left' | 'right' | 'center-h' | 'top' | 'bottom' | 'center-v') => void;
  distributeSelected: (axis: 'horizontal' | 'vertical') => void;

  // Grouping
  groupSelected: () => void;
  ungroupSelected: () => void;
}

type WhiteboardStore = WhiteboardState & WhiteboardActions;

/** Returns the axis-aligned bounding box for any element (matches Whiteboard.tsx getElementBounds) */
function elBounds(el: WhiteboardElement): { x: number; y: number; w: number; h: number } {
  if (el.type === 'arrow') {
    const x = Math.min(el.x, el.x2);
    const y = Math.min(el.y, el.y2);
    return { x, y, w: Math.abs(el.x2 - el.x) || 1, h: Math.abs(el.y2 - el.y) || 1 };
  }
  if (el.type === 'drawing') {
    if (el.points.length === 0) return { x: el.x, y: el.y, w: 1, h: 1 };
    const xs = el.points.map((p) => p[0]);
    const ys = el.points.map((p) => p[1]);
    const bx = Math.min(...xs), by = Math.min(...ys);
    return { x: bx, y: by, w: Math.max(...xs) - bx || 1, h: Math.max(...ys) - by || 1 };
  }
  const s = el as { x: number; y: number; width: number; height: number };
  return { x: s.x, y: s.y, w: s.width, h: s.height };
}

function groupBoundsFromIds(childIds: string[], elements: WhiteboardElement[]): { x: number; y: number; w: number; h: number } {
  const children = elements.filter((el) => childIds.includes(el.id));
  if (children.length === 0) return { x: 0, y: 0, w: 1, h: 1 };
  const boxes = children.map(elBounds);
  const minX = Math.min(...boxes.map((b) => b.x));
  const minY = Math.min(...boxes.map((b) => b.y));
  const maxX = Math.max(...boxes.map((b) => b.x + b.w));
  const maxY = Math.max(...boxes.map((b) => b.y + b.h));
  return { x: minX, y: minY, w: maxX - minX || 1, h: maxY - minY || 1 };
}

const getMaxZIndex = (elements: WhiteboardElement[]): number =>
  elements.reduce((max, el) => Math.max(max, el.zIndex), 0);

export const useWhiteboardStore = create<WhiteboardStore>()(
  immer((set, get) => ({
    // ── Initial State ──────────────────────────────────────────────────────
    elements: [],
    connections: [],
    groups: [],
    selectedId: null,
    selectedIds: [],
    selectedConnectionId: null,

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
        state.selectedConnectionId = null;
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
        // Remove from any group; disband groups that have fewer than 2 members left
        state.groups = state.groups
          .map((g) => ({ ...g, childIds: g.childIds.filter((cid) => cid !== id) }))
          .filter((g) => g.childIds.length >= 2);
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

    updateConnection: (id, updates) =>
      set((state) => {
        const idx = state.connections.findIndex((c) => c.id === id);
        if (idx !== -1) Object.assign(state.connections[idx], updates);
      }),

    // ── Selection ─────────────────────────────────────────────────────────
    setSelectedId: (id) =>
      set((state) => {
        state.selectedId = id;
        state.selectedIds = [];
        state.selectedConnectionId = null;
      }),

    setSelectedIds: (ids) =>
      set((state) => {
        state.selectedIds = ids;
        state.selectedId = null;
        state.selectedConnectionId = null;
      }),

    setSelectedConnectionId: (id) =>
      set((state) => {
        state.selectedConnectionId = id;
        state.selectedId = null;
        state.selectedIds = [];
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
          connections: JSON.parse(JSON.stringify(state.connections)),
          groups: JSON.parse(JSON.stringify(state.groups)),
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
          connections: JSON.parse(JSON.stringify(state.connections)),
          groups: JSON.parse(JSON.stringify(state.groups)),
        };
        state.redoStack.push(current);
        if (state.redoStack.length > MAX_HISTORY) {
          state.redoStack.shift();
        }
        const prev = state.undoStack.pop()!;
        state.elements = prev.elements;
        state.connections = prev.connections;
        state.groups = prev.groups ?? [];
        state.selectedId = null;
        state.selectedConnectionId = null;
      }),

    redo: () =>
      set((state) => {
        if (state.redoStack.length === 0) return;
        const current: HistorySnapshot = {
          elements: JSON.parse(JSON.stringify(state.elements)),
          connections: JSON.parse(JSON.stringify(state.connections)),
          groups: JSON.parse(JSON.stringify(state.groups)),
        };
        state.undoStack.push(current);
        const next = state.redoStack.pop()!;
        state.elements = next.elements;
        state.connections = next.connections;
        state.groups = next.groups ?? [];
        state.selectedId = null;
        state.selectedConnectionId = null;
      }),

    clearAll: () =>
      set((state) => {
        get().snapshot();
        state.elements = [];
        state.connections = [];
        state.groups = [];
        state.selectedId = null;
        state.selectedIds = [];
      }),

    loadBoard: (elements, connections, filePath, groups) =>
      set((state) => {
        state.elements = elements;
        state.connections = connections;
        state.groups = groups ?? [];
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
    setGridSize: (size) => set((state) => { state.gridSize = size; }),

    // ── Alignment ─────────────────────────────────────────────────────────────
    alignSelected: (op) => {
      const { elements, groups, selectedIds, selectedId } = get();
      const ids = selectedIds.length >= 2 ? selectedIds : selectedId ? [selectedId] : [];
      if (ids.length < 2) return;

      get().snapshot();

      // Effective bounding box for a top-level ID (group or element)
      const getEffBounds = (id: string) => {
        const grp = groups.find((g) => g.id === id);
        if (grp) return groupBoundsFromIds(grp.childIds, elements);
        const el = elements.find((e) => e.id === id);
        if (el) return elBounds(el);
        return { x: 0, y: 0, w: 1, h: 1 };
      };

      const entries = ids.map((id) => ({ id, b: getEffBounds(id) }));

      const minLeft   = Math.min(...entries.map(({ b }) => b.x));
      const maxRight  = Math.max(...entries.map(({ b }) => b.x + b.w));
      const minTop    = Math.min(...entries.map(({ b }) => b.y));
      const maxBottom = Math.max(...entries.map(({ b }) => b.y + b.h));
      const midX      = (minLeft + maxRight) / 2;
      const midY      = (minTop + maxBottom) / 2;

      const { updateElement } = get();

      const moveElement = (el: WhiteboardElement, dx: number, dy: number) => {
        if (el.type === 'drawing') {
          const newPts = el.points.map(([px, py, pr]) => [px + dx, py + dy, pr] as [number, number, number]);
          updateElement(el.id, { x: el.x + dx, y: el.y + dy, points: newPts } as unknown as Partial<WhiteboardElement>);
        } else if (el.type === 'arrow') {
          updateElement(el.id, { x: el.x + dx, y: el.y + dy, x2: el.x2 + dx, y2: el.y2 + dy } as unknown as Partial<WhiteboardElement>);
        } else {
          updateElement(el.id, { x: el.x + dx, y: el.y + dy });
        }
      };

      for (const { id, b } of entries) {
        let dx = 0, dy = 0;
        if (op === 'left')     dx = minLeft - b.x;
        if (op === 'right')    dx = maxRight - (b.x + b.w);
        if (op === 'center-h') dx = midX - (b.x + b.w / 2);
        if (op === 'top')      dy = minTop - b.y;
        if (op === 'bottom')   dy = maxBottom - (b.y + b.h);
        if (op === 'center-v') dy = midY - (b.y + b.h / 2);
        if (dx === 0 && dy === 0) continue;

        const grp = groups.find((g) => g.id === id);
        if (grp) {
          grp.childIds.forEach((cid) => {
            const el = elements.find((e) => e.id === cid);
            if (el) moveElement(el, dx, dy);
          });
        } else {
          const el = elements.find((e) => e.id === id);
          if (el) moveElement(el, dx, dy);
        }
      }
    },

    distributeSelected: (axis) => {
      const { elements, groups, selectedIds, selectedId } = get();
      const ids = selectedIds.length >= 2 ? selectedIds : selectedId ? [selectedId] : [];
      if (ids.length < 3) return;

      get().snapshot();

      const getEffBounds = (id: string) => {
        const grp = groups.find((g) => g.id === id);
        if (grp) return groupBoundsFromIds(grp.childIds, elements);
        const el = elements.find((e) => e.id === id);
        if (el) return elBounds(el);
        return { x: 0, y: 0, w: 1, h: 1 };
      };

      const entries = ids.map((id) => {
        const b = getEffBounds(id);
        const center = axis === 'horizontal' ? b.x + b.w / 2 : b.y + b.h / 2;
        return { id, b, center };
      });

      entries.sort((a, b) => a.center - b.center);

      const first = entries[0].center;
      const last  = entries[entries.length - 1].center;
      const gap   = (last - first) / (entries.length - 1);

      const { updateElement } = get();

      const moveElement = (el: WhiteboardElement, dx: number, dy: number) => {
        if (el.type === 'drawing') {
          const newPts = el.points.map(([px, py, pr]) => [px + dx, py + dy, pr] as [number, number, number]);
          updateElement(el.id, { x: el.x + dx, y: el.y + dy, points: newPts } as unknown as Partial<WhiteboardElement>);
        } else if (el.type === 'arrow') {
          updateElement(el.id, { x: el.x + dx, y: el.y + dy, x2: el.x2 + dx, y2: el.y2 + dy } as unknown as Partial<WhiteboardElement>);
        } else {
          updateElement(el.id, { x: el.x + dx, y: el.y + dy });
        }
      };

      entries.forEach(({ id, center }, i) => {
        const targetCenter = first + i * gap;
        const delta = targetCenter - center;
        if (Math.abs(delta) < 0.5) return;

        const dx = axis === 'horizontal' ? delta : 0;
        const dy = axis === 'vertical'   ? delta : 0;

        const grp = groups.find((g) => g.id === id);
        if (grp) {
          grp.childIds.forEach((cid) => {
            const el = elements.find((e) => e.id === cid);
            if (el) moveElement(el, dx, dy);
          });
        } else {
          const el = elements.find((e) => e.id === id);
          if (el) moveElement(el, dx, dy);
        }
      });
    },

    // ── Grouping ───────────────────────────────────────────────────────────
    groupSelected: () => {
      const { selectedIds, elements } = get();
      // Only group actual element IDs (not other groups — no nesting)
      const elementIds = selectedIds.filter((id) => elements.some((el) => el.id === id));
      if (elementIds.length < 2) return;
      get().snapshot();
      const groupId = uuidv4();
      set((state) => {
        state.groups.push({ id: groupId, childIds: [...elementIds] });
        state.selectedIds = [groupId];
        state.selectedId = null;
      });
    },

    ungroupSelected: () => {
      const { selectedIds, groups } = get();
      const toDissolve = groups.filter((g) => selectedIds.includes(g.id));
      if (toDissolve.length === 0) return;
      get().snapshot();
      const allChildIds: string[] = [];
      set((state) => {
        for (const g of toDissolve) {
          state.groups = state.groups.filter((gr) => gr.id !== g.id);
          allChildIds.push(...g.childIds);
        }
        const nonGroupIds = selectedIds.filter((id) => !toDissolve.some((g) => g.id === id));
        state.selectedIds = [...allChildIds, ...nonGroupIds];
        state.selectedId = null;
      });
    },
  }))
);

// ── Selector helpers ───────────────────────────────────────────────────────

export const selectSortedElements = (state: WhiteboardStore) =>
  [...state.elements].sort((a, b) => a.zIndex - b.zIndex);

export const selectElement = (id: string) => (state: WhiteboardStore) =>
  state.elements.find((el) => el.id === id);
