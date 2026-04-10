import React, { useCallback, useEffect, useRef, useState } from 'react';
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
  ArrowElement
} from '../../types';
import styles from './Whiteboard.module.scss';

const ERASE_RADIUS = 20;

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

  const {
    addElement,
    removeElement,
    removeDrawingsAt,
    updateElement,
    setSelectedId,
    setSelectedIds,
    setTool,
    setZoom,
    setPan,
    setPendingConnection,
    addConnection,
    undo,
    redo,
    snapshot,
    loadBoard,
    setCurrentFile,
    clearAll
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

  // Image file input
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pendingImagePos = useRef<{ x: number; y: number } | null>(null);

  // Arrow tool – first click sets start, second click commits
  const [arrowStart, setArrowStart] = useState<{ x: number; y: number } | null>(null);
  const [arrowPreview, setArrowPreview] = useState<{ x: number; y: number } | null>(null);

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
      if ((e.ctrlKey || e.metaKey) && e.key === 's' && !e.shiftKey) {
        e.preventDefault();
        const { elements: els, connections: conns, currentFile: cf } = useWhiteboardStore.getState();
        const data = JSON.stringify({ elements: els, connections: conns }, null, 2);
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
              loadBoard(parsed.elements ?? [], parsed.connections ?? [], r.filePath);
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
      if ((e.key === 'a' || e.key === 'A') && !e.ctrlKey && !e.metaKey) {
        const active = document.activeElement;
        if (!active || (active.tagName !== 'INPUT' && active.tagName !== 'TEXTAREA')) {
          setTool('arrow');
        }
      }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        const active = document.activeElement;
        if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA')) return;
        const toDelete = selectedIds.length > 0 ? selectedIds : selectedId ? [selectedId] : [];
        if (toDelete.length > 0) {
          snapshot();
          toDelete.forEach((id) => removeElement(id));
        }
      }
      if (e.key === 'Escape') {
        setSelectedId(null);
        setSelectedIds([]);
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
  }, [selectedId, selectedIds, removeElement, setSelectedId, setSelectedIds, setPendingConnection, undo, redo, snapshot, loadBoard, setCurrentFile, clearAll]);

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

        case 'arrow': {
          if (!arrowStart) {
            // First click – set start point
            setArrowStart({ x, y });
            setArrowPreview({ x, y });
          } else {
            // Second click – commit the arrow
            snapshot();
            const arrowEl: Omit<ArrowElement, 'id' | 'zIndex'> = {
              type: 'arrow',
              x: arrowStart.x,
              y: arrowStart.y,
              x2: x,
              y2: y,
              rotation: 0,
              color,
              strokeWidth
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
            return b.x < maxX && b.x + b.w > minX && b.y < maxY && b.y + b.h > minY;
          }).map((el) => el.id);
          if (hit.length > 0) {
            setSelectedIds(hit);
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
    >
      {/* ── Viewport (pan/zoom container) ─────────────────────────────────── */}
      <div className={styles.viewport} style={viewportStyle}>
        {/* ── SVG Layer: drawings, shapes, connections ─────────────────── */}
        <svg
          ref={svgRef}
          className={styles.svgLayer}
          width={canvasWidth}
          height={canvasHeight}
          style={{
            // 'all' lets SVG shapes/drawings receive click events for select & connection tools
            pointerEvents: (tool === 'select' || tool === 'connection' || tool === 'arrow') ? 'all' : 'none'
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
              isSelected={selectedId === el.id || selectedIds.includes(el.id)}
              onSelect={() => tool === 'select' && setSelectedId(el.id)}
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
              isSelected={selectedId === el.id || selectedIds.includes(el.id)}
              tool={tool}
              onSelect={() => setSelectedId(el.id)}
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
              isSelected={selectedId === el.id || selectedIds.includes(el.id)}
              tool={tool}
              onSelect={() => setSelectedId(el.id)}
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
                isSelected={false}
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
                  isSelected={selectedId === el.id || selectedIds.includes(el.id)}
                  tool={tool}
                  onSelect={() => setSelectedId(el.id)}
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
                  isSelected={selectedId === el.id || selectedIds.includes(el.id)}
                  tool={tool}
                  onSelect={() => setSelectedId(el.id)}
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
                  isSelected={selectedId === el.id || selectedIds.includes(el.id)}
                  tool={tool}
                  onSelect={() => setSelectedId(el.id)}
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
      />      {/* ── Lasso selection rectangle ────────────────────────────────────────────── */}
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
