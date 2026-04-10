import type { WhiteboardElement, StickyNoteElement, TextBoxElement, ImageElement } from '../types';

export type ExportFormat = 'png' | 'jpeg';
export type ExportScaleLabel = 'small' | 'medium' | 'large';

export const EXPORT_SCALE_OPTIONS: { label: string; id: ExportScaleLabel; value: number; desc: string }[] = [
  { label: 'Small',  id: 'small',  value: 1, desc: '1×' },
  { label: 'Medium', id: 'medium', value: 2, desc: '2×' },
  { label: 'Large',  id: 'large',  value: 3, desc: '3×' },
];

const PADDING = 48;

// ── Bounding box helpers ──────────────────────────────────────────────────────

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

export function computeContentBounds(
  elements: WhiteboardElement[]
): { x: number; y: number; w: number; h: number } {
  if (elements.length === 0) return { x: 0, y: 0, w: 800, h: 600 };

  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const el of elements) {
    const b = getElementBounds(el);
    if (b.x < minX) minX = b.x;
    if (b.y < minY) minY = b.y;
    if (b.x + b.w > maxX) maxX = b.x + b.w;
    if (b.y + b.h > maxY) maxY = b.y + b.h;
  }

  return {
    x: minX - PADDING,
    y: minY - PADDING,
    w: maxX - minX + PADDING * 2,
    h: maxY - minY + PADDING * 2,
  };
}

// ── Canvas helpers ────────────────────────────────────────────────────────────

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number, r: number
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number, y: number,
  maxWidth: number,
  lineHeight: number
) {
  const paragraphs = text.split('\n');
  let curY = y;
  for (const para of paragraphs) {
    const words = para.split(' ');
    let line = '';
    for (const word of words) {
      const test = line ? `${line} ${word}` : word;
      if (ctx.measureText(test).width > maxWidth && line) {
        ctx.fillText(line, x, curY);
        line = word;
        curY += lineHeight;
      } else {
        line = test;
      }
    }
    ctx.fillText(line, x, curY);
    curY += lineHeight;
  }
}

// ── Drawing HTML-layer elements onto canvas ───────────────────────────────────

async function drawHTMLElements(
  ctx: CanvasRenderingContext2D,
  elements: WhiteboardElement[],
  offsetX: number,
  offsetY: number,
  scale: number
) {
  const htmlEls = elements.filter(
    (el) => el.type === 'sticky-note' || el.type === 'text-box' || el.type === 'image'
  );

  for (const el of htmlEls) {
    ctx.save();

    const ex = (el.x - offsetX) * scale;
    const ey = (el.y - offsetY) * scale;
    const ew = ('width' in el ? (el as { width: number }).width : 0) * scale;
    const eh = ('height' in el ? (el as { height: number }).height : 0) * scale;

    // Rotate around element center
    const cx = ex + ew / 2;
    const cy = ey + eh / 2;
    ctx.translate(cx, cy);
    ctx.rotate((el.rotation * Math.PI) / 180);
    ctx.translate(-cx, -cy);

    if (el.type === 'sticky-note') {
      const note = el as StickyNoteElement;

      // Shadow
      ctx.shadowColor = 'rgba(0,0,0,0.18)';
      ctx.shadowBlur = 14 * scale;
      ctx.shadowOffsetX = 3 * scale;
      ctx.shadowOffsetY = 6 * scale;

      // Background
      ctx.fillStyle = note.backgroundColor;
      drawRoundedRect(ctx, ex, ey, ew, eh, 8 * scale);
      ctx.fill();
      ctx.shadowColor = 'transparent';

      // Text
      const fSize = note.fontSize * scale;
      ctx.fillStyle = '#1a1a2e';
      ctx.font = `${fSize}px "${note.font}", cursive`;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      const pad = 14 * scale;
      wrapText(ctx, note.text, ex + pad, ey + pad, ew - pad * 2, fSize * 1.45);
    } else if (el.type === 'text-box') {
      const tb = el as TextBoxElement;
      const fSize = tb.fontSize * scale;
      let fontStr = '';
      if (tb.italic) fontStr += 'italic ';
      if (tb.bold) fontStr += 'bold ';
      fontStr += `${fSize}px "${tb.font}", cursive`;

      ctx.fillStyle = tb.color;
      ctx.font = fontStr;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      wrapText(ctx, tb.text, ex, ey, ew, fSize * 1.45);
    } else if (el.type === 'image') {
      const imgEl = el as ImageElement;
      const framePad = 8 * scale;
      const captionAreaH = 32 * scale;

      // Shadow
      ctx.shadowColor = 'rgba(0,0,0,0.22)';
      ctx.shadowBlur = 18 * scale;
      ctx.shadowOffsetX = 4 * scale;
      ctx.shadowOffsetY = 8 * scale;

      // Polaroid frame
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(ex, ey, ew, eh);
      ctx.shadowColor = 'transparent';

      // Photo area
      try {
        const img = await loadImage(imgEl.dataUrl);
        const imgX = ex + framePad;
        const imgY = ey + framePad;
        const imgW = ew - framePad * 2;
        const imgH = eh - framePad * 2 - captionAreaH;
        ctx.drawImage(img, imgX, imgY, imgW, imgH);
      } catch {
        // Image failed to load – draw placeholder
        ctx.fillStyle = '#e0e0e0';
        ctx.fillRect(ex + framePad, ey + framePad, ew - framePad * 2, eh - framePad * 2 - captionAreaH);
      }

      // Caption
      if (imgEl.caption) {
        const fSize = 13 * scale;
        ctx.fillStyle = '#555555';
        ctx.font = `${fSize}px "Caveat", cursive`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const capY = ey + eh - captionAreaH / 2 - framePad * 0.5;
        ctx.fillText(imgEl.caption, ex + ew / 2, capY, ew - framePad * 2);
      }
    }

    ctx.restore();
  }
}

// ── SVG serialization ─────────────────────────────────────────────────────────

function serializeSvg(svg: SVGSVGElement): string {
  const clone = svg.cloneNode(true) as SVGSVGElement;
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  clone.setAttribute('xmlns:xlink', 'http://www.w3.org/1999/xlink');
  return new XMLSerializer().serializeToString(clone);
}

// ── Main export function ──────────────────────────────────────────────────────

export async function renderToCanvas(
  elements: WhiteboardElement[],
  svgElement: SVGSVGElement,
  gridEnabled: boolean,
  gridSize: number,
  scale: number
): Promise<HTMLCanvasElement> {
  const bounds = computeContentBounds(elements);
  const pixelW = Math.ceil(bounds.w * scale);
  const pixelH = Math.ceil(bounds.h * scale);

  const canvas = document.createElement('canvas');
  canvas.width = pixelW;
  canvas.height = pixelH;
  const ctx = canvas.getContext('2d')!;

  // ── Background ──────────────────────────────────────────────────────────────
  ctx.fillStyle = '#fafaf8';
  ctx.fillRect(0, 0, pixelW, pixelH);

  // ── Dot grid ────────────────────────────────────────────────────────────────
  if (gridEnabled) {
    ctx.fillStyle = 'rgba(150,140,200,0.25)';
    const dotR = Math.max(1, scale * 0.9);
    // Align dot origin to grid
    const startX = ((bounds.x % gridSize) + gridSize) % gridSize;
    const startY = ((bounds.y % gridSize) + gridSize) % gridSize;
    for (let gx = gridSize - startX; gx < bounds.w; gx += gridSize) {
      for (let gy = gridSize - startY; gy < bounds.h; gy += gridSize) {
        ctx.beginPath();
        ctx.arc(gx * scale, gy * scale, dotR, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  // ── SVG layer (drawings, shapes, arrows, connections) ────────────────────────
  const svgStr = serializeSvg(svgElement);
  const svgBlob = new Blob([svgStr], { type: 'image/svg+xml;charset=utf-8' });
  const svgUrl = URL.createObjectURL(svgBlob);
  try {
    const svgImg = await loadImage(svgUrl);
    // Source rect: the content bounds within the full 6000×4000 SVG canvas
    // Dest rect:   the full export canvas
    ctx.drawImage(
      svgImg,
      bounds.x, bounds.y, bounds.w, bounds.h,
      0, 0, pixelW, pixelH
    );
  } finally {
    URL.revokeObjectURL(svgUrl);
  }

  // ── HTML elements (sticky notes, text boxes, images) ────────────────────────
  await drawHTMLElements(ctx, elements, bounds.x, bounds.y, scale);

  return canvas;
}
