import rough from 'roughjs';
import type { Options } from 'roughjs/bin/core';
import type { ShapeType, ShapeElement, Point } from '../types';

export interface RoughPath {
  d: string;
  fill: string;
  stroke: string;
  strokeWidth: number;
}

const generator = rough.generator();

function opsToDAttribute(ops: Array<{ op: string; data: number[] }>): string {
  return ops
    .map((op) => {
      const d = op.data;
      switch (op.op) {
        case 'move':
          return `M ${d[0].toFixed(2)} ${d[1].toFixed(2)}`;
        case 'lineTo':
          return `L ${d[0].toFixed(2)} ${d[1].toFixed(2)}`;
        case 'bcurveTo':
          return `C ${d[0].toFixed(2)} ${d[1].toFixed(2)}, ${d[2].toFixed(2)} ${d[3].toFixed(2)}, ${d[4].toFixed(2)} ${d[5].toFixed(2)}`;
        default:
          return '';
      }
    })
    .join(' ');
}

function drawableToRoughPaths(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  drawable: any,
  fillColor: string,
  strokeColor: string,
  strokeWidth: number
): RoughPath[] {
  return drawable.sets.map(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (set: any): RoughPath => {
      const d = opsToDAttribute(set.ops);
      const isStroke = set.type === 'path';
      const isFill = set.type === 'fillPath' || set.type === 'fillSketch';

      return {
        d,
        fill: isFill ? fillColor : 'none',
        stroke: isStroke || set.type === 'fillSketch' ? strokeColor : 'none',
        strokeWidth: isStroke || set.type === 'fillSketch' ? strokeWidth : 0
      };
    }
  );
}

function getStarPolygon(cx: number, cy: number, outerR: number, innerR: number, points: number): Point[] {
  const pts: Point[] = [];
  for (let i = 0; i < points * 2; i++) {
    const angle = (i * Math.PI) / points - Math.PI / 2;
    const r = i % 2 === 0 ? outerR : innerR;
    pts.push({ x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) });
  }
  return pts;
}

function getArrowPolygon(x: number, y: number, width: number, height: number): Point[] {
  const shaftH = height * 0.45;
  const shaftY = (height - shaftH) / 2;
  const arrowH = height;
  const arrowX = width * 0.6;

  return [
    { x: x, y: y + shaftY },
    { x: x + arrowX, y: y + shaftY },
    { x: x + arrowX, y: y },
    { x: x + width, y: y + arrowH / 2 },
    { x: x + arrowX, y: y + arrowH },
    { x: x + arrowX, y: y + shaftY + shaftH },
    { x: x, y: y + shaftY + shaftH }
  ];
}

export function generateRoughPaths(element: ShapeElement): RoughPath[] {
  const { x, y, width, height, shapeType, fillColor, strokeColor, roughness, seed } = element;

  const options: Options = {
    roughness,
    strokeWidth: 2,
    fill: fillColor !== 'transparent' ? fillColor : undefined,
    stroke: strokeColor,
    fillStyle: 'solid',
    seed
  };

  let drawable;

  switch (shapeType) {
    case 'circle':
      drawable = generator.circle(x + width / 2, y + height / 2, Math.min(width, height), options);
      break;

    case 'ellipse':
      drawable = generator.ellipse(x + width / 2, y + height / 2, width, height, options);
      break;

    case 'square':
    case 'rectangle':
      drawable = generator.rectangle(x, y, width, height, options);
      break;

    case 'triangle':
      drawable = generator.polygon(
        [
          [x + width / 2, y],
          [x + width, y + height],
          [x, y + height]
        ],
        options
      );
      break;

    case 'diamond':
      drawable = generator.polygon(
        [
          [x + width / 2, y],
          [x + width, y + height / 2],
          [x + width / 2, y + height],
          [x, y + height / 2]
        ],
        options
      );
      break;

    case 'star': {
      const starPts = getStarPolygon(x + width / 2, y + height / 2, Math.min(width, height) / 2, Math.min(width, height) / 4, 5);
      drawable = generator.polygon(
        starPts.map((p) => [p.x, p.y]),
        options
      );
      break;
    }

    case 'arrow': {
      const arrowPts = getArrowPolygon(x, y, width, height);
      drawable = generator.polygon(
        arrowPts.map((p) => [p.x, p.y]),
        options
      );
      break;
    }

    default:
      drawable = generator.rectangle(x, y, width, height, options);
  }

  return drawableToRoughPaths(drawable, fillColor, strokeColor, 2);
}

export function generatePreviewRoughPaths(
  shapeType: ShapeType,
  x: number,
  y: number,
  width: number,
  height: number,
  fillColor: string,
  strokeColor: string,
  roughness: number,
  seed: number
): RoughPath[] {
  const fakeEl = {
    id: 'preview',
    type: 'shape' as const,
    x,
    y,
    width,
    height,
    rotation: 0,
    zIndex: 0,
    shapeType,
    fillColor,
    strokeColor,
    roughness,
    seed
  };
  return generateRoughPaths(fakeEl);
}

/** Convert element ID string to a deterministic seed number */
export function idToSeed(id: string): number {
  return id.split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
}
