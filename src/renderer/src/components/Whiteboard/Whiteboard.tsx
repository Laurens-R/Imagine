import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useWhiteboardStore, selectSortedElements } from '../../store/whiteboardStore';
import { generateDrawingPath, generateDotPath } from '../../utils/drawing';
import { generatePreviewRoughPaths, idToSeed } from '../../utils/roughShapes';
import { screenToCanvas, naturalRotation, polaroidRotation } from '../../utils/helpers';
import { getElementCenter, getStringPath } from '../../utils/helpers';
import { snapVal } from '../../utils/snap';
import { renderToCanvas, computeContentBounds } from '../../utils/export';
import type { ExportFormat } from '../../utils/export';
import { Toolbar } from '../Toolbar/Toolbar';
import { ExportDialog } from '../ExportDialog/ExportDialog';
import { PropertiesPanel } from '../PropertiesPanel/PropertiesPanel';
import { ContextMenu } from '../ContextMenu/ContextMenu';
import type { ContextMenuEntry } from '../ContextMenu/ContextMenu';
import { StickyNote } from '../elements/StickyNote/StickyNote';
import { TextBox } from '../elements/TextBox/TextBox';
import { ImageEl } from '../elements/ImageElement/ImageElement';
import { ShapeEl } from '../elements/ShapeElement/ShapeElement';
import { Connection } from '../elements/Connection/Connection';
import { ArrowEl } from '../elements/ArrowElement/ArrowElement';
import type {
  ActiveDrawing,
  ShapePreview,
  WhiteboardElement,
  DrawingElement,
  StickyNoteElement,
  TextBoxElement,
  ShapeElement,
  ImageElement,
  ArrowElement,
  ElementGroup,
} from '../../types';
import styles from './Whiteboard.module.scss';

const ERASE_RADIUS = 20;

/** Module-level clipboard for cut/copy/paste (survives re-renders) */
let _clipboard: WhiteboardElement[] = [];

/** Promote element IDs to their parent group ID where applicable */
function promoteToTopLevel(ids: string[], groups: ElementGroup[]): string[] {
  const result = new Set<string>();
  for (const id of ids) {
    const grp = groups.find((g) => g.childIds.includes(id));
    result.add(grp ? grp.id : id);
  }
  return [...result];
}

/** Returns axis-aligned bounding box for any element (ignores rotation for simplicity) */
function getElementBounds(el: WhiteboardElement): { x: number; y: number; w: number; h: number } {
  if (el.type === 'drawing') {
    if (el.points.length === 0) return { x: el.x, y: el.y, w: 1, h: 1 };
    const xs = el.points.map((p) => p[0]);
    const ys = el.points.map((p) => p[1]);
    const x = Math.min(...xs);
    const y = Math.min(...ys);
    return { x, y, w: Math.max(...xs) - x || 1, h: Math.max(...ys) - y || 1 };
  }
  if (el.type === 'arrow') {
    const x = Math.min(el.x, el.x2);
    const y = Math.min(el.y, el.y2);
    return { x, y, w: Math.abs(el.x2 - el.x) || 1, h: Math.abs(el.y2 - el.y) || 1 };
  }
  const s = el as { x: number; y: number; width: number; height: number };
  return { x: s.x, y: s.y, w: s.width, h: s.height };
}

export const Whiteboard: React.FC<{
  showExportDialog?: boolean;
  onCloseExportDialog?: () => void;
}> = ({ showExportDialog = false, onCloseExportDialog }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  // ── Store state ────────────────────────────────────────────────────────────
  const elements = useWhiteboardStore(selectSortedElements);
  const connections = useWhiteboardStore((s) => s.connections);
  const selectedId = useWhiteboardStore((s) => s.selectedId);
  const selectedIds = useWhiteboardStore((s) => s.selectedIds);
  const selectedConnectionId = useWhiteboardStore((s) => s.selectedConnectionId);
  const tool = useWhiteboardStore((s) => s.tool);
  const color = useWhiteboardStore((s) => s.color);
  const strokeWidth = useWhiteboardStore((s) => s.strokeWidth);
  const font = useWhiteboardStore((s) => s.font);
  const fontSize = useWhiteboardStore((s) => s.fontSize);
  const shapeType = useWhiteboardStore((s) => s.shapeType);
  const stickyColor = useWhiteboardStore((s) => s.stickyColor);
  const roughness = useWhiteboardStore((s) => s.roughness);
  const opacity = useWhiteboardStore((s) => s.opacity);
  const zoom = useWhiteboardStore((s) => s.zoom);
  const pan = useWhiteboardStore((s) => s.pan);
  const pendingConnection = useWhiteboardStore((s) => s.pendingConnection);
  const canvasWidth = useWhiteboardStore((s) => s.canvasWidth);
  const canvasHeight = useWhiteboardStore((s) => s.canvasHeight);
  const gridEnabled = useWhiteboardStore((s) => s.gridEnabled);
  const gridSize = useWhiteboardStore((s) => s.gridSize);
  const groups = useWhiteboardStore((s) => s.groups);

  const {
    addElement,
    removeElement,
    removeDrawingsAt,
    updateElement,
    setSelectedId,
    setSelectedIds,
    setSelectedConnectionId,
    setTool,
    setZoom,
    setPan,
    setPendingConnection,
    addConnection,
    removeConnection,
    undo,
    redo,
    snapshot,
    loadBoard,
    setCurrentFile,
    clearAll,
    groupSelected,
    ungroupSelected,
  } = useWhiteboardStore();

  const currentFile = useWhiteboardStore((s) => s.currentFile);

  // ── Local interaction state ────────────────────────────────────────────────
  const [activeDrawing, setActiveDrawing] = useState<ActiveDrawing | null>(null);
  const [shapePreview, setShapePreview] = useState<ShapePreview | null>(null);
  const [shapeStart, setShapeStart] = useState<{ x: number; y: number } | null>(null);
  const [isSpaceDown, setIsSpaceDown] = useState(false);
  const [isPanning, setIsPanning] = useState(false);
  const panStartRef = useRef<{ mx: number; my: number; px: number; py: number } | null>(null);
  const isDrawingRef = useRef(false);
  const dragOverRef = useRef(false);

  // Lasso selection
  const lassoStartRef = useRef<{ x: number; y: number } | null>(null);
  const lassoRef = useRef<{ startX: number; startY: number; currentX: number; currentY: number } | null>(null);
  const [lasso, setLasso] = useState<{ startX: number; startY: number; currentX: number; currentY: number } | null>(null);

  // Multi-selection group drag
  const multiDragRef = useRef<{
    mx: number; my: number;
    origins: { id: string; x: number; y: number; x2?: number; y2?: number }[];
  } | null>(null);

  // Image file input
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pendingImagePos = useRef<{ x: number; y: number } | null>(null);

  // Arrow tool – first click sets start, second click commits
  const [arrowStart, setArrowStart] = useState<{ x: number; y: number } | null>(null);
  const [arrowPreview, setArrowPreview] = useState<{ x: number; y: number } | null>(null);

  // ── Context menu ───────────────────────────────────────────────────────────
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; canvasX: number; canvasY: number } | null>(null);

  // ── Export state ───────────────────────────────────────────────────────────
  const [isExporting, setIsExporting] = useState(false);

  // ── Coordinate helpers ─────────────────────────────────────────────────────
  const toCanvas = useCallback(
    (clientX: number, clientY: number) => {
      if (!containerRef.current) return { x: 0, y: 0 };
      return screenToCanvas(clientX, clientY, containerRef.current.getBoundingClientRect(), pan, zoom);
    },
    [pan, zoom]
  );

  /** Snap canvas coordinates to grid when grid is enabled. */
  const snap = useCallback(
    (x: number, y: number) => ({
      x: gridEnabled ? snapVal(x, gridSize) : x,
      y: gridEnabled ? snapVal(y, gridSize) : y
    }),
    [gridEnabled, gridSize]
  );

  // ── Export handler ─────────────────────────────────────────────────────────
  const handleExport = useCallback(
    async (format: ExportFormat, scale: number) => {
      if (!svgRef.current) return;
      setIsExporting(true);
      try {
        const canvas = await renderToCanvas(elements, svgRef.current, gridEnabled, gridSize, scale);
        const quality = format === 'jpeg' ? 0.92 : undefined;
        const dataUrl = canvas.toDataURL(`image/${format}`, quality);
        await window.whiteboardApi.exportImage(dataUrl, format);
      } catch (err) {
        console.error('Export failed:', err);
      } finally {
        setIsExporting(false);
        onCloseExportDialog?.();
      }
    },
    [elements, gridEnabled, gridSize]
  );

  // ── Cut / Copy / Paste helpers ─────────────────────────────────────────────
  const getSelectedElements = useCallback((): WhiteboardElement[] => {
    const { selectedId: sid, selectedIds: sids, groups: grps } = useWhiteboardStore.getState();
    const ids = sids.length > 0 ? sids : sid ? [sid] : [];
    const physicalIds = new Set<string>();
    for (const id of ids) {
      const grp = grps.find((g) => g.id === id);
      if (grp) grp.childIds.forEach((cid) => physicalIds.add(cid));
      else physicalIds.add(id);
    }
    return elements.filter((el) => physicalIds.has(el.id));
  }, [elements]);

  // Selects an element or its parent group if grouped
  const handleElementClick = useCallback(
    (elementId: string) => {
      if (tool !== 'select') return;
      const grp = groups.find((g) => g.childIds.includes(elementId));
      if (grp) {
        setSelectedIds([grp.id]);
      } else {
        setSelectedId(elementId);
      }
    },
    [tool, groups, setSelectedId, setSelectedIds]
  );

  const handleCopy = useCallback((cut = false) => {
    const sel = getSelectedElements();
    if (sel.length === 0) return;
    _clipboard = sel.map((el) => ({ ...el }));
    if (cut) {
      snapshot();
      sel.forEach((el) => removeElement(el.id));
    }
  }, [getSelectedElements, snapshot, removeElement]);

  const handlePaste = useCallback((atCanvasX?: number, atCanvasY?: number) => {
    if (_clipboard.length === 0) return;
    snapshot();
    // Compute bounding box of clipboard items to center paste at cursor (or offset)
    const xs = _clipboard.map((el) => el.x);
    const ys = _clipboard.map((el) => el.y);
    const minX = Math.min(...xs);
    const minY = Math.min(...ys);
    const OFFSET = 20;
    const newIds: string[] = [];
    _clipboard.forEach((el) => {
      const dx = atCanvasX != null ? (atCanvasX - minX) : OFFSET;
      const dy = atCanvasY != null ? (atCanvasY - minY) : OFFSET;
      const pasted = { ...el, x: el.x + dx, y: el.y + dy };
      const id = addElement(pasted as Omit<WhiteboardElement, 'id' | 'zIndex'>);
      newIds.push(id);
    });
    if (newIds.length === 1) setSelectedId(newIds[0]);
    else setSelectedIds(newIds);
    // Shift clipboard so repeated pastes stack visually
    if (atCanvasX == null) {
      _clipboard = _clipboard.map((el) => ({ ...el, x: el.x + OFFSET, y: el.y + OFFSET }));
    }
  }, [snapshot, addElement, setSelectedId, setSelectedIds]);

  // ── Right-click context menu ───────────────────────────────────────────────
  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const { x: cx, y: cy } = toCanvas(e.clientX, e.clientY);
    setContextMenu({ x: e.clientX, y: e.clientY, canvasX: cx, canvasY: cy });
  }, [toCanvas]);

  // ── Keyboard shortcuts ─────────────────────────────────────────────────────
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !e.repeat) {
        const active = document.activeElement;
        if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA')) return;
        e.preventDefault();
        setIsSpaceDown(true);
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
        e.preventDefault();
        redo();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'c' && !e.shiftKey) {
        const active = document.activeElement;
        if (!active || (active.tagName !== 'INPUT' && active.tagName !== 'TEXTAREA')) {
          e.preventDefault();
          handleCopy(false);
        }
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'x') {
        const active = document.activeElement;
        if (!active || (active.tagName !== 'INPUT' && active.tagName !== 'TEXTAREA')) {
          e.preventDefault();
          handleCopy(true);
        }
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'v') {
        const active = document.activeElement;
        if (!active || (active.tagName !== 'INPUT' && active.tagName !== 'TEXTAREA')) {
          e.preventDefault();
          handlePaste();
        }
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 's' && !e.shiftKey) {
        e.preventDefault();
        const { elements: els, connections: conns, groups: grps, currentFile: cf } = useWhiteboardStore.getState();
        const data = JSON.stringify({ elements: els, connections: conns, groups: grps }, null, 2);
        window.whiteboardApi.saveBoard(data, cf ?? undefined).then((r) => {
          if (!r.canceled && r.filePath) setCurrentFile(r.filePath);
        });
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'o') {
        e.preventDefault();
        window.whiteboardApi.openBoard().then((r) => {
          if (!r.canceled && r.data && r.filePath) {
            try {
              const parsed = JSON.parse(r.data);
              loadBoard(parsed.elements ?? [], parsed.connections ?? [], r.filePath, parsed.groups ?? []);
            } catch { /* ignore */ }
          }
        });
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        e.preventDefault();
        const { elements: els, connections: conns } = useWhiteboardStore.getState();
        if (els.length > 0 || conns.length > 0) {
          if (!window.confirm('Discard current whiteboard and start a new one?')) return;
        }
        snapshot();
        clearAll();
        setCurrentFile(null);
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'g') {
        e.preventDefault();
        const state = useWhiteboardStore.getState();
        const sids = state.selectedIds;
        const hasGroup = sids.some((id) => state.groups.some((g) => g.id === id));
        if (hasGroup) ungroupSelected();
        else groupSelected();
      }
      if ((e.key === 'a' || e.key === 'A') && !e.ctrlKey && !e.metaKey) {
        const active = document.activeElement;
        if (!active || (active.tagName !== 'INPUT' && active.tagName !== 'TEXTAREA')) {
          setTool('arrow');
        }
      }
      if ((e.key === 'l' || e.key === 'L') && !e.ctrlKey && !e.metaKey) {
        const active = document.activeElement;
        if (!active || (active.tagName !== 'INPUT' && active.tagName !== 'TEXTAREA')) {
          setTool('line');
        }
      }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        const active = document.activeElement;
        if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA')) return;
        const { selectedConnectionId: connId } = useWhiteboardStore.getState();
        if (connId) {
          snapshot();
          removeConnection(connId);
          setSelectedConnectionId(null);
          return;
        }
        const toDelete = selectedIds.length > 0 ? selectedIds : selectedId ? [selectedId] : [];
        if (toDelete.length > 0) {
          snapshot();
          const { groups: currentGroups } = useWhiteboardStore.getState();
          const physicalIds = new Set<string>();
          for (const id of toDelete) {
            const grp = currentGroups.find((g) => g.id === id);
            if (grp) grp.childIds.forEach((cid) => physicalIds.add(cid));
            else physicalIds.add(id);
          }
          physicalIds.forEach((id) => removeElement(id));
        }
      }
      if (e.key === 'Escape') {
        setSelectedId(null);
        setSelectedIds([]);
        setSelectedConnectionId(null);
        setPendingConnection(null);
        setShapePreview(null);
        setShapeStart(null);
        setArrowStart(null);
        setArrowPreview(null);
        isDrawingRef.current = false;
        setActiveDrawing(null);
        lassoStartRef.current = null;
        lassoRef.current = null;
        setLasso(null);
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') setIsSpaceDown(false);
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [selectedId, selectedIds, removeElement, removeConnection, setSelectedId, setSelectedIds, setSelectedConnectionId, setPendingConnection, undo, redo, snapshot, loadBoard, setCurrentFile, clearAll, handleCopy, handlePaste, groupSelected, ungroupSelected]);

  // ── Prevent Electron from navigating on file drag-drop ────────────────────
  useEffect(() => {
    const prevent = (e: DragEvent) => e.preventDefault();
    window.addEventListener('dragover', prevent);
    window.addEventListener('drop', prevent);
    return () => {
      window.removeEventListener('dragover', prevent);
      window.removeEventListener('drop', prevent);
    };
  }, []);

  // ── Wheel zoom ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      const factor = e.deltaY < 0 ? 1.08 : 0.93;
      const newZoom = Math.min(Math.max(zoom * factor, 0.15), 4);
      const rect = el.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const newPanX = mx - (mx - pan.x) * (newZoom / zoom);
      const newPanY = my - (my - pan.y) * (newZoom / zoom);
      setZoom(newZoom);
      setPan({ x: newPanX, y: newPanY });
    };

    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [zoom, pan, setZoom, setPan]);

  // ── Mouse handlers ─────────────────────────────────────────────────────────
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (e.button !== 0 && e.button !== 1) return;

      const isMidBtn = e.button === 1;

      // Pan: space + left OR middle button
      if (isSpaceDown || isMidBtn) {
        e.preventDefault();
        setIsPanning(true);
        panStartRef.current = { mx: e.clientX, my: e.clientY, px: pan.x, py: pan.y };
        return;
      }

      const { x: rawX, y: rawY } = toCanvas(e.clientX, e.clientY);
      const { x, y } = snap(rawX, rawY);

      switch (tool) {
        case 'sharpie': {
          snapshot();
          isDrawingRef.current = true;
          setActiveDrawing({
            points: [[x, y, 0.5]],
            color,
            size: strokeWidth,
            opacity
          });
          break;
        }

        case 'eraser': {
          snapshot();
          removeDrawingsAt(x, y, ERASE_RADIUS);
          isDrawingRef.current = true;
          break;
        }

        case 'shape': {
          snapshot();
          setShapeStart({ x, y });
          setShapePreview({
            shapeType,
            x,
            y,
            width: 1,
            height: 1,
            fillColor: 'transparent',
            strokeColor: color,
            roughness,
            seed: Math.floor(Math.random() * 999999)
          });
          break;
        }

        case 'sticky-note': {
          snapshot();
          const { x: sx, y: sy } = snap(x - 100, y - 60);
          const stickyEl: Omit<StickyNoteElement, 'id' | 'zIndex'> = {
            type: 'sticky-note',
            x: sx,
            y: sy,
            width: 200,
            height: 180,
            rotation: naturalRotation(2),
            text: 'Double-click to edit',
            backgroundColor: stickyColor,
            font,
            fontSize
          };
          addElement(stickyEl);
          break;
        }

        case 'text-box': {
          // preventDefault stops Chromium from moving focus to document.body on mouseup,
          // which would blur the textarea that autoFocus gives focus to during this handler.
          e.preventDefault();
          snapshot();
          const { x: tx, y: ty } = snap(x - 120, y - 30);
          const tbEl: Omit<TextBoxElement, 'id' | 'zIndex'> = {
            type: 'text-box',
            x: tx,
            y: ty,
            width: 240,
            height: 60,
            rotation: 0,
            text: '',
            font,
            fontSize,
            color,
            bold: false,
            italic: false
          };
          const newId = addElement(tbEl);
          setSelectedId(newId);
          break;
        }

        case 'image': {
          // Store where the user clicked and open a file picker
          pendingImagePos.current = { x, y };
          fileInputRef.current?.click();
          break;
        }

        case 'arrow':
        case 'line': {
          if (!arrowStart) {
            // First click – set start point
            setArrowStart({ x, y });
            setArrowPreview({ x, y });
          } else {
            // Second click – commit
            snapshot();
            const arrowEl: Omit<ArrowElement, 'id' | 'zIndex'> = {
              type: 'arrow',
              x: arrowStart.x,
              y: arrowStart.y,
              x2: x,
              y2: y,
              rotation: 0,
              color,
              strokeWidth,
              showArrowhead: tool === 'arrow',
            };
            addElement(arrowEl);
            setArrowStart(null);
            setArrowPreview(null);
            setTool('select');
          }
          break;
        }

        case 'select': {
          // If a connection is pending, cancel it; otherwise start lasso tracking
          if (pendingConnection) {
            setPendingConnection(null);
          } else if (
            e.target === containerRef.current ||
            (e.target as Element).classList.contains(styles.viewport) ||
            e.target === svgRef.current
          ) {
            // Start lasso — don't deselect immediately; commit on mouseup
            lassoStartRef.current = { x, y };
          }
          break;
        }

        case 'connection': {
          // Clicking empty canvas cancels pending connection
          if (pendingConnection) {
            setPendingConnection(null);
          }
          break;
        }

        default:
          break;
      }
    },
    [
      isSpaceDown, pan, toCanvas, snap, tool, color, strokeWidth, font, fontSize,
      shapeType, stickyColor, roughness, opacity, snapshot, removeDrawingsAt,
      addElement, setSelectedId, setPendingConnection, pendingConnection,
      arrowStart, setArrowStart, setArrowPreview
    ]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      // Panning
      if (isPanning && panStartRef.current) {
        const { mx, my, px, py } = panStartRef.current;
        setPan({ x: px + (e.clientX - mx), y: py + (e.clientY - my) });
        return;
      }

      const { x: rawMx, y: rawMy } = toCanvas(e.clientX, e.clientY);
      const { x, y } = snap(rawMx, rawMy);

      // Lasso selection tracking
      if (tool === 'select' && lassoStartRef.current) {
        const r = { startX: lassoStartRef.current.x, startY: lassoStartRef.current.y, currentX: x, currentY: y };
        lassoRef.current = r;
        setLasso(r);
        return;
      }

      if (tool === 'sharpie' && isDrawingRef.current && activeDrawing) {
        setActiveDrawing((prev) =>
          prev
            ? { ...prev, points: [...prev.points, [x, y, 0.5]] }
            : null
        );
        return;
      }

      if (tool === 'eraser' && isDrawingRef.current) {
        removeDrawingsAt(x, y, ERASE_RADIUS);
        return;
      }

      if (tool === 'shape' && shapeStart && shapePreview) {
        const snappedEnd = snap(rawMx, rawMy);
        const w = snappedEnd.x - shapeStart.x;
        const h = snappedEnd.y - shapeStart.y;
        setShapePreview((prev) =>
          prev
            ? {
                ...prev,
                x: w < 0 ? snappedEnd.x : shapeStart.x,
                y: h < 0 ? snappedEnd.y : shapeStart.y,
                width: Math.abs(w),
                height: Math.abs(h)
              }
            : null
        );
        return;
      }

      // Always track pending connection cursor, regardless of which tool is active
      if (pendingConnection) {
        setPendingConnection({ ...pendingConnection, currentX: x, currentY: y });
      }

      // Arrow preview – track cursor after first click
      if (tool === 'arrow' && arrowStart) {
        setArrowPreview(snap(rawMx, rawMy));
      }
    },
    [isPanning, toCanvas, snap, tool, activeDrawing, shapeStart, shapePreview, pendingConnection, setPan, removeDrawingsAt, setPendingConnection, setLasso, arrowStart, setArrowPreview]
  );

  const handleMouseUp = useCallback(
    (e: React.MouseEvent) => {
      // Lasso commit
      if (tool === 'select' && lassoStartRef.current) {
        const rect = lassoRef.current;
        if (rect) {
          const minX = Math.min(rect.startX, rect.currentX);
          const maxX = Math.max(rect.startX, rect.currentX);
          const minY = Math.min(rect.startY, rect.currentY);
          const maxY = Math.max(rect.startY, rect.currentY);
          const hit = elements.filter((el) => {
            const b = getElementBounds(el);
            return b.x >= minX && b.x + b.w <= maxX && b.y >= minY && b.y + b.h <= maxY;
          }).map((el) => el.id);
          const promoted = promoteToTopLevel(hit, groups);
          if (promoted.length > 0) {
            setSelectedIds(promoted);
          } else {
            setSelectedId(null);
          }
        } else {
          // Pure click with no drag → deselect
          setSelectedId(null);
        }
        lassoStartRef.current = null;
        lassoRef.current = null;
        setLasso(null);
        return;
      }

      if (isPanning) {
        setIsPanning(false);
        panStartRef.current = null;
        return;
      }

      const { x, y } = toCanvas(e.clientX, e.clientY);

      if (tool === 'sharpie' && isDrawingRef.current && activeDrawing) {
        isDrawingRef.current = false;
        if (activeDrawing.points.length === 1) {
          // Single click → small dot
          const el: Omit<DrawingElement, 'id' | 'zIndex'> = {
            type: 'drawing',
            x: activeDrawing.points[0][0],
            y: activeDrawing.points[0][1],
            rotation: 0,
            points: [
              [x - 1, y - 1, 0.5],
              [x, y - 1, 0.5],
              [x + 1, y, 0.5],
              [x, y + 1, 0.5],
              [x - 1, y + 1, 0.5]
            ],
            color: activeDrawing.color,
            size: activeDrawing.size,
            opacity: activeDrawing.opacity
          };
          addElement(el);
        } else {
          const el: Omit<DrawingElement, 'id' | 'zIndex'> = {
            type: 'drawing',
            x: activeDrawing.points[0][0],
            y: activeDrawing.points[0][1],
            rotation: 0,
            points: activeDrawing.points,
            color: activeDrawing.color,
            size: activeDrawing.size,
            opacity: activeDrawing.opacity
          };
          addElement(el);
        }
        setActiveDrawing(null);
        return;
      }

      if (tool === 'eraser') {
        isDrawingRef.current = false;
        return;
      }

      if (tool === 'shape' && shapeStart && shapePreview) {
        const minSize = 10;
        if (shapePreview.width >= minSize && shapePreview.height >= minSize) {
          const shapeEl: Omit<ShapeElement, 'id' | 'zIndex'> = {
            type: 'shape',
            x: shapePreview.x,
            y: shapePreview.y,
            width: shapePreview.width,
            height: shapePreview.height,
            rotation: 0,
            shapeType: shapePreview.shapeType,
            fillColor: 'transparent',
            strokeColor: color,
            roughness,
            seed: shapePreview.seed
          };
          addElement(shapeEl);
        }
        setShapeStart(null);
        setShapePreview(null);
        return;
      }
    },
    [isPanning, toCanvas, tool, activeDrawing, shapeStart, shapePreview, color, roughness, addElement, elements, setSelectedId, setSelectedIds]
  );

  // ── Drag and drop image files ──────────────────────────────────────────────
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    dragOverRef.current = true;
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      dragOverRef.current = false;
      const { x: rawDx, y: rawDy } = toCanvas(e.clientX, e.clientY);
      const { x, y } = snap(rawDx, rawDy);

      const files = Array.from(e.dataTransfer.files).filter((f) =>
        f.type.startsWith('image/')
      );

      files.forEach((file) => {
        const reader = new FileReader();
        reader.onload = (ev) => {
          const dataUrl = ev.target?.result as string;
          if (!dataUrl) return;

          // Create an img to get natural dimensions
          const img = new Image();
          img.onload = () => {
            const maxW = 260;
            const scale = img.naturalWidth > maxW ? maxW / img.naturalWidth : 1;
            const w = img.naturalWidth * scale;
            const h = img.naturalHeight * scale;

            snapshot();
            const pos = snap(x - w / 2, y - h / 2);
            const imgEl: Omit<ImageElement, 'id' | 'zIndex'> = {
              type: 'image',
              x: pos.x,
              y: pos.y,
              width: w,
              height: h,
              rotation: polaroidRotation(),
              dataUrl,
              caption: file.name.replace(/\.[^.]+$/, '')
            };
            addElement(imgEl);
              setTool('select');
          };
          img.src = dataUrl;
        };
        reader.readAsDataURL(file);
      });
    },
    [toCanvas, snap, snapshot, addElement, setTool]
  );

  // ── Cursor style ────────────────────────────────────────────────────────────
  const getCursor = () => {
    if (lasso) return 'crosshair';
    if (isSpaceDown || isPanning) return 'grabbing';
    switch (tool) {
      case 'sharpie': return 'crosshair';
      case 'eraser': return 'cell';
      case 'shape': return 'crosshair';
      case 'sticky-note': return 'copy';
      case 'text-box': return 'text';
      case 'connection': return 'crosshair';
      case 'image': return 'copy';
      case 'arrow': return arrowStart ? 'crosshair' : 'crosshair';
      case 'line': return 'crosshair';
      default: return 'default';
    }
  };

  // Lasso rect in screen space
  const lassoScreenRect = lasso
    ? {
        left: Math.min(lasso.startX, lasso.currentX) * zoom + pan.x,
        top: Math.min(lasso.startY, lasso.currentY) * zoom + pan.y,
        width: Math.abs(lasso.currentX - lasso.startX) * zoom,
        height: Math.abs(lasso.currentY - lasso.startY) * zoom
      }
    : null;

  // ── Render ─────────────────────────────────────────────────────────────────
  const drawings = elements.filter((el) => el.type === 'drawing') as DrawingElement[];
  const shapes = elements.filter((el) => el.type === 'shape') as ShapeElement[];
  const arrows = elements.filter((el) => el.type === 'arrow') as ArrowElement[];
  const htmlEls = elements.filter((el) =>
    el.type === 'sticky-note' || el.type === 'text-box' || el.type === 'image'
  );

  // Effective set of element IDs considered "selected" (includes children of selected groups)
  const selectedElementIds = useMemo(() => {
    const set = new Set<string>();
    for (const id of selectedIds) {
      const grp = groups.find((g) => g.id === id);
      if (grp) grp.childIds.forEach((cid) => set.add(cid));
      else set.add(id);
    }
    if (selectedId) set.add(selectedId);
    return set;
  }, [selectedIds, selectedId, groups]);

  // Multi-selection bounding box in screen space (used for group-drag overlay)
  // Shows for 2+ elements OR a single group selection
  const multiSelectionRect = (() => {
    if (selectedIds.length === 0) return null;
    const hasGroup = selectedIds.some((id) => groups.some((g) => g.id === id));
    if (selectedIds.length < 2 && !hasGroup) return null;
    // Expand group IDs to physical children
    const physicalEls = selectedIds.flatMap((id) => {
      const grp = groups.find((g) => g.id === id);
      if (grp) return elements.filter((el) => grp.childIds.includes(el.id));
      return elements.filter((el) => el.id === id);
    });
    if (physicalEls.length === 0) return null;
    const bounds = physicalEls.map(getElementBounds);
    const minX = Math.min(...bounds.map((b) => b.x));
    const minY = Math.min(...bounds.map((b) => b.y));
    const maxX = Math.max(...bounds.map((b) => b.x + b.w));
    const maxY = Math.max(...bounds.map((b) => b.y + b.h));
    return {
      left:   minX * zoom + pan.x - 4,
      top:    minY * zoom + pan.y - 4,
      width:  (maxX - minX) * zoom + 8,
      height: (maxY - minY) * zoom + 8,
    };
  })();

  const viewportStyle: React.CSSProperties = {
    transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
    transformOrigin: '0 0',
    width: canvasWidth,
    height: canvasHeight
  };

  return (
    <div
      ref={containerRef}
      className={styles.whiteboard}
      style={{ cursor: getCursor() }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onContextMenu={handleContextMenu}
    >
      {/* ── Viewport (pan/zoom container) ─────────────────────────────────── */}
      <div className={styles.viewport} style={viewportStyle}>

        {/* ── Group borders ────────────────────────────────────────────────── */}
        {groups.map((grp) => {
          const children = elements.filter((el) => grp.childIds.includes(el.id));
          if (children.length === 0) return null;
          const boxes = children.map(getElementBounds);
          const gMinX = Math.min(...boxes.map((b) => b.x));
          const gMinY = Math.min(...boxes.map((b) => b.y));
          const gMaxX = Math.max(...boxes.map((b) => b.x + b.w));
          const gMaxY = Math.max(...boxes.map((b) => b.y + b.h));
          const isGroupSelected = selectedIds.includes(grp.id);
          return (
            <div
              key={grp.id}
              className={`${styles.groupBorder} ${isGroupSelected ? styles.groupBorderSelected : ''}`}
              style={{ left: gMinX - 10, top: gMinY - 10, width: gMaxX - gMinX + 20, height: gMaxY - gMinY + 20 }}
              onClick={() => { if (tool === 'select') setSelectedIds([grp.id]); }}
              onMouseDown={(e) => e.stopPropagation()}
            />
          );
        })}
        {/* ── SVG Layer: drawings, shapes, connections ─────────────────── */}
        <svg
          ref={svgRef}
          className={styles.svgLayer}
          width={canvasWidth}
          height={canvasHeight}
          style={{
            // 'all' lets SVG shapes/drawings receive click events for select & connection tools
            pointerEvents: (tool === 'select' || tool === 'connection' || tool === 'arrow' || tool === 'line') ? 'all' : 'none'
          }}
        >
          {/* Grid */}
          {gridEnabled && (
            <>
              <defs>
                <pattern id="whiteboard-grid" x="0" y="0" width={gridSize} height={gridSize} patternUnits="userSpaceOnUse">
                  <circle cx={gridSize / 2} cy={gridSize / 2} r={1} fill="rgba(150,140,200,0.25)" />
                </pattern>
              </defs>
              <rect x={0} y={0} width={canvasWidth} height={canvasHeight} fill="url(#whiteboard-grid)" />
            </>
          )}

          {/* Completed drawings */}
          {drawings.map((el) => (
            <DrawingPath
              key={el.id}
              element={el}
              isSelected={selectedElementIds.has(el.id)}
              onSelect={() => handleElementClick(el.id)}
            />
          ))}

          {/* Active stroke being drawn */}
          {activeDrawing && (
            <path
              d={generateDrawingPath(activeDrawing.points, activeDrawing.size)}
              fill={activeDrawing.color}
              opacity={activeDrawing.opacity}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {/* Shapes */}
          {shapes.map((el) => (
            <ShapeEl
              key={el.id}
              element={el}
              isSelected={selectedElementIds.has(el.id)}
              tool={tool}
              onSelect={() => handleElementClick(el.id)}
              onUpdate={(updates) => updateElement(el.id, updates)}
              onStartConnection={() => {
                const center = getElementCenter(el);
                setPendingConnection({
                  sourceId: el.id,
                  sourceX: center.x,
                  sourceY: center.y,
                  currentX: center.x,
                  currentY: center.y
                });
              }}
              onCompleteConnection={() => {
                if (pendingConnection && pendingConnection.sourceId !== el.id) {
                  snapshot();
                  addConnection(pendingConnection.sourceId, el.id);
                  setPendingConnection(null);
                }
              }}
            />
          ))}

          {/* Shape preview while drawing */}
          {shapePreview && shapePreview.width > 2 && shapePreview.height > 2 && (
            <PreviewShape preview={shapePreview} />
          )}

          {/* Arrows */}
          {arrows.map((el) => (
            <ArrowEl
              key={el.id}
              element={el}
              isSelected={selectedElementIds.has(el.id)}
              tool={tool}
              onSelect={() => handleElementClick(el.id)}
              onUpdate={(updates) => updateElement(el.id, updates)}
            />
          ))}

          {/* Arrow preview line while placing */}
          {arrowStart && arrowPreview && (
            <g opacity={0.6}>
              <line
                x1={arrowStart.x} y1={arrowStart.y}
                x2={arrowPreview.x} y2={arrowPreview.y}
                stroke={color} strokeWidth={strokeWidth}
                strokeLinecap="round" strokeDasharray="6 4"
              />
              <circle cx={arrowStart.x} cy={arrowStart.y} r={4} fill={color} />
            </g>
          )}

          {/* Connections */}
          {connections.map((conn) => {
            const src = elements.find((el) => el.id === conn.sourceId);
            const tgt = elements.find((el) => el.id === conn.targetId);
            if (!src || !tgt) return null;
            return (
              <Connection
                key={conn.id}
                connection={conn}
                sourceCenter={getElementCenter(src)}
                targetCenter={getElementCenter(tgt)}
                isSelected={selectedConnectionId === conn.id}
                onClick={() => {
                  if (tool === 'select') {
                    setSelectedConnectionId(conn.id);
                  }
                }}
              />
            );
          })}

          {/* Pending connection line */}
          {pendingConnection && (
            <PendingConnectionLine pending={pendingConnection} />
          )}
        </svg>

        {/* ── HTML overlay: sticky notes, text boxes, images ────────────── */}
        <div className={styles.elementsOverlay}>
          {htmlEls.map((el) => {
            if (el.type === 'sticky-note') {
              return (
                <StickyNote
                  key={el.id}
                  element={el as StickyNoteElement}
                  isSelected={selectedElementIds.has(el.id)}
                  tool={tool}
                  onSelect={() => handleElementClick(el.id)}
                  onUpdate={(updates) => updateElement(el.id, updates)}
                  onDelete={() => { snapshot(); removeElement(el.id); }}
                  onStartConnection={() => {
                    const center = getElementCenter(el);
                    setPendingConnection({
                      sourceId: el.id,
                      sourceX: center.x,
                      sourceY: center.y,
                      currentX: center.x,
                      currentY: center.y
                    });
                  }}
                  onCompleteConnection={() => {
                    if (pendingConnection && pendingConnection.sourceId !== el.id) {
                      snapshot();
                      addConnection(pendingConnection.sourceId, el.id);
                      setPendingConnection(null);
                    }
                  }}
                />
              );
            }
            if (el.type === 'text-box') {
              return (
                <TextBox
                  key={el.id}
                  element={el as TextBoxElement}
                  isSelected={selectedElementIds.has(el.id)}
                  tool={tool}
                  onSelect={() => handleElementClick(el.id)}
                  onUpdate={(updates) => updateElement(el.id, updates)}
                  onDelete={() => { snapshot(); removeElement(el.id); }}
                  onStartConnection={() => {
                    const center = getElementCenter(el);
                    setPendingConnection({
                      sourceId: el.id,
                      sourceX: center.x,
                      sourceY: center.y,
                      currentX: center.x,
                      currentY: center.y
                    });
                  }}
                  onCompleteConnection={() => {
                    if (pendingConnection && pendingConnection.sourceId !== el.id) {
                      snapshot();
                      addConnection(pendingConnection.sourceId, el.id);
                      setPendingConnection(null);
                    }
                  }}
                />
              );
            }
            if (el.type === 'image') {
              return (
                <ImageEl
                  key={el.id}
                  element={el as ImageElement}
                  isSelected={selectedElementIds.has(el.id)}
                  tool={tool}
                  onSelect={() => handleElementClick(el.id)}
                  onUpdate={(updates) => updateElement(el.id, updates)}
                  onDelete={() => { snapshot(); removeElement(el.id); }}
                  onStartConnection={() => {
                    const center = getElementCenter(el);
                    setPendingConnection({
                      sourceId: el.id,
                      sourceX: center.x,
                      sourceY: center.y,
                      currentX: center.x,
                      currentY: center.y
                    });
                  }}
                  onCompleteConnection={() => {
                    if (pendingConnection && pendingConnection.sourceId !== el.id) {
                      snapshot();
                      addConnection(pendingConnection.sourceId, el.id);
                      setPendingConnection(null);
                    }
                  }}
                />
              );
            }
            return null;
          })}
        </div>
      </div>

      {/* ── Toolbar (outside viewport) ─────────────────────────────────────── */}
      <Toolbar />
      {/* Hidden file input for image insertion */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          // Reset value so the same file can be picked again
          e.target.value = '';
          const pos = pendingImagePos.current ?? { x: (canvasWidth / 2), y: (canvasHeight / 2) };
          pendingImagePos.current = null;
          const reader = new FileReader();
          reader.onload = (ev) => {
            const dataUrl = ev.target?.result as string;
            if (!dataUrl) return;
            const img = new Image();
            img.onload = () => {
              const maxW = 260;
              const scale = img.naturalWidth > maxW ? maxW / img.naturalWidth : 1;
              const w = img.naturalWidth * scale;
              const h = img.naturalHeight * scale;
              snapshot();
              const imgEl: Omit<ImageElement, 'id' | 'zIndex'> = {
                type: 'image',
                x: pos.x - w / 2,
                y: pos.y - h / 2,
                width: w,
                height: h,
                rotation: polaroidRotation(),
                dataUrl,
                caption: file.name.replace(/\.[^.]+$/, '')
              };
              addElement(imgEl);
              setTool('select');
            };
            img.src = dataUrl;
          };
          reader.readAsDataURL(file);
        }}
      />      {/* ── Multi-selection drag overlay ───────────────────────────────────────── */}
      {multiSelectionRect && (
        <div
          className={styles.multiSelectRect}
          style={{
            left:   multiSelectionRect.left,
            top:    multiSelectionRect.top,
            width:  multiSelectionRect.width,
            height: multiSelectionRect.height,
          }}
          onMouseDown={(e) => {
            if (tool !== 'select') return;
            e.stopPropagation();
            e.preventDefault();
            snapshot();
            // Expand group IDs to their physical child elements
            const origins = selectedIds.flatMap((id) => {
              const grp = groups.find((g) => g.id === id);
              const physIds = grp ? grp.childIds : [id];
              return elements
                .filter((el) => physIds.includes(el.id))
                .map((el) => {
                  if (el.type === 'arrow') {
                    return { id: el.id, x: el.x, y: el.y, x2: (el as ArrowElement).x2, y2: (el as ArrowElement).y2 };
                  }
                  return { id: el.id, x: el.x, y: el.y };
                });
            });
            multiDragRef.current = { mx: e.clientX, my: e.clientY, origins };

            const onMove = (ev: MouseEvent) => {
              if (!multiDragRef.current) return;
              const ddx = (ev.clientX - multiDragRef.current.mx) / zoom;
              const ddy = (ev.clientY - multiDragRef.current.my) / zoom;
              multiDragRef.current.origins.forEach(({ id, x, y, x2, y2 }) => {
                const updates: Record<string, number> = {
                  x: gridEnabled ? snapVal(x + ddx, gridSize) : x + ddx,
                  y: gridEnabled ? snapVal(y + ddy, gridSize) : y + ddy,
                };
                if (x2 !== undefined && y2 !== undefined) {
                  updates.x2 = gridEnabled ? snapVal(x2 + ddx, gridSize) : x2 + ddx;
                  updates.y2 = gridEnabled ? snapVal(y2 + ddy, gridSize) : y2 + ddy;
                }
                updateElement(id, updates as Partial<WhiteboardElement>);
              });
            };
            const onUp = () => {
              multiDragRef.current = null;
              window.removeEventListener('mousemove', onMove);
              window.removeEventListener('mouseup', onUp);
            };
            window.addEventListener('mousemove', onMove);
            window.addEventListener('mouseup', onUp);
          }}
        />
      )}

      {/* ── Lasso selection rectangle ────────────────────────────────────────────── */}
      {lassoScreenRect && (
        <div
          className={styles.lassoRect}
          style={{
            left: lassoScreenRect.left,
            top: lassoScreenRect.top,
            width: lassoScreenRect.width,
            height: lassoScreenRect.height
          }}
        />
      )}

      {/* ── Properties panel ──────────────────────────────────────────── */}
      <PropertiesPanel />

      {/* ── Context menu ──────────────────────────────────────────────── */}
      {contextMenu && (() => {
        const { selectedId: sid, selectedIds: sids, groups: ctxGroups } = useWhiteboardStore.getState();
        const ids = sids.length > 0 ? sids : sid ? [sid] : [];
        // Expand group IDs to physical elements for copy/delete
        const physicalIds = new Set<string>();
        for (const id of ids) {
          const grp = ctxGroups.find((g) => g.id === id);
          if (grp) grp.childIds.forEach((cid) => physicalIds.add(cid));
          else physicalIds.add(id);
        }
        const selectedEls = elements.filter((el) => physicalIds.has(el.id));
        const hasSelection = selectedEls.length > 0 || ids.length > 0;
        const hasClipboard = _clipboard.length > 0;

        const menuItems: ContextMenuEntry[] = [
          {
            label: 'Cut',
            shortcut: 'Ctrl+X',
            disabled: !hasSelection,
            onClick: () => handleCopy(true),
          },
          {
            label: 'Copy',
            shortcut: 'Ctrl+C',
            disabled: !hasSelection,
            onClick: () => handleCopy(false),
          },
          {
            label: 'Paste',
            shortcut: 'Ctrl+V',
            disabled: !hasClipboard,
            onClick: () => handlePaste(contextMenu.canvasX, contextMenu.canvasY),
          },
          { separator: true },
          {
            label: 'Delete',
            shortcut: 'Del',
            disabled: !hasSelection,
            danger: true,
            onClick: () => {
              if (selectedEls.length > 0) {
                snapshot();
                selectedEls.forEach((el) => removeElement(el.id));
              }
            },
          },
        ];

        return (
          <ContextMenu
            x={contextMenu.x}
            y={contextMenu.y}
            items={menuItems}
            onClose={() => setContextMenu(null)}
          />
        );
      })()}

      {/* ── Export dialog ─────────────────────────────────────────────────── */}
      {showExportDialog && (() => {
        const bounds = computeContentBounds(elements);
        return (
          <ExportDialog
            contentWidth={Math.ceil(bounds.w)}
            contentHeight={Math.ceil(bounds.h)}
            onExport={handleExport}
            onClose={() => onCloseExportDialog?.()}
            isExporting={isExporting}
          />
        );
      })()}
    </div>
  );
};

// ── Sub-components ──────────────────────────────────────────────────────────

interface DrawingPathProps {
  element: DrawingElement;
  isSelected: boolean;
  onSelect: () => void;
}

const DrawingPath: React.FC<DrawingPathProps> = ({ element, isSelected, onSelect }) => {
  const pathD = generateDrawingPath(element.points, element.size, true);
  if (!pathD) return null;

  return (
    <g
      style={{ cursor: 'pointer', pointerEvents: 'all' }}
      onClick={onSelect}
    >
      {isSelected && (
        <path
          d={pathD}
          fill="none"
          stroke="#7c6aff"
          strokeWidth={element.size + 8}
          opacity={0.3}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}
      <path
        d={pathD}
        fill={element.color}
        opacity={element.opacity}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </g>
  );
};

interface PreviewShapeProps {
  preview: ShapePreview;
}

const PreviewShape: React.FC<PreviewShapeProps> = ({ preview }) => {
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

interface PendingConnectionLineProps {
  pending: { sourceX: number; sourceY: number; currentX: number; currentY: number };
}

const PendingConnectionLine: React.FC<PendingConnectionLineProps> = ({ pending }) => {
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
