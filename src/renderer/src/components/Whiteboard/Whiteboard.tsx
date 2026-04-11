import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useWhiteboardStore, selectSortedElements } from '../../store/whiteboardStore';
import { generateDrawingPath } from '../../utils/drawing';
import { screenToCanvas, getElementCenter, polaroidRotation } from '../../utils/helpers';
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
import { IconEl } from '../elements/IconElement/IconElement';
import { EmojiElement as EmojiEl } from '../elements/EmojiElement/EmojiElement';
import type {
  ActiveDrawing, ShapePreview, WhiteboardElement, DrawingElement,
  StickyNoteElement, TextBoxElement, ArrowElement, ImageElement, IconElement, EmojiElement,
} from '../../types';
import { ICON_DEFS_MAP } from '../../utils/iconData';
import { DrawingPath } from './DrawingPath';
import { PreviewShape } from './PreviewShape';
import { PendingConnectionLine } from './PendingConnectionLine';
import { MultiSelectOverlay } from './MultiSelectOverlay';
import { useWheelZoom } from './useWheelZoom';
import { usePersistence } from './usePersistence';
import { useClipboard, clipboardHasItems } from './useClipboard';
import { useKeyboardShortcuts } from './useKeyboardShortcuts';
import { useMouseHandlers } from './useMouseHandlers';
import type { LassoRect } from './whiteboardHelpers';
import styles from './Whiteboard.module.scss';

export const Whiteboard: React.FC<{
  showExportDialog?: boolean;
  onCloseExportDialog?: () => void;
  onAIAssistant?: () => void;
  onSettings?: () => void;
  settingsVersion?: number;
}> = ({ showExportDialog = false, onCloseExportDialog, onAIAssistant, onSettings, settingsVersion }) => {
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
  const stickyColor = useWhiteboardStore((s) => s.stickyColor);
  const zoom = useWhiteboardStore((s) => s.zoom);
  const pan = useWhiteboardStore((s) => s.pan);
  const selectedIconId = useWhiteboardStore((s) => s.selectedIconId);
  const selectedEmoji = useWhiteboardStore((s) => s.selectedEmoji);
  const pendingConnection = useWhiteboardStore((s) => s.pendingConnection);
  const canvasWidth = useWhiteboardStore((s) => s.canvasWidth);
  const canvasHeight = useWhiteboardStore((s) => s.canvasHeight);
  const gridEnabled = useWhiteboardStore((s) => s.gridEnabled);
  const gridSize = useWhiteboardStore((s) => s.gridSize);
  const creativeMode = useWhiteboardStore((s) => s.creativeMode);
  const groups = useWhiteboardStore((s) => s.groups);

  const {
    setSelectedId, setSelectedIds, setSelectedConnectionId,
    snapshot, addElement, removeElement, updateElement,
    addConnection, setPendingConnection,
    bringAllToFront, bringForward, sendBackward, sendAllToBack,
  } = useWhiteboardStore();

  // ── Local interaction state ────────────────────────────────────────────────
  const [activeDrawing, setActiveDrawing] = useState<ActiveDrawing | null>(null);
  const [shapePreview, setShapePreview] = useState<ShapePreview | null>(null);
  const [shapeStart, setShapeStart] = useState<{ x: number; y: number } | null>(null);
  const [isSpaceDown, setIsSpaceDown] = useState(false);
  const [isPanning, setIsPanning] = useState(false);
  const panStartRef = useRef<{ mx: number; my: number; px: number; py: number } | null>(null);
  const isDrawingRef = useRef(false);
  const dragOverRef = useRef(false);
  const lassoStartRef = useRef<{ x: number; y: number } | null>(null);
  const lassoRef = useRef<LassoRect | null>(null);
  const [lasso, setLasso] = useState<LassoRect | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pendingImagePos = useRef<{ x: number; y: number } | null>(null);
  const [arrowStart, setArrowStart] = useState<{ x: number; y: number } | null>(null);
  const [arrowPreview, setArrowPreview] = useState<{ x: number; y: number } | null>(null);
  const [cursorCanvas, setCursorCanvas] = useState<{ x: number; y: number } | null>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; canvasX: number; canvasY: number } | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  // ── Coordinate helpers ─────────────────────────────────────────────────────
  const toCanvas = useCallback(
    (clientX: number, clientY: number) => {
      if (!containerRef.current) return { x: 0, y: 0 };
      return screenToCanvas(clientX, clientY, containerRef.current.getBoundingClientRect(), pan, zoom);
    },
    [pan, zoom]
  );

  const snap = useCallback(
    (x: number, y: number) => ({
      x: gridEnabled ? snapVal(x, gridSize) : x,
      y: gridEnabled ? snapVal(y, gridSize) : y,
    }),
    [gridEnabled, gridSize]
  );

  // ── Export ─────────────────────────────────────────────────────────────────
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
    [elements, gridEnabled, gridSize, onCloseExportDialog]
  );

  // ── Element click (promotes to group if applicable) ────────────────────────
  const handleElementClick = useCallback(
    (elementId: string, ctrlKey?: boolean) => {
      if (tool !== 'select') return;
      const grp = groups.find((g) => g.childIds.includes(elementId));
      const targetId = grp ? grp.id : elementId;
      if (!ctrlKey) {
        if (grp) setSelectedIds([grp.id]);
        else setSelectedId(elementId);
        return;
      }
      // Ctrl+click: toggle targetId in multi-selection
      const current = selectedIds.length > 0 ? selectedIds : selectedId ? [selectedId] : [];
      if (current.includes(targetId)) {
        const next = current.filter((id) => id !== targetId);
        if (next.length === 1) setSelectedId(next[0]);
        else if (next.length === 0) setSelectedId(null);
        else setSelectedIds(next);
      } else {
        setSelectedIds([...current, targetId]);
      }
    },
    [tool, groups, selectedId, selectedIds, setSelectedId, setSelectedIds]
  );

  // ── Hooks ──────────────────────────────────────────────────────────────────
  const { handleCopy, handlePaste } = useClipboard(elements);

  useWheelZoom(containerRef);
  usePersistence();

  useKeyboardShortcuts({
    handleCopy, handlePaste,
    setIsSpaceDown,
    setShapePreview, setShapeStart, setArrowStart, setArrowPreview,
    setCursorCanvas, setActiveDrawing, setLasso,
    isDrawingRef, lassoStartRef, lassoRef,
  });

  const { handleMouseDown, handleMouseMove, handleMouseUp, handleDragOver, handleDrop } = useMouseHandlers({
    containerRef, svgRef, toCanvas, snap,
    isSpaceDown, isPanning, setIsPanning, panStartRef,
    activeDrawing, setActiveDrawing,
    shapeStart, setShapeStart, shapePreview, setShapePreview,
    arrowStart, setArrowStart, setArrowPreview,
    setCursorCanvas,
    isDrawingRef, dragOverRef,
    lassoStartRef, lassoRef, setLasso,
    fileInputRef, pendingImagePos,
  });

  // Prevent Electron navigating on file drag-drop
  useEffect(() => {
    const prevent = (e: DragEvent) => e.preventDefault();
    window.addEventListener('dragover', prevent);
    window.addEventListener('drop', prevent);
    return () => {
      window.removeEventListener('dragover', prevent);
      window.removeEventListener('drop', prevent);
    };
  }, []);

  // ── Context menu ───────────────────────────────────────────────────────────
  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const { x: cx, y: cy } = toCanvas(e.clientX, e.clientY);
    setContextMenu({ x: e.clientX, y: e.clientY, canvasX: cx, canvasY: cy });
  }, [toCanvas]);

  // ── Derived state ──────────────────────────────────────────────────────────
  const drawings = elements.filter((el) => el.type === 'drawing') as DrawingElement[];
  const shapes = elements.filter((el) => el.type === 'shape');
  const arrows = elements.filter((el) => el.type === 'arrow') as ArrowElement[];
  const icons = elements.filter((el) => el.type === 'icon') as IconElement[];
  const htmlEls = elements.filter((el) =>
    el.type === 'sticky-note' || el.type === 'text-box' || el.type === 'image' || el.type === 'emoji'
  );

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

  const viewportStyle: React.CSSProperties = {
    transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
    transformOrigin: '0 0',
    width: canvasWidth,
    height: canvasHeight,
  };

  const getCursor = () => {
    if (lasso) return 'crosshair';
    if (isSpaceDown || isPanning) return 'grabbing';
    switch (tool) {
      case 'sharpie':    return 'crosshair';
      case 'eraser':     return 'cell';
      case 'shape':      return 'crosshair';
      case 'sticky-note': return 'copy';
      case 'text-box':   return 'text';
      case 'connection': return 'crosshair';
      case 'image':      return 'copy';
      case 'arrow':      return 'crosshair';
      case 'line':       return 'crosshair';
      case 'icon':       return selectedIconId ? 'copy' : 'default';
      case 'emoji':      return selectedEmoji ? 'copy' : 'default';
      default:           return 'default';
    }
  };

  const lassoScreenRect = lasso
    ? {
        left:   Math.min(lasso.startX, lasso.currentX) * zoom + pan.x,
        top:    Math.min(lasso.startY, lasso.currentY) * zoom + pan.y,
        width:  Math.abs(lasso.currentX - lasso.startX) * zoom,
        height: Math.abs(lasso.currentY - lasso.startY) * zoom,
      }
    : null;

  // Shared connection callbacks for HTML elements
  const makeConnectionHandlers = (el: WhiteboardElement) => ({
    onStartConnection: () => {
      const center = getElementCenter(el);
      setPendingConnection({ sourceId: el.id, sourceX: center.x, sourceY: center.y, currentX: center.x, currentY: center.y });
    },
    onCompleteConnection: () => {
      if (pendingConnection && pendingConnection.sourceId !== el.id) {
        snapshot();
        addConnection(pendingConnection.sourceId, el.id);
        setPendingConnection(null);
      }
    },
  });

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div
      ref={containerRef}
      data-whiteboard-container
      className={`${styles.whiteboard}${creativeMode ? ` ${styles.creative}` : ''}`}
      style={{ cursor: getCursor() }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={(e) => { handleMouseUp(e); setCursorCanvas(null); }}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onContextMenu={handleContextMenu}
    >
      {/* ── Viewport (pan/zoom container) ─────────────────────────────────── */}
      <div className={styles.viewport} style={viewportStyle}>

        {/* Group borders */}
        {groups.map((grp) => {
          const children = elements.filter((el) => grp.childIds.includes(el.id));
          if (children.length === 0) return null;
          const boxes = children.map((el) => {
            const hasBox = 'width' in el && 'height' in el;
            return {
              x: el.x,
              y: el.y,
              w: hasBox ? (el as any).width  : 1,
              h: hasBox ? (el as any).height : 1,
            };
          });
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

        {/* SVG layer: drawings, shapes, arrows, connections */}
        <svg
          ref={svgRef}
          className={styles.svgLayer}
          width={canvasWidth}
          height={canvasHeight}
          style={{
            pointerEvents: (tool === 'select' || tool === 'connection' || tool === 'arrow' || tool === 'line' || tool === 'icon') ? 'all' : 'none',
          }}
        >
          {gridEnabled && (
            <>
              <defs>
                <pattern id="whiteboard-grid" x="0" y="0" width={gridSize} height={gridSize} patternUnits="userSpaceOnUse">
                  <circle cx={gridSize / 2} cy={gridSize / 2} r={1} fill={creativeMode ? 'rgba(180,170,255,0.2)' : 'rgba(150,140,200,0.25)'} />
                </pattern>
              </defs>
              <rect x={0} y={0} width={canvasWidth} height={canvasHeight} fill="url(#whiteboard-grid)" />
            </>
          )}

          {drawings.map((el) => (
            <DrawingPath
              key={el.id}
              element={el}
              isSelected={selectedElementIds.has(el.id)}
              tool={tool}
              zoom={zoom}
              pan={pan}
              onSelect={(ctrlKey) => handleElementClick(el.id, ctrlKey)}
              onUpdate={(updates) => updateElement(el.id, updates as Partial<WhiteboardElement>)}
            />
          ))}

          {activeDrawing && (
            <path
              d={generateDrawingPath(activeDrawing.points, activeDrawing.size)}
              fill={activeDrawing.color}
              opacity={activeDrawing.opacity}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {shapes.map((el) => (
            <ShapeEl
              key={el.id}
              element={el as any}
              isSelected={selectedElementIds.has(el.id)}
              tool={tool}
              onSelect={(ctrlKey) => handleElementClick(el.id, ctrlKey)}
              onUpdate={(updates) => updateElement(el.id, updates)}
              {...makeConnectionHandlers(el)}
            />
          ))}

          {shapePreview && shapePreview.width > 2 && shapePreview.height > 2 && (
            <PreviewShape preview={shapePreview} />
          )}

          {arrows.map((el) => (
            <ArrowEl
              key={el.id}
              element={el}
              isSelected={selectedElementIds.has(el.id)}
              tool={tool}
              onSelect={(ctrlKey) => handleElementClick(el.id, ctrlKey)}
              onUpdate={(updates) => updateElement(el.id, updates)}
            />
          ))}

          {icons.map((el) => (
            <IconEl
              key={el.id}
              element={el}
              isSelected={selectedElementIds.has(el.id)}
              tool={tool}
              onSelect={(ctrlKey) => handleElementClick(el.id, ctrlKey)}
              onUpdate={(updates) => updateElement(el.id, updates as Partial<IconElement>)}
              {...makeConnectionHandlers(el)}
            />
          ))}

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
                onClick={() => { if (tool === 'select') setSelectedConnectionId(conn.id); }}
              />
            );
          })}

          {pendingConnection && <PendingConnectionLine pending={pendingConnection} />}
        </svg>

        {/* HTML overlay: sticky notes, text boxes, images */}
        <div className={styles.elementsOverlay}>
          {htmlEls.map((el) => {
            const connHandlers = makeConnectionHandlers(el);
            const commonProps = {
              isSelected: selectedElementIds.has(el.id),
              tool,
              onSelect: (ctrlKey?: boolean) => handleElementClick(el.id, ctrlKey),
              onUpdate: (updates: any) => updateElement(el.id, updates),
              onDelete: () => { snapshot(); removeElement(el.id); },
              ...connHandlers,
            };
            if (el.type === 'sticky-note') return <StickyNote key={el.id} element={el as StickyNoteElement} {...commonProps} />;
            if (el.type === 'text-box')   return <TextBox   key={el.id} element={el as TextBoxElement}   {...commonProps} />;
            if (el.type === 'image')      return <ImageEl   key={el.id} element={el as ImageElement}     {...commonProps} />;
            if (el.type === 'emoji')      return <EmojiEl   key={el.id} element={el as EmojiElement}     {...commonProps} />;
            return null;
          })}
        </div>

        {/* Sticky-note cursor preview */}
        {tool === 'sticky-note' && cursorCanvas && (
          <div style={{
            position: 'absolute', left: cursorCanvas.x - 100, top: cursorCanvas.y - 60,
            width: 200, height: 180, backgroundColor: stickyColor,
            opacity: 0.45, borderRadius: 6, pointerEvents: 'none',
            boxShadow: '2px 2px 6px rgba(0,0,0,0.15)',
          }} />
        )}

        {/* Text-box cursor preview */}
        {tool === 'text-box' && cursorCanvas && (
          <div style={{
            position: 'absolute', left: cursorCanvas.x - 120, top: cursorCanvas.y - 30,
            width: 240, height: 60,
            border: '2px dashed rgba(124,106,255,0.55)',
            backgroundColor: 'rgba(124,106,255,0.08)',
            borderRadius: 4, pointerEvents: 'none',
          }} />
        )}

        {/* Icon cursor preview */}
        {tool === 'icon' && cursorCanvas && selectedIconId && (() => {
          const iconDef = ICON_DEFS_MAP[selectedIconId];
          if (!iconDef) return null;
          const size = 64;
          return (
            <div style={{
              position: 'absolute',
              left: cursorCanvas.x - size / 2,
              top: cursorCanvas.y - size / 2,
              width: size, height: size,
              opacity: 0.45,
              pointerEvents: 'none',
            }}>
              <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
                stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                {iconDef.paths.map((d, i) => <path key={i} d={d} />)}
              </svg>
            </div>
          );
        })()}

        {/* Emoji cursor preview */}
        {tool === 'emoji' && cursorCanvas && selectedEmoji && (() => {
          const size = 80;
          return (
            <div style={{
              position: 'absolute',
              left: cursorCanvas.x - size / 2,
              top: cursorCanvas.y - size / 2,
              width: size, height: size,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              opacity: 0.55,
              pointerEvents: 'none',
              fontSize: size * 0.75,
              lineHeight: 1,
            }}>
              {selectedEmoji}
            </div>
          );
        })()}
      </div>

      <Toolbar onAIAssistant={onAIAssistant} settingsVersion={settingsVersion} />

      {/* Hidden file input for image insertion */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          e.target.value = '';
          const pos = pendingImagePos.current ?? { x: canvasWidth / 2, y: canvasHeight / 2 };
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
              addElement({
                type: 'image',
                x: pos.x - w / 2, y: pos.y - h / 2,
                width: w, height: h,
                rotation: polaroidRotation(),
                dataUrl,
                caption: file.name.replace(/\.[^.]+$/, ''),
              } as Omit<ImageElement, 'id' | 'zIndex'>);
              useWhiteboardStore.getState().setTool('select');
            };
            img.src = dataUrl;
          };
          reader.readAsDataURL(file);
        }}
      />

      <MultiSelectOverlay />

      {/* Lasso selection rectangle */}
      {lassoScreenRect && (
        <div
          className={styles.lassoRect}
          style={{
            left: lassoScreenRect.left, top: lassoScreenRect.top,
            width: lassoScreenRect.width, height: lassoScreenRect.height,
          }}
        />
      )}

      <PropertiesPanel />

      {/* Context menu */}
      {contextMenu && (() => {
        const { selectedId: sid, selectedIds: sids, groups: ctxGroups } = useWhiteboardStore.getState();
        const ids = sids.length > 0 ? sids : sid ? [sid] : [];
        const physicalIds = new Set<string>();
        for (const id of ids) {
          const grp = ctxGroups.find((g) => g.id === id);
          if (grp) grp.childIds.forEach((cid) => physicalIds.add(cid));
          else physicalIds.add(id);
        }
        const selectedEls = elements.filter((el) => physicalIds.has(el.id));
        const hasSelection = selectedEls.length > 0 || ids.length > 0;
        const pids = [...physicalIds];
        const menuItems: ContextMenuEntry[] = [
          { label: 'Cut',       shortcut: 'Ctrl+X', disabled: !hasSelection,        onClick: () => handleCopy(true) },
          { label: 'Copy',      shortcut: 'Ctrl+C', disabled: !hasSelection,        onClick: () => handleCopy(false) },
          { label: 'Duplicate', shortcut: 'Ctrl+D', disabled: !hasSelection,        onClick: () => { handleCopy(false); handlePaste(); } },
          { label: 'Paste',     shortcut: 'Ctrl+V', disabled: !clipboardHasItems(), onClick: () => handlePaste(contextMenu.canvasX, contextMenu.canvasY) },
          { separator: true },
          { label: 'Bring to Front',  disabled: !hasSelection, onClick: () => { snapshot(); bringAllToFront(pids); } },
          { label: 'Bring Forward',   disabled: !hasSelection, onClick: () => { snapshot(); bringForward(pids); } },
          { label: 'Send Backward',   disabled: !hasSelection, onClick: () => { snapshot(); sendBackward(pids); } },
          { label: 'Send to Back',    disabled: !hasSelection, onClick: () => { snapshot(); sendAllToBack(pids); } },
          { separator: true },
          { label: 'Delete', shortcut: 'Del', disabled: !hasSelection, danger: true,
            onClick: () => { if (selectedEls.length > 0) { snapshot(); selectedEls.forEach((el) => removeElement(el.id)); } } },
        ];
        return (
          <ContextMenu
            x={contextMenu.x} y={contextMenu.y}
            items={menuItems}
            onClose={() => setContextMenu(null)}
          />
        );
      })()}

      {/* Export dialog */}
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