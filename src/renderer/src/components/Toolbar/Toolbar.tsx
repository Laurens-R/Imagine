import React, { useState } from 'react';
import { useWhiteboardStore } from '../../store/whiteboardStore';
import type { ToolType, ShapeType, FontFamily, StickyColor } from '../../types';
import { FONT_OPTIONS, STICKY_COLORS, BRUSH_COLORS } from '../../types';
import styles from './Toolbar.module.scss';

// ── Icon components ─────────────────────────────────────────────────────────

const IconSelect = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
    <path d="M4 4l7 18 3-7 7-3L4 4z" strokeLinejoin="round" />
  </svg>
);
const IconSharpie = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
    <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25z" />
    <path d="M20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" />
  </svg>
);
const IconEraser = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
    <path d="M20 20H7L3 16l10.586-10.586a2 2 0 0 1 2.828 0L20 9a2 2 0 0 1 0 2.828L13 19" strokeLinecap="round" strokeLinejoin="round" />
    <line x1="6" y1="20" x2="20" y2="20" />
  </svg>
);
const IconStickyNote = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <path d="M15 3v6h6" />
    <line x1="8" y1="12" x2="16" y2="12" />
    <line x1="8" y1="16" x2="12" y2="16" />
  </svg>
);
const IconTextBox = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
    <rect x="2" y="5" width="20" height="14" rx="2" />
    <path d="M8 9h8M8 12h5" strokeLinecap="round" />
  </svg>
);
const IconShape = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
    <circle cx="12" cy="12" r="7" />
    <rect x="3" y="4" width="7" height="7" />
    <path d="M17 3l4 7h-8l4-7z" />
  </svg>
);
const IconConnection = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
    <circle cx="5" cy="5" r="2" fill="currentColor" />
    <circle cx="19" cy="19" r="2" fill="currentColor" />
    <path d="M5 7 Q9 14 19 17" strokeLinecap="round" />
  </svg>
);
const IconImage = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <circle cx="8.5" cy="8.5" r="1.5" />
    <path d="M21 15l-5-5L5 21" />
  </svg>
);
const IconArrow = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <line x1="5" y1="19" x2="19" y2="5" />
    <polyline points="9 5 19 5 19 15" />
  </svg>
);
const IconUndo = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 7v6h6" />
    <path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13" />
  </svg>
);
const IconRedo = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 7v6h-6" />
    <path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3L21 13" />
  </svg>
);
const IconTrash = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6l-1 14H6L5 6" />
    <path d="M10 11v6M14 11v6" />
    <path d="M9 6V4h6v2" />
  </svg>
);

// ── Shape icons ─────────────────────────────────────────────────────────────

const SHAPE_OPTIONS: { value: ShapeType; label: string; icon: React.ReactNode }[] = [
  {
    value: 'rectangle',
    label: 'Rectangle',
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><rect x="3" y="6" width="18" height="12" rx="1" /></svg>
  },
  {
    value: 'square',
    label: 'Square',
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><rect x="4" y="4" width="16" height="16" rx="1" /></svg>
  },
  {
    value: 'circle',
    label: 'Circle',
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><circle cx="12" cy="12" r="9" /></svg>
  },
  {
    value: 'ellipse',
    label: 'Ellipse',
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><ellipse cx="12" cy="12" rx="10" ry="6" /></svg>
  },
  {
    value: 'triangle',
    label: 'Triangle',
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M12 3 L21 21 H3 Z" /></svg>
  },
  {
    value: 'diamond',
    label: 'Diamond',
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M12 3 L21 12 L12 21 L3 12 Z" /></svg>
  },
  {
    value: 'star',
    label: 'Star',
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 21 12 17.77 5.82 21 7 14.14 2 9.27l6.91-1.01L12 2z" /></svg>
  },
  {
    value: 'arrow',
    label: 'Arrow',
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" /></svg>
  }
];

// ── Toolbar ─────────────────────────────────────────────────────────────────

export const Toolbar: React.FC = () => {
  const tool = useWhiteboardStore((s) => s.tool);
  const color = useWhiteboardStore((s) => s.color);
  const strokeWidth = useWhiteboardStore((s) => s.strokeWidth);
  const font = useWhiteboardStore((s) => s.font);
  const fontSize = useWhiteboardStore((s) => s.fontSize);
  const shapeType = useWhiteboardStore((s) => s.shapeType);
  const stickyColor = useWhiteboardStore((s) => s.stickyColor);
  const roughness = useWhiteboardStore((s) => s.roughness);
  const zoom = useWhiteboardStore((s) => s.zoom);
  const undoStack = useWhiteboardStore((s) => s.undoStack);
  const redoStack = useWhiteboardStore((s) => s.redoStack);

  const {
    setTool,
    setColor,
    setStrokeWidth,
    setFont,
    setFontSize,
    setShapeType,
    setStickyColor,
    setRoughness,
    setZoom,
    resetView,
    undo,
    redo,
    clearAll
  } = useWhiteboardStore();

  const [shapePanelOpen, setShapePanelOpen] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);

  const handleToolClick = (t: ToolType) => {
    if (t === 'shape') {
      setShapePanelOpen((prev) => tool === 'shape' ? !prev : true);
    } else {
      setShapePanelOpen(false);
    }
    setTool(t);
  };

  const handleClearAll = () => {
    if (confirmClear) {
      clearAll();
      setConfirmClear(false);
    } else {
      setConfirmClear(true);
      setTimeout(() => setConfirmClear(false), 2500);
    }
  };

  const tools: { id: ToolType; icon: React.ReactNode; label: string }[] = [
    { id: 'select', icon: <IconSelect />, label: 'Select (V)' },
    { id: 'sharpie', icon: <IconSharpie />, label: 'Sharpie (P)' },
    { id: 'eraser', icon: <IconEraser />, label: 'Eraser (E)' },
    { id: 'sticky-note', icon: <IconStickyNote />, label: 'Sticky Note (S)' },
    { id: 'text-box', icon: <IconTextBox />, label: 'Text Box (T)' },
    { id: 'shape', icon: <IconShape />, label: 'Shape (R)' },
    { id: 'arrow', icon: <IconArrow />, label: 'Arrow (A)' },
    { id: 'connection', icon: <IconConnection />, label: 'Connection (C)' },
    { id: 'image', icon: <IconImage />, label: 'Image (I)' }
  ];

  const showColorPicker = ['sharpie', 'shape', 'text-box', 'arrow'].includes(tool);
  const showSizeSlider = ['sharpie', 'arrow'].includes(tool);
  const showFontOptions = ['sticky-note', 'text-box'].includes(tool);
  const showStickyColors = tool === 'sticky-note';
  const showRoughnessSlider = tool === 'shape';

  return (
    <div className={styles.toolbar} onMouseDown={(e) => e.stopPropagation()}>
      {/* Shape sub-panel */}
      {shapePanelOpen && tool === 'shape' && (
        <div className={styles.shapePanel}>
          {SHAPE_OPTIONS.map((s) => (
            <button
              key={s.value}
              className={`${styles.shapeBtn} ${shapeType === s.value ? styles.active : ''}`}
              onClick={() => {
                setShapeType(s.value);
                setShapePanelOpen(false);
              }}
              title={s.label}
            >
              {s.icon}
              <span>{s.label}</span>
            </button>
          ))}
        </div>
      )}

      <div className={styles.toolbarInner}>
        {/* ── Left: Tool buttons ─────────────────────────────────────── */}
        <div className={styles.toolGroup}>
          {tools.map((t) => (
            <button
              key={t.id}
              className={`${styles.toolBtn} ${tool === t.id ? styles.active : ''}`}
              onClick={() => handleToolClick(t.id)}
              title={t.label}
            >
              {t.id === 'shape'
                ? SHAPE_OPTIONS.find((s) => s.value === shapeType)?.icon ?? t.icon
                : t.icon}
              {t.id === 'shape' && (
                <span className={styles.shapeIndicator} title="Click to change shape">▾</span>
              )}
            </button>
          ))}
        </div>

        <div className={styles.divider} />

        {/* ── Center: Context options ────────────────────────────────── */}
        <div className={styles.optionsGroup}>
          {/* Color palette */}
          {showColorPicker && (
            <div className={styles.colorPalette}>
              {BRUSH_COLORS.map((c) => (
                <button
                  key={c}
                  className={`${styles.colorSwatch} ${color === c ? styles.activeColor : ''}`}
                  style={{ backgroundColor: c, border: c === '#ffffff' ? '1px solid rgba(255,255,255,0.3)' : undefined }}
                  onClick={() => setColor(c)}
                  title={c}
                />
              ))}
              <input
                type="color"
                className={styles.colorInput}
                value={color}
                onChange={(e) => setColor(e.target.value)}
                title="Custom color"
              />
            </div>
          )}

          {/* Sticky note colors */}
          {showStickyColors && (
            <div className={styles.colorPalette}>
              {STICKY_COLORS.map((c) => (
                <button
                  key={c}
                  className={`${styles.colorSwatch} ${stickyColor === c ? styles.activeColor : ''}`}
                  style={{ backgroundColor: c, border: c === '#ffffff' ? '1px solid rgba(255,255,255,0.35)' : undefined }}
                  onClick={() => setStickyColor(c as StickyColor)}
                  title={c}
                />
              ))}
            </div>
          )}

          {/* Brush size */}
          {showSizeSlider && (
            <div className={styles.sliderGroup}>
              <label className={styles.sliderLabel}>Size</label>
              <input
                type="range"
                min={2}
                max={32}
                step={1}
                value={strokeWidth}
                onChange={(e) => setStrokeWidth(Number(e.target.value))}
                className={styles.slider}
              />
              <span className={styles.sliderValue}>{strokeWidth}px</span>
            </div>
          )}

          {/* Roughness */}
          {showRoughnessSlider && (
            <div className={styles.sliderGroup}>
              <label className={styles.sliderLabel}>Rough</label>
              <input
                type="range"
                min={0}
                max={4}
                step={0.25}
                value={roughness}
                onChange={(e) => setRoughness(Number(e.target.value))}
                className={styles.slider}
              />
              <span className={styles.sliderValue}>{roughness.toFixed(1)}</span>
            </div>
          )}

          {/* Font options */}
          {showFontOptions && (
            <>
              <div className={styles.selectWrapper}>
                <select
                  value={font}
                  onChange={(e) => setFont(e.target.value as FontFamily)}
                  className={styles.select}
                  style={{ fontFamily: font }}
                >
                  {FONT_OPTIONS.map((f) => (
                    <option key={f.value} value={f.value} style={{ fontFamily: f.value }}>
                      {f.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className={styles.sliderGroup}>
                <label className={styles.sliderLabel}>Size</label>
                <input
                  type="range"
                  min={12}
                  max={72}
                  step={2}
                  value={fontSize}
                  onChange={(e) => setFontSize(Number(e.target.value))}
                  className={styles.slider}
                />
                <span className={styles.sliderValue}>{fontSize}px</span>
              </div>
            </>
          )}
        </div>

        <div className={styles.divider} />

        {/* ── Right: Actions ─────────────────────────────────────────── */}
        <div className={styles.actionsGroup}>
          {/* Zoom indicator */}
          <div className={styles.zoomControls}>
            <button className={styles.zoomBtn} onClick={() => setZoom(zoom * 0.8)} title="Zoom out">−</button>
            <button className={styles.zoomLabel} onClick={resetView} title="Reset view">
              {Math.round(zoom * 100)}%
            </button>
            <button className={styles.zoomBtn} onClick={() => setZoom(zoom * 1.25)} title="Zoom in">+</button>
          </div>

          <div className={styles.divider} />

          <button
            className={styles.actionBtn}
            onClick={undo}
            disabled={undoStack.length === 0}
            title="Undo (Ctrl+Z)"
          >
            <IconUndo />
          </button>
          <button
            className={styles.actionBtn}
            onClick={redo}
            disabled={redoStack.length === 0}
            title="Redo (Ctrl+Y)"
          >
            <IconRedo />
          </button>

          <div className={styles.divider} />

          <button
            className={`${styles.actionBtn} ${confirmClear ? styles.danger : ''}`}
            onClick={handleClearAll}
            title={confirmClear ? 'Click again to confirm clear' : 'Clear all'}
          >
            <IconTrash />
          </button>
        </div>
      </div>
    </div>
  );
};
