import { ExcalidrawElement, Bounds, Point, ResizeHandle } from '../types';
import { HANDLE_SIZE } from '../constants';

export function getElementBounds(el: ExcalidrawElement): Bounds {
  if ((el.type === 'line' || el.type === 'arrow') && el.points) {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const [px, py] of el.points) {
      minX = Math.min(minX, el.x + px);
      minY = Math.min(minY, el.y + py);
      maxX = Math.max(maxX, el.x + px);
      maxY = Math.max(maxY, el.y + py);
    }
    return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
  }
  return {
    x: Math.min(el.x, el.x + el.width),
    y: Math.min(el.y, el.y + el.height),
    width: Math.abs(el.width),
    height: Math.abs(el.height),
  };
}

export function getMultiElementBounds(elements: ExcalidrawElement[]): Bounds {
  if (elements.length === 0) return { x: 0, y: 0, width: 0, height: 0 };
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const el of elements) {
    const b = getElementBounds(el);
    minX = Math.min(minX, b.x);
    minY = Math.min(minY, b.y);
    maxX = Math.max(maxX, b.x + b.width);
    maxY = Math.max(maxY, b.y + b.height);
  }
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

export function screenToWorld(sx: number, sy: number, zoom: number, ox: number, oy: number): Point {
  return { x: (sx - ox) / zoom, y: (sy - oy) / zoom };
}

export function worldToScreen(wx: number, wy: number, zoom: number, ox: number, oy: number): Point {
  return { x: wx * zoom + ox, y: wy * zoom + oy };
}

export function distanceToSegment(px: number, py: number, ax: number, ay: number, bx: number, by: number): number {
  const dx = bx - ax, dy = by - ay;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return Math.hypot(px - ax, py - ay);
  let t = ((px - ax) * dx + (py - ay) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

export function getResizeHandlePoints(bounds: Bounds): Record<ResizeHandle, Point> {
  const { x, y, width, height } = bounds;
  const cx = x + width / 2;
  const cy = y + height / 2;
  return {
    nw: { x, y },
    n:  { x: cx, y },
    ne: { x: x + width, y },
    e:  { x: x + width, y: cy },
    se: { x: x + width, y: y + height },
    s:  { x: cx, y: y + height },
    sw: { x, y: y + height },
    w:  { x, y: cy },
  };
}

export function hitTestHandle(
  mx: number, my: number,
  bounds: Bounds,
  zoom: number,
): ResizeHandle | null {
  const handles = getResizeHandlePoints(bounds);
  const hitRadius = HANDLE_SIZE / zoom + 4 / zoom;
  for (const [name, pt] of Object.entries(handles) as [ResizeHandle, Point][]) {
    if (Math.abs(mx - pt.x) <= hitRadius && Math.abs(my - pt.y) <= hitRadius) {
      return name;
    }
  }
  return null;
}

export function applyResize(
  el: ExcalidrawElement,
  handle: ResizeHandle,
  dx: number,
  dy: number,
): Partial<ExcalidrawElement> {
  let { x, y, width, height } = el;

  switch (handle) {
    case 'se': width += dx; height += dy; break;
    case 's':  height += dy; break;
    case 'e':  width += dx; break;
    case 'n':  y += dy; height -= dy; break;
    case 'w':  x += dx; width -= dx; break;
    case 'nw': x += dx; y += dy; width -= dx; height -= dy; break;
    case 'ne': y += dy; width += dx; height -= dy; break;
    case 'sw': x += dx; width -= dx; height += dy; break;
  }

  return { x, y, width, height };
}

export function normalizeElement(el: ExcalidrawElement): ExcalidrawElement {
  if (el.width < 0) {
    return { ...el, x: el.x + el.width, width: -el.width };
  }
  if (el.height < 0) {
    return { ...el, y: el.y + el.height, height: -el.height };
  }
  return el;
}

export function snapToGrid(val: number, grid: number): number {
  return Math.round(val / grid) * grid;
}
