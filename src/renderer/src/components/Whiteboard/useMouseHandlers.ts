import React, { useCallback, RefObject, MutableRefObject } from 'react';
import { useWhiteboardStore } from '../../store/whiteboardStore';
import { polaroidRotation } from '../../utils/helpers';
import { promoteToTopLevel, getElementBounds, ERASE_RADIUS } from './whiteboardHelpers';
import type {
  ActiveDrawing, ShapePreview, WhiteboardElement, DrawingElement,
  StickyNoteElement, TextBoxElement, ShapeElement, ImageElement, ArrowElement,
} from '../../types';
import type { LassoRect } from './whiteboardHelpers';
import styles from './Whiteboard.module.scss';

interface UseMouseHandlersParams {
  containerRef: RefObject<HTMLDivElement | null>;
  svgRef: RefObject<SVGSVGElement | null>;
  toCanvas: (clientX: number, clientY: number) => { x: number; y: number };
  snap: (x: number, y: number) => { x: number; y: number };
  isSpaceDown: boolean;
  isPanning: boolean;
  setIsPanning: React.Dispatch<React.SetStateAction<boolean>>;
  panStartRef: MutableRefObject<{ mx: number; my: number; px: number; py: number } | null>;
  activeDrawing: ActiveDrawing | null;
  setActiveDrawing: React.Dispatch<React.SetStateAction<ActiveDrawing | null>>;
  shapeStart: { x: number; y: number } | null;
  setShapeStart: React.Dispatch<React.SetStateAction<{ x: number; y: number } | null>>;
  shapePreview: ShapePreview | null;
  setShapePreview: React.Dispatch<React.SetStateAction<ShapePreview | null>>;
  arrowStart: { x: number; y: number } | null;
  setArrowStart: React.Dispatch<React.SetStateAction<{ x: number; y: number } | null>>;
  setArrowPreview: React.Dispatch<React.SetStateAction<{ x: number; y: number } | null>>;
  setCursorCanvas: React.Dispatch<React.SetStateAction<{ x: number; y: number } | null>>;
  isDrawingRef: MutableRefObject<boolean>;
  dragOverRef: MutableRefObject<boolean>;
  lassoStartRef: MutableRefObject<{ x: number; y: number } | null>;
  lassoRef: MutableRefObject<LassoRect | null>;
  setLasso: React.Dispatch<React.SetStateAction<LassoRect | null>>;
  fileInputRef: RefObject<HTMLInputElement | null>;
  pendingImagePos: MutableRefObject<{ x: number; y: number } | null>;
}

export function useMouseHandlers({
  containerRef, svgRef,
  toCanvas, snap,
  isSpaceDown, isPanning, setIsPanning, panStartRef,
  activeDrawing, setActiveDrawing,
  shapeStart, setShapeStart, shapePreview, setShapePreview,
  arrowStart, setArrowStart, setArrowPreview,
  setCursorCanvas,
  isDrawingRef, dragOverRef,
  lassoStartRef, lassoRef, setLasso,
  fileInputRef, pendingImagePos,
}: UseMouseHandlersParams) {
  const tool = useWhiteboardStore((s) => s.tool);
  const color = useWhiteboardStore((s) => s.color);
  const strokeWidth = useWhiteboardStore((s) => s.strokeWidth);
  const font = useWhiteboardStore((s) => s.font);
  const fontSize = useWhiteboardStore((s) => s.fontSize);
  const shapeType = useWhiteboardStore((s) => s.shapeType);
  const stickyColor = useWhiteboardStore((s) => s.stickyColor);
  const roughness = useWhiteboardStore((s) => s.roughness);
  const opacity = useWhiteboardStore((s) => s.opacity);
  const pendingConnection = useWhiteboardStore((s) => s.pendingConnection);
  const zoom = useWhiteboardStore((s) => s.zoom);
  const pan = useWhiteboardStore((s) => s.pan);
  const elements = useWhiteboardStore((s) => s.elements);
  const groups = useWhiteboardStore((s) => s.groups);
  const canvasWidth = useWhiteboardStore((s) => s.canvasWidth);
  const canvasHeight = useWhiteboardStore((s) => s.canvasHeight);
  const {
    snapshot, removeDrawingsAt, addElement, setSelectedId, setSelectedIds,
    setPendingConnection, addConnection, setPan, setTool,
  } = useWhiteboardStore();

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (e.button !== 0 && e.button !== 1) return;
      const isMidBtn = e.button === 1;

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
          setActiveDrawing({ points: [[x, y, 0.5]], color, size: strokeWidth, opacity });
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
            shapeType, x, y, width: 1, height: 1,
            fillColor: 'transparent', strokeColor: color, roughness,
            seed: Math.floor(Math.random() * 999999),
          });
          break;
        }
        case 'sticky-note': {
          snapshot();
          const { x: sx, y: sy } = snap(x - 100, y - 60);
          const stickyEl: Omit<StickyNoteElement, 'id' | 'zIndex'> = {
            type: 'sticky-note', x: sx, y: sy, width: 200, height: 180,
            rotation: (Math.random() - 0.5) * 4,
            text: 'Double-click to edit', backgroundColor: stickyColor, font, fontSize,
          };
          addElement(stickyEl);
          break;
        }
        case 'text-box': {
          e.preventDefault();
          snapshot();
          const { x: tx, y: ty } = snap(x - 120, y - 30);
          const tbEl: Omit<TextBoxElement, 'id' | 'zIndex'> = {
            type: 'text-box', x: tx, y: ty, width: 240, height: 60,
            rotation: 0, text: '', font, fontSize, color, bold: false, italic: false,
          };
          const newId = addElement(tbEl);
          setSelectedId(newId);
          break;
        }
        case 'image': {
          pendingImagePos.current = { x, y };
          fileInputRef.current?.click();
          break;
        }
        case 'arrow':
        case 'line': {
          if (!arrowStart) {
            setArrowStart({ x, y });
            setArrowPreview({ x, y });
          } else {
            let ex = x, ey = y;
            if (e.shiftKey) {
              const adx = Math.abs(x - arrowStart.x);
              const ady = Math.abs(y - arrowStart.y);
              if (adx > ady) ey = arrowStart.y;
              else ex = arrowStart.x;
            }
            snapshot();
            const arrowEl: Omit<ArrowElement, 'id' | 'zIndex'> = {
              type: 'arrow', x: arrowStart.x, y: arrowStart.y, x2: ex, y2: ey,
              rotation: 0, color, strokeWidth, showArrowhead: tool === 'arrow',
            };
            addElement(arrowEl);
            setArrowStart(null);
            setArrowPreview(null);
          }
          break;
        }
        case 'select': {
          if (pendingConnection) {
            setPendingConnection(null);
          } else if (
            e.target === containerRef.current ||
            (e.target as Element).classList.contains(styles.viewport) ||
            e.target === svgRef.current
          ) {
            lassoStartRef.current = { x, y };
          }
          break;
        }
        case 'connection': {
          if (pendingConnection) setPendingConnection(null);
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
      arrowStart, setArrowStart, setArrowPreview,
      isDrawingRef, panStartRef, setIsPanning, setActiveDrawing,
      setShapeStart, setShapePreview, pendingImagePos, fileInputRef,
      lassoStartRef, containerRef, svgRef,
    ]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (isPanning && panStartRef.current) {
        const { mx, my, px, py } = panStartRef.current;
        setPan({ x: px + (e.clientX - mx), y: py + (e.clientY - my) });
        return;
      }

      const { x: rawMx, y: rawMy } = toCanvas(e.clientX, e.clientY);
      const { x, y } = snap(rawMx, rawMy);

      if (tool === 'select' && lassoStartRef.current) {
        const r = { startX: lassoStartRef.current.x, startY: lassoStartRef.current.y, currentX: x, currentY: y };
        lassoRef.current = r;
        setLasso(r);
        return;
      }

      if (tool === 'sharpie' && isDrawingRef.current && activeDrawing) {
        setActiveDrawing((prev) =>
          prev ? { ...prev, points: [...prev.points, [x, y, 0.5]] } : null
        );
        return;
      }

      if (tool === 'eraser' && isDrawingRef.current) {
        removeDrawingsAt(x, y, ERASE_RADIUS);
        return;
      }

      if (tool === 'shape' && shapeStart && shapePreview) {
        const w = x - shapeStart.x;
        const h = y - shapeStart.y;
        setShapePreview((prev) =>
          prev ? {
            ...prev,
            x: w < 0 ? x : shapeStart.x,
            y: h < 0 ? y : shapeStart.y,
            width: Math.abs(w),
            height: Math.abs(h),
          } : null
        );
        return;
      }

      if (pendingConnection) {
        setPendingConnection({ ...pendingConnection, currentX: x, currentY: y });
      }

      if ((tool === 'arrow' || tool === 'line') && arrowStart) {
        let px = rawMx, py = rawMy;
        if (e.shiftKey) {
          const adx = Math.abs(rawMx - arrowStart.x);
          const ady = Math.abs(rawMy - arrowStart.y);
          if (adx > ady) py = arrowStart.y;
          else px = arrowStart.x;
        }
        setArrowPreview(snap(px, py));
      }

      if (tool === 'sticky-note' || tool === 'text-box') {
        setCursorCanvas({ x, y });
      }
    },
    [
      isPanning, toCanvas, snap, tool, activeDrawing, shapeStart, shapePreview,
      pendingConnection, setPan, removeDrawingsAt, setPendingConnection,
      setLasso, arrowStart, setArrowPreview,
      isDrawingRef, panStartRef, lassoStartRef, lassoRef,
      setActiveDrawing, setShapePreview, setCursorCanvas,
    ]
  );

  const handleMouseUp = useCallback(
    (e: React.MouseEvent) => {
      if (tool === 'select' && lassoStartRef.current) {
        const rect = lassoRef.current;
        if (rect) {
          const minX = Math.min(rect.startX, rect.currentX);
          const maxX = Math.max(rect.startX, rect.currentX);
          const minY = Math.min(rect.startY, rect.currentY);
          const maxY = Math.max(rect.startY, rect.currentY);
          const hit = elements
            .filter((el) => {
              const b = getElementBounds(el);
              return b.x >= minX && b.x + b.w <= maxX && b.y >= minY && b.y + b.h <= maxY;
            })
            .map((el) => el.id);
          const promoted = promoteToTopLevel(hit, groups);
          if (promoted.length > 0) setSelectedIds(promoted);
          else setSelectedId(null);
        } else {
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
          const el: Omit<DrawingElement, 'id' | 'zIndex'> = {
            type: 'drawing', x: activeDrawing.points[0][0], y: activeDrawing.points[0][1],
            rotation: 0,
            points: [
              [x - 1, y - 1, 0.5], [x, y - 1, 0.5], [x + 1, y, 0.5],
              [x, y + 1, 0.5], [x - 1, y + 1, 0.5],
            ],
            color: activeDrawing.color, size: activeDrawing.size, opacity: activeDrawing.opacity,
          };
          addElement(el);
        } else {
          const el: Omit<DrawingElement, 'id' | 'zIndex'> = {
            type: 'drawing', x: activeDrawing.points[0][0], y: activeDrawing.points[0][1],
            rotation: 0, points: activeDrawing.points,
            color: activeDrawing.color, size: activeDrawing.size, opacity: activeDrawing.opacity,
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
            type: 'shape', x: shapePreview.x, y: shapePreview.y,
            width: shapePreview.width, height: shapePreview.height,
            rotation: 0, shapeType: shapePreview.shapeType,
            fillColor: 'transparent', strokeColor: color,
            roughness, seed: shapePreview.seed,
          };
          addElement(shapeEl);
        }
        setShapeStart(null);
        setShapePreview(null);
        return;
      }
    },
    [
      tool, isPanning, toCanvas, activeDrawing, shapeStart, shapePreview,
      color, roughness, addElement, elements, groups,
      setSelectedId, setSelectedIds, setIsPanning,
      isDrawingRef, panStartRef, lassoStartRef, lassoRef,
      setActiveDrawing, setShapeStart, setShapePreview, setLasso,
    ]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    dragOverRef.current = true;
  }, [dragOverRef]);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      dragOverRef.current = false;
      const { x: rawDx, y: rawDy } = toCanvas(e.clientX, e.clientY);
      const { x, y } = snap(rawDx, rawDy);

      const files = Array.from(e.dataTransfer.files).filter((f) => f.type.startsWith('image/'));
      files.forEach((file) => {
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
            const pos = snap(x - w / 2, y - h / 2);
            const imgEl: Omit<ImageElement, 'id' | 'zIndex'> = {
              type: 'image', x: pos.x, y: pos.y, width: w, height: h,
              rotation: polaroidRotation(),
              dataUrl, caption: file.name.replace(/\.[^.]+$/, ''),
            };
            addElement(imgEl);
            setTool('select');
          };
          img.src = dataUrl;
        };
        reader.readAsDataURL(file);
      });
    },
    [toCanvas, snap, snapshot, addElement, setTool, dragOverRef]
  );

  return { handleMouseDown, handleMouseMove, handleMouseUp, handleDragOver, handleDrop };
}
