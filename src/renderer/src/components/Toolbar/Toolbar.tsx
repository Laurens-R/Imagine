import React, { useState, useEffect } from 'react';
import { useWhiteboardStore } from '../../store/whiteboardStore';
import type { ToolType, ShapeType, FontFamily, StickyColor } from '../../types';
import { FONT_OPTIONS, STICKY_COLORS, BRUSH_COLORS } from '../../types';
import styles from './Toolbar.module.scss';
import { HelpDialog } from '../HelpDialog/HelpDialog';

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
const IconLine = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
    <line x1="5" y1="19" x2="19" y2="5" />
  </svg>
);
const IconGrid = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z" />
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

// ── Alignment icons ───────────────────────────────────────────────────────────

const IconAlignLeft = () => (
  <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round">
    <line x1="3" y1="3" x2="3" y2="17" />
    <rect x="3" y="4.5" width="12" height="4" rx="0.8" />
    <rect x="3" y="11.5" width="8" height="4" rx="0.8" />
  </svg>
);
const IconAlignRight = () => (
  <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round">
    <line x1="17" y1="3" x2="17" y2="17" />
    <rect x="5" y="4.5" width="12" height="4" rx="0.8" />
    <rect x="9" y="11.5" width="8" height="4" rx="0.8" />
  </svg>
);
const IconAlignCenterH = () => (
  <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round">
    <line x1="10" y1="3" x2="10" y2="17" />
    <rect x="3" y="4.5" width="14" height="4" rx="0.8" />
    <rect x="5" y="11.5" width="10" height="4" rx="0.8" />
  </svg>
);
const IconAlignTop = () => (
  <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round">
    <line x1="3" y1="3" x2="17" y2="3" />
    <rect x="4.5" y="3" width="4" height="12" rx="0.8" />
    <rect x="11.5" y="3" width="4" height="8" rx="0.8" />
  </svg>
);
const IconAlignCenterV = () => (
  <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round">
    <line x1="3" y1="10" x2="17" y2="10" />
    <rect x="4.5" y="4" width="4" height="12" rx="0.8" />
    <rect x="11.5" y="5" width="4" height="10" rx="0.8" />
  </svg>
);
const IconAlignBottom = () => (
  <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round">
    <line x1="3" y1="17" x2="17" y2="17" />
    <rect x="4.5" y="5" width="4" height="12" rx="0.8" />
    <rect x="11.5" y="9" width="4" height="8" rx="0.8" />
  </svg>
);
const IconDistributeH = () => (
  <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round">
    <line x1="3" y1="3" x2="3" y2="17" />
    <line x1="17" y1="3" x2="17" y2="17" />
    <rect x="7.5" y="6" width="5" height="8" rx="0.8" />
  </svg>
);
const IconDistributeV = () => (
  <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round">
    <line x1="3" y1="3" x2="17" y2="3" />
    <line x1="3" y1="17" x2="17" y2="17" />
    <rect x="6" y="7.5" width="8" height="5" rx="0.8" />
  </svg>
);
const IconGroup = () => (
  <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="5" width="6" height="6" rx="1" />
    <rect x="12" y="9" width="6" height="6" rx="1" />
    <rect x="1" y="1" width="18" height="18" rx="2.5" strokeDasharray="3 2" />
  </svg>
);
const IconUngroup = () => (
  <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="5" width="6" height="6" rx="1" />
    <rect x="12" y="9" width="6" height="6" rx="1" />
    <line x1="1" y1="1" x2="4" y2="1" />
    <line x1="16" y1="1" x2="19" y2="1" />
    <line x1="1" y1="19" x2="4" y2="19" />
    <line x1="16" y1="19" x2="19" y2="19" />
  </svg>
);
const IconResetRotation = () => (
  <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 10a6 6 0 1 0 1.5-3.9" />
    <polyline points="4 5.5 4 10 8.5 10" />
    <line x1="10" y1="10" x2="10" y2="6" strokeWidth={2} />
  </svg>
);
const IconBringToFront = () => (
  <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
    <rect x="7" y="9" width="10" height="9" rx="1" strokeOpacity="0.4" />
    <rect x="3" y="6" width="10" height="9" rx="1" />
    <polyline points="5.5 4 7.5 2 9.5 4" />
    <polyline points="5.5 6.2 7.5 4.2 9.5 6.2" />
  </svg>
);
const IconBringForward = () => (
  <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
    <rect x="7" y="9" width="10" height="9" rx="1" strokeOpacity="0.4" />
    <rect x="3" y="6" width="10" height="9" rx="1" />
    <polyline points="5.5 4 7.5 2 9.5 4" />
    <line x1="7.5" y1="2" x2="7.5" y2="6" />
  </svg>
);
const IconSendBackward = () => (
  <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="10" height="9" rx="1" strokeOpacity="0.4" />
    <rect x="7" y="6" width="10" height="9" rx="1" />
    <polyline points="10.5 14 12.5 16 14.5 14" />
    <line x1="12.5" y1="10" x2="12.5" y2="16" />
  </svg>
);
const IconSendToBack = () => (
  <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="10" height="9" rx="1" strokeOpacity="0.4" />
    <rect x="7" y="6" width="10" height="9" rx="1" />
    <polyline points="10.5 12 12.5 14 14.5 12" />
    <polyline points="10.5 14.5 12.5 16.5 14.5 14.5" />
  </svg>
);
const IconHelp = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
    <circle cx="12" cy="17" r="0.5" fill="currentColor" />
  </svg>
);
const IconAI = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2l1.5 4.5L18 8l-4.5 1.5L12 14l-1.5-4.5L6 8l4.5-1.5L12 2z" fill="currentColor" fillOpacity="0.15" />
    <path d="M19 14l.75 2.25L22 17l-2.25.75L19 20l-.75-2.25L16 17l2.25-.75L19 14z" fill="currentColor" fillOpacity="0.2" />
    <path d="M6 17l.5 1.5L8 19l-1.5.5L6 21l-.5-1.5L4 19l1.5-.5L6 17z" fill="currentColor" fillOpacity="0.2" />
  </svg>
);
const IconCreative = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 3a9 9 0 0 0 0 18" />
    <path d="M12 3a9 9 0 0 1 0 18" strokeDasharray="3 2" />
    <circle cx="12" cy="12" r="3" fill="currentColor" fillOpacity="0.15" />
    <path d="M12 8v1M12 15v1M8 12h1M15 12h1" />
  </svg>
);
const IconTray = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="18" height="14" rx="2" />
    <path d="M3 20h18" />
    <path d="M9 13l3 3 3-3" />
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

interface ToolbarProps {
  onAIAssistant?: () => void;
  settingsVersion?: number;
}

export const Toolbar: React.FC<ToolbarProps> = ({ onAIAssistant, settingsVersion }) => {
  const [hasApiKey, setHasApiKey] = useState(false);

  useEffect(() => {
    window.whiteboardApi.getSettings().then((s) => setHasApiKey(!!s.anthropicApiKey));
  }, [settingsVersion]);
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
  const selectedId = useWhiteboardStore((s) => s.selectedId);
  const selectedIds = useWhiteboardStore((s) => s.selectedIds);
  const groups = useWhiteboardStore((s) => s.groups);

  const gridEnabled = useWhiteboardStore((s) => s.gridEnabled);
  const gridSize = useWhiteboardStore((s) => s.gridSize);

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
    clearAll,
    setGridEnabled,
    setGridSize,
    alignSelected,
    distributeSelected,
    groupSelected,
    ungroupSelected,
    resetRotation,
    snapshot,
    bringAllToFront,
    bringForward,
    sendBackward,
    sendAllToBack,
    helpOpen,
    setHelpOpen,
    creativeMode,
    setCreativeMode,
  } = useWhiteboardStore();

  const [shapePanelOpen, setShapePanelOpen] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);

  // Open shape panel when the shape tool is activated via keyboard shortcut
  useEffect(() => {
    if (tool === 'shape') setShapePanelOpen(true);
    else setShapePanelOpen(false);
  }, [tool]);

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
    { id: 'line', icon: <IconLine />, label: 'Line (L)' },
    { id: 'connection', icon: <IconConnection />, label: 'Connection (C)' },
    { id: 'image', icon: <IconImage />, label: 'Image (I)' }
  ];

  const showColorPicker = ['sharpie', 'shape', 'text-box', 'arrow', 'line'].includes(tool);
  const showSizeSlider = ['sharpie', 'arrow', 'line'].includes(tool);
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

        {onAIAssistant && hasApiKey && (
          <button
            className={styles.actionBtn}
            onClick={onAIAssistant}
            title="AI Assistant"
          >
            <IconAI />
          </button>
        )}

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

          {/* Alignment / rotation: shown when one or more elements are selected */}
          {tool === 'select' && (() => {
            const hasGroup = selectedIds.some((id) => groups.some((g) => g.id === id));
            const hasAnySelection = selectedId !== null || selectedIds.length >= 1;
            if (!hasAnySelection) return null;
            const hasMulti = hasGroup || selectedIds.length >= 2;
            const canGroup = !hasGroup && selectedIds.length >= 2;
            const canUngroup = hasGroup;

            // Expand group IDs to physical element IDs for z-order operations
            const getPhysicalIds = () => {
              const topIds = selectedIds.length > 0 ? selectedIds : selectedId ? [selectedId] : [];
              const physical: string[] = [];
              for (const id of topIds) {
                const grp = groups.find((g) => g.id === id);
                if (grp) physical.push(...grp.childIds);
                else physical.push(id);
              }
              return physical;
            };

            return (
              <div className={styles.alignGroup}>
                {hasMulti && (
                  <>
                    <div className={styles.alignSubGroup}>
                      <button className={styles.alignBtn} onClick={() => alignSelected('left')} title="Align left"><IconAlignLeft /></button>
                      <button className={styles.alignBtn} onClick={() => alignSelected('center-h')} title="Align center (horizontal)"><IconAlignCenterH /></button>
                      <button className={styles.alignBtn} onClick={() => alignSelected('right')} title="Align right"><IconAlignRight /></button>
                    </div>
                    <div className={styles.alignSubGroup}>
                      <button className={styles.alignBtn} onClick={() => alignSelected('top')} title="Align top"><IconAlignTop /></button>
                      <button className={styles.alignBtn} onClick={() => alignSelected('center-v')} title="Align middle (vertical)"><IconAlignCenterV /></button>
                      <button className={styles.alignBtn} onClick={() => alignSelected('bottom')} title="Align bottom"><IconAlignBottom /></button>
                    </div>
                    <div className={styles.alignSubGroup}>
                      <button className={styles.alignBtn} onClick={() => distributeSelected('horizontal')} title="Distribute horizontally" disabled={selectedIds.length < 3}><IconDistributeH /></button>
                      <button className={styles.alignBtn} onClick={() => distributeSelected('vertical')} title="Distribute vertically" disabled={selectedIds.length < 3}><IconDistributeV /></button>
                    </div>
                  </>
                )}
                <div className={styles.alignSubGroup}>
                  <button className={styles.alignBtn} onClick={() => { snapshot(); bringAllToFront(getPhysicalIds()); }} title="Bring to front"><IconBringToFront /></button>
                  <button className={styles.alignBtn} onClick={() => { snapshot(); bringForward(getPhysicalIds()); }} title="Bring forward"><IconBringForward /></button>
                  <button className={styles.alignBtn} onClick={() => { snapshot(); sendBackward(getPhysicalIds()); }} title="Send backward"><IconSendBackward /></button>
                  <button className={styles.alignBtn} onClick={() => { snapshot(); sendAllToBack(getPhysicalIds()); }} title="Send to back"><IconSendToBack /></button>
                </div>
                <div className={styles.alignSubGroup}>
                  <button className={styles.alignBtn} onClick={resetRotation} title="Reset rotation"><IconResetRotation /></button>
                  {canGroup && <button className={styles.alignBtn} onClick={groupSelected} title="Group (Ctrl+G)"><IconGroup /></button>}
                  {canUngroup && <button className={styles.alignBtn} onClick={ungroupSelected} title="Ungroup"><IconUngroup /></button>}
                </div>
              </div>
            );
          })()}
        </div>

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

          {/* Creative Board toggle */}
          <button
            className={`${styles.actionBtn} ${creativeMode ? styles.activeBtn : ''}`}
            onClick={() => setCreativeMode(!creativeMode)}
            title={creativeMode ? 'Creative Board: ON' : 'Creative Board: OFF'}
          >
            <IconCreative />
          </button>

          <div className={styles.divider} />

          {/* Grid toggle */}
          <button
            className={`${styles.actionBtn} ${gridEnabled ? styles.activeBtn : ''}`}
            onClick={() => setGridEnabled(!gridEnabled)}
            title={gridEnabled ? 'Snap to Grid: ON' : 'Snap to Grid: OFF'}
          >
            <IconGrid />
          </button>

          {/* Grid size (shown when grid is on) */}
          {gridEnabled && (
            <div className={styles.gridSizeControl}>
              <input
                type="range"
                min={8}
                max={80}
                step={4}
                value={gridSize}
                onChange={(e) => setGridSize(Number(e.target.value))}
                className={styles.gridSlider}
                title={`Grid size: ${gridSize}px`}
              />
              <span className={styles.gridSizeLabel}>{gridSize}</span>
            </div>
          )}

          <div className={styles.divider} />

          <button
            className={styles.actionBtn}
            onClick={() => window.whiteboardApi.hideToTray()}
            title="Minimize to system tray (Ctrl+Shift+Space to restore)"
          >
            <IconTray />
          </button>

          <div className={styles.divider} />

          <button
            className={styles.actionBtn}
            onClick={() => setHelpOpen(true)}
            title="Keyboard shortcuts"
          >
            <IconHelp />
          </button>
        </div>
      </div>
      {helpOpen && <HelpDialog onClose={() => setHelpOpen(false)} />}
    </div>
  );
};
