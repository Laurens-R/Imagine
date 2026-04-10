import React, { useRef } from 'react';
import { useWhiteboardStore, selectSortedElements } from '../../store/whiteboardStore';
import {
  FONT_OPTIONS, STICKY_COLORS, BRUSH_COLORS,
} from '../../types';
import type {
  DrawingElement, StickyNoteElement, TextBoxElement,
  ShapeElement, ImageElement, ArrowElement,
  FontFamily, StickyColor, ShapeType,
} from '../../types';
import styles from './PropertiesPanel.module.scss';

// ── Shape type options ────────────────────────────────────────────────────────

const SHAPE_TYPES: { value: ShapeType; label: string }[] = [
  { value: 'rectangle', label: 'Rectangle' },
  { value: 'square',    label: 'Square' },
  { value: 'circle',    label: 'Circle' },
  { value: 'ellipse',   label: 'Ellipse' },
  { value: 'triangle',  label: 'Triangle' },
  { value: 'diamond',   label: 'Diamond' },
  { value: 'star',      label: 'Star' },
  { value: 'arrow',     label: 'Arrow' },
];

// ── Shared tiny sub-components ────────────────────────────────────────────────

const Row: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div className={styles.row}>
    <span className={styles.rowLabel}>{label}</span>
    <div className={styles.rowControl}>{children}</div>
  </div>
);

interface SliderProps {
  min: number; max: number; step: number; value: number;
  onChange: (v: number) => void;
  onStart?: () => void;
  display?: string;
}
const Slider: React.FC<SliderProps> = ({ min, max, step, value, onChange, onStart, display }) => (
  <div className={styles.sliderWrap}>
    <input
      type="range" min={min} max={max} step={step} value={value}
      className={styles.slider}
      onPointerDown={onStart}
      onChange={(e) => onChange(Number(e.target.value))}
    />
    <span className={styles.sliderVal}>{display ?? value}</span>
  </div>
);

interface SwatchRowProps {
  colors: readonly string[];
  value: string;
  onChange: (c: string) => void;
  onStart?: () => void;
}
const SwatchRow: React.FC<SwatchRowProps> = ({ colors, value, onChange, onStart }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <div className={styles.swatchRow}>
      {colors.map((c) => (
        <button
          key={c}
          className={`${styles.swatch} ${value === c ? styles.swatchActive : ''}`}
          style={{ backgroundColor: c, borderColor: c === '#ffffff' ? 'rgba(255,255,255,0.3)' : undefined }}
          onPointerDown={onStart}
          onClick={() => onChange(c)}
          title={c}
        />
      ))}
      <button
        className={styles.swatchCustom}
        title="Custom color"
        onClick={() => inputRef.current?.click()}
        style={{ background: BRUSH_COLORS.includes(value) || STICKY_COLORS.includes(value as StickyColor) ? undefined : value }}
        onPointerDown={onStart}
      >
        <svg viewBox="0 0 12 12" fill="none">
          <circle cx="6" cy="6" r="5" stroke="currentColor" strokeWidth="1.2" />
          <path d="M6 3v6M3 6h6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
        </svg>
        <input
          ref={inputRef}
          type="color"
          value={value.startsWith('#') ? value : '#000000'}
          className={styles.hiddenColorInput}
          onPointerDown={onStart}
          onChange={(e) => onChange(e.target.value)}
        />
      </button>
    </div>
  );
};

// ── Per-type panels ───────────────────────────────────────────────────────────

const DrawingProps: React.FC<{ el: DrawingElement }> = ({ el }) => {
  const { updateElement, snapshot } = useWhiteboardStore();
  const snap = () => snapshot();
  return <>
    <Row label="Color">
      <SwatchRow colors={BRUSH_COLORS} value={el.color} onStart={snap} onChange={(c) => updateElement(el.id, { color: c })} />
    </Row>
    <Row label="Weight">
      <Slider min={2} max={32} step={1} value={el.size} onStart={snap}
        onChange={(v) => updateElement(el.id, { size: v })}
        display={`${el.size}px`} />
    </Row>
    <Row label="Opacity">
      <Slider min={0.1} max={1} step={0.05} value={el.opacity} onStart={snap}
        onChange={(v) => updateElement(el.id, { opacity: v })}
        display={`${Math.round(el.opacity * 100)}%`} />
    </Row>
  </>;
};

const StickyNoteProps: React.FC<{ el: StickyNoteElement }> = ({ el }) => {
  const { updateElement, snapshot } = useWhiteboardStore();
  const snap = () => snapshot();
  return <>
    <Row label="Color">
      <SwatchRow
        colors={STICKY_COLORS}
        value={el.backgroundColor}
        onStart={snap}
        onChange={(c) => updateElement(el.id, { backgroundColor: c as StickyColor })}
      />
    </Row>
    <Row label="Font">
      <select
        className={styles.select}
        value={el.font}
        style={{ fontFamily: el.font }}
        onFocus={snap}
        onChange={(e) => updateElement(el.id, { font: e.target.value as FontFamily })}
      >
        {FONT_OPTIONS.map((f) => (
          <option key={f.value} value={f.value} style={{ fontFamily: f.value }}>{f.label}</option>
        ))}
      </select>
    </Row>
    <Row label="Size">
      <Slider min={12} max={72} step={2} value={el.fontSize} onStart={snap}
        onChange={(v) => updateElement(el.id, { fontSize: v })}
        display={`${el.fontSize}px`} />
    </Row>
  </>;
};

const TextBoxProps: React.FC<{ el: TextBoxElement }> = ({ el }) => {
  const { updateElement, snapshot } = useWhiteboardStore();
  const snap = () => snapshot();
  return <>
    <Row label="Color">
      <SwatchRow colors={BRUSH_COLORS} value={el.color} onStart={snap}
        onChange={(c) => updateElement(el.id, { color: c })} />
    </Row>
    <Row label="Font">
      <select
        className={styles.select}
        value={el.font}
        style={{ fontFamily: el.font }}
        onFocus={snap}
        onChange={(e) => updateElement(el.id, { font: e.target.value as FontFamily })}
      >
        {FONT_OPTIONS.map((f) => (
          <option key={f.value} value={f.value} style={{ fontFamily: f.value }}>{f.label}</option>
        ))}
      </select>
    </Row>
    <Row label="Size">
      <Slider min={12} max={72} step={2} value={el.fontSize} onStart={snap}
        onChange={(v) => updateElement(el.id, { fontSize: v })}
        display={`${el.fontSize}px`} />
    </Row>
    <Row label="Style">
      <div className={styles.toggleGroup}>
        <button
          className={`${styles.toggleBtn} ${el.bold ? styles.toggleActive : ''}`}
          onPointerDown={snap}
          onClick={() => updateElement(el.id, { bold: !el.bold })}
          title="Bold"
        >
          <b>B</b>
        </button>
        <button
          className={`${styles.toggleBtn} ${el.italic ? styles.toggleActive : ''}`}
          onPointerDown={snap}
          onClick={() => updateElement(el.id, { italic: !el.italic })}
          title="Italic"
        >
          <i>I</i>
        </button>
      </div>
    </Row>
  </>;
};

const ShapeProps: React.FC<{ el: ShapeElement }> = ({ el }) => {
  const { updateElement, snapshot } = useWhiteboardStore();
  const snap = () => snapshot();
  return <>
    <Row label="Shape">
      <select
        className={styles.select}
        value={el.shapeType}
        onFocus={snap}
        onChange={(e) => updateElement(el.id, { shapeType: e.target.value as ShapeType })}
      >
        {SHAPE_TYPES.map((s) => (
          <option key={s.value} value={s.value}>{s.label}</option>
        ))}
      </select>
    </Row>
    <Row label="Fill">
      <SwatchRow colors={BRUSH_COLORS} value={el.fillColor} onStart={snap}
        onChange={(c) => updateElement(el.id, { fillColor: c })} />
    </Row>
    <Row label="Stroke">
      <SwatchRow colors={BRUSH_COLORS} value={el.strokeColor} onStart={snap}
        onChange={(c) => updateElement(el.id, { strokeColor: c })} />
    </Row>
    <Row label="Roughness">
      <Slider min={0} max={4} step={0.25} value={el.roughness} onStart={snap}
        onChange={(v) => updateElement(el.id, { roughness: v })}
        display={el.roughness.toFixed(1)} />
    </Row>
  </>;
};

const ImageProps: React.FC<{ el: ImageElement }> = ({ el }) => {
  const { updateElement, snapshot } = useWhiteboardStore();
  return (
    <Row label="Caption">
      <input
        type="text"
        className={styles.textInput}
        value={el.caption}
        onFocus={() => snapshot()}
        onChange={(e) => updateElement(el.id, { caption: e.target.value })}
        placeholder="Add caption…"
        maxLength={80}
      />
    </Row>
  );
};

const ArrowProps: React.FC<{ el: ArrowElement }> = ({ el }) => {
  const { updateElement, snapshot } = useWhiteboardStore();
  const snap = () => snapshot();
  return <>
    <Row label="Color">
      <SwatchRow colors={BRUSH_COLORS} value={el.color} onStart={snap}
        onChange={(c) => updateElement(el.id, { color: c })} />
    </Row>
    <Row label="Weight">
      <Slider min={2} max={32} step={1} value={el.strokeWidth} onStart={snap}
        onChange={(v) => updateElement(el.id, { strokeWidth: v })}
        display={`${el.strokeWidth}px`} />
    </Row>
  </>;
};

// ── Type label helpers ────────────────────────────────────────────────────────

const TYPE_LABELS: Record<string, string> = {
  'drawing':     'Drawing',
  'sticky-note': 'Sticky Note',
  'text-box':    'Text Box',
  'shape':       'Shape',
  'image':       'Image',
  'arrow':       'Arrow',
};

// ── Main panel ────────────────────────────────────────────────────────────────

export const PropertiesPanel: React.FC = () => {
  const elements        = useWhiteboardStore(selectSortedElements);
  const selectedId      = useWhiteboardStore((s) => s.selectedId);
  const tool            = useWhiteboardStore((s) => s.tool);
  const { removeElement, setSelectedId, snapshot, bringToFront, sendToBack } = useWhiteboardStore();

  const el = selectedId ? elements.find((e) => e.id === selectedId) ?? null : null;
  const visible = tool === 'select' && !!el;

  const handleDelete = () => {
    if (!el) return;
    snapshot();
    removeElement(el.id);
    setSelectedId(null);
  };

  return (
    <div
      className={`${styles.panel} ${visible ? styles.panelVisible : ''}`}
      onMouseDown={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
    >
      {el && (
        <>
          {/* Header */}
          <div className={styles.header}>
            <span className={styles.typeLabel}>{TYPE_LABELS[el.type] ?? el.type}</span>
            <button className={styles.deleteBtn} onClick={handleDelete} title="Delete element">
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                <path d="M2 4h12M6 4V2h4v2M5 4l.5 9h5L11 4" />
              </svg>
            </button>
          </div>

          <div className={styles.divider} />

          {/* Per-type properties */}
          {el.type === 'drawing'     && <DrawingProps    el={el} />}
          {el.type === 'sticky-note' && <StickyNoteProps el={el} />}
          {el.type === 'text-box'    && <TextBoxProps    el={el} />}
          {el.type === 'shape'       && <ShapeProps      el={el} />}
          {el.type === 'image'       && <ImageProps      el={el} />}
          {el.type === 'arrow'       && <ArrowProps      el={el} />}

          <div className={styles.divider} />

          {/* Layer controls */}
          <div className={styles.layerRow}>
            <button className={styles.layerBtn} onClick={() => bringToFront(el.id)} title="Bring to front">
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="5" y="5" width="8" height="8" rx="1" />
                <path d="M3 11V3h8" strokeDasharray="2 2" />
              </svg>
              <span>Front</span>
            </button>
            <button className={styles.layerBtn} onClick={() => sendToBack(el.id)} title="Send to back">
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="8" height="8" rx="1" />
                <path d="M6 11v2h7V5h-2" strokeDasharray="2 2" />
              </svg>
              <span>Back</span>
            </button>
          </div>
        </>
      )}
    </div>
  );
};
