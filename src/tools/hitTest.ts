import { ExcalidrawElement } from '../types';
import { distanceToSegment, getElementBounds } from '../utils/geometry';
import { FONT_FAMILIES } from '../constants';

const HIT_THRESHOLD = 8;

export function hitTestElement(el: ExcalidrawElement, x: number, y: number): boolean {
  if (el.isDeleted) return false;

  switch (el.type) {
    case 'rectangle':
      return hitTestRectangle(el, x, y);
    case 'diamond':
      return hitTestDiamond(el, x, y);
    case 'ellipse':
      return hitTestEllipse(el, x, y);
    case 'line':
    case 'arrow':
      return hitTestLine(el, x, y);
    case 'freedraw':
      return hitTestFreehand(el, x, y);
    case 'text':
      return hitTestText(el, x, y);
    default:
      return false;
  }
}

function hitTestRectangle(el: ExcalidrawElement, x: number, y: number): boolean {
  const b = getElementBounds(el);
  const hasFill = el.backgroundColor !== 'transparent';

  if (hasFill) {
    return x >= b.x && x <= b.x + b.width && y >= b.y && y <= b.y + b.height;
  }

  // Stroke only — hit the perimeter
  const t = HIT_THRESHOLD + el.strokeWidth;
  const inOuter = x >= b.x - t && x <= b.x + b.width + t && y >= b.y - t && y <= b.y + b.height + t;
  const inInner = x >= b.x + t && x <= b.x + b.width - t && y >= b.y + t && y <= b.y + b.height - t;
  return inOuter && !inInner;
}

function hitTestDiamond(el: ExcalidrawElement, x: number, y: number): boolean {
  const b = getElementBounds(el);
  const cx = b.x + b.width / 2;
  const cy = b.y + b.height / 2;
  const hasFill = el.backgroundColor !== 'transparent';

  if (hasFill) {
    // Point-in-diamond test
    const dx = Math.abs(x - cx) / (b.width / 2);
    const dy = Math.abs(y - cy) / (b.height / 2);
    return dx + dy <= 1;
  }

  // Hit perimeter: check distance to each edge
  const t = HIT_THRESHOLD + el.strokeWidth;
  const edges: [[number,number],[number,number]][] = [
    [[cx, b.y], [b.x + b.width, cy]],
    [[b.x + b.width, cy], [cx, b.y + b.height]],
    [[cx, b.y + b.height], [b.x, cy]],
    [[b.x, cy], [cx, b.y]],
  ];
  return edges.some(([[ax,ay],[bx,by]]) => distanceToSegment(x,y,ax,ay,bx,by) <= t);
}

function hitTestEllipse(el: ExcalidrawElement, x: number, y: number): boolean {
  const b = getElementBounds(el);
  const cx = b.x + b.width / 2;
  const cy = b.y + b.height / 2;
  const rx = b.width / 2;
  const ry = b.height / 2;
  const hasFill = el.backgroundColor !== 'transparent';

  const normalized = ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2;
  if (hasFill) return normalized <= 1;

  const t = HIT_THRESHOLD + el.strokeWidth;
  const outerNorm = ((x - cx) / (rx + t)) ** 2 + ((y - cy) / (ry + t)) ** 2;
  const innerNorm = rx > t && ry > t
    ? ((x - cx) / (rx - t)) ** 2 + ((y - cy) / (ry - t)) ** 2
    : 0;
  return outerNorm <= 1 && innerNorm >= 1;
}

function hitTestLine(el: ExcalidrawElement, x: number, y: number): boolean {
  if (!el.points || el.points.length < 2) return false;
  const t = HIT_THRESHOLD + el.strokeWidth;
  for (let i = 0; i < el.points.length - 1; i++) {
    const [ax, ay] = el.points[i];
    const [bx, by] = el.points[i + 1];
    if (distanceToSegment(x, y, el.x + ax, el.y + ay, el.x + bx, el.y + by) <= t) {
      return true;
    }
  }
  return false;
}

function hitTestFreehand(el: ExcalidrawElement, x: number, y: number): boolean {
  if (!el.points || el.points.length < 2) return false;
  const t = HIT_THRESHOLD + el.strokeWidth;
  for (let i = 0; i < el.points.length - 1; i++) {
    const [ax, ay] = el.points[i];
    const [bx, by] = el.points[i + 1];
    if (distanceToSegment(x, y, el.x + ax, el.y + ay, el.x + bx, el.y + by) <= t) {
      return true;
    }
  }
  return false;
}

function hitTestText(el: ExcalidrawElement, x: number, y: number): boolean {
  const b = getElementBounds(el);
  return x >= b.x && x <= b.x + b.width && y >= b.y && y <= b.y + b.height;
}

export function getElementsAtPoint(
  elements: ExcalidrawElement[],
  x: number,
  y: number,
): ExcalidrawElement[] {
  return elements.filter(el => !el.isDeleted && hitTestElement(el, x, y));
}

export function getTopElementAtPoint(
  elements: ExcalidrawElement[],
  x: number,
  y: number,
): ExcalidrawElement | null {
  for (let i = elements.length - 1; i >= 0; i--) {
    const el = elements[i];
    if (!el.isDeleted && hitTestElement(el, x, y)) return el;
  }
  return null;
}

export function getElementsInBox(
  elements: ExcalidrawElement[],
  x1: number, y1: number,
  x2: number, y2: number,
): ExcalidrawElement[] {
  const minX = Math.min(x1, x2);
  const minY = Math.min(y1, y2);
  const maxX = Math.max(x1, x2);
  const maxY = Math.max(y1, y2);

  return elements.filter(el => {
    if (el.isDeleted) return false;
    const b = getElementBounds(el);
    return b.x >= minX && b.y >= minY && b.x + b.width <= maxX && b.y + b.height <= maxY;
  });
}

export function measureText(
  text: string,
  fontSize: number,
  fontFamily: string,
): { width: number; height: number } {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d')!;
  const lineHeight = fontSize * 1.25;
  const fontStr = `${fontSize}px ${FONT_FAMILIES[fontFamily as keyof typeof FONT_FAMILIES] || fontFamily}`;
  ctx.font = fontStr;
  const lines = text.split('\n');
  const maxWidth = Math.max(...lines.map(l => ctx.measureText(l).width), 10);
  return { width: maxWidth, height: lines.length * lineHeight };
}
