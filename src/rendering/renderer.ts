import rough from 'roughjs';
import type { Options } from 'roughjs/bin/core';
import { getStroke } from 'perfect-freehand';
import { ExcalidrawElement, ResizeHandle } from '../types';
import { FONT_FAMILIES, HANDLE_SIZE } from '../constants';
import { getElementBounds, getMultiElementBounds, getResizeHandlePoints, worldToScreen } from '../utils/geometry';

// Convert perfect-freehand stroke to SVG path
function getSvgPathFromStroke(points: number[][]): string {
  if (!points.length) return '';
  const d: (string | number)[] = [];
  const [first] = points;
  d.push('M', first[0].toFixed(2), first[1].toFixed(2));
  for (let i = 0; i < points.length - 1; i++) {
    const [x0, y0] = points[i];
    const [x1, y1] = points[i + 1];
    d.push('Q', x0.toFixed(2), y0.toFixed(2), ((x0 + x1) / 2).toFixed(2), ((y0 + y1) / 2).toFixed(2));
  }
  d.push('Z');
  return d.join(' ');
}

function getStrokeDash(strokeStyle: string, strokeWidth: number): number[] | undefined {
  if (strokeStyle === 'dashed') return [strokeWidth * 6, strokeWidth * 4];
  if (strokeStyle === 'dotted') return [0, strokeWidth * 4];
  return undefined;
}

function getRoughOptions(el: ExcalidrawElement): Options {
  return {
    seed: el.seed,
    roughness: el.roughness,
    stroke: el.strokeColor,
    strokeWidth: el.strokeWidth,
    fill: el.backgroundColor !== 'transparent' ? el.backgroundColor : undefined,
    fillStyle: el.fillStyle,
    strokeLineDash: getStrokeDash(el.strokeStyle, el.strokeWidth),
    preserveVertices: el.roughness === 0,
    disableMultiStroke: el.roughness === 0,
  };
}

function drawArrowhead(
  ctx: CanvasRenderingContext2D,
  x1: number, y1: number,
  x2: number, y2: number,
  type: string | null,
  strokeColor: string,
  strokeWidth: number,
) {
  if (!type) return;
  const angle = Math.atan2(y2 - y1, x2 - x1);
  const size = Math.max(12, strokeWidth * 5);

  ctx.save();
  ctx.strokeStyle = strokeColor;
  ctx.fillStyle = strokeColor;
  ctx.lineWidth = strokeWidth;

  if (type === 'arrow') {
    ctx.beginPath();
    ctx.moveTo(x2 - size * Math.cos(angle - Math.PI / 6), y2 - size * Math.sin(angle - Math.PI / 6));
    ctx.lineTo(x2, y2);
    ctx.lineTo(x2 - size * Math.cos(angle + Math.PI / 6), y2 - size * Math.sin(angle + Math.PI / 6));
    ctx.stroke();
  } else if (type === 'dot') {
    ctx.beginPath();
    ctx.arc(x2, y2, strokeWidth * 2, 0, Math.PI * 2);
    ctx.fill();
  } else if (type === 'bar') {
    ctx.beginPath();
    ctx.moveTo(x2 - Math.sin(angle) * size / 2, y2 + Math.cos(angle) * size / 2);
    ctx.lineTo(x2 + Math.sin(angle) * size / 2, y2 - Math.cos(angle) * size / 2);
    ctx.stroke();
  }
  ctx.restore();
}

function renderText(ctx: CanvasRenderingContext2D, el: ExcalidrawElement) {
  if (!el.text) return;
  const fontSize = el.fontSize || 20;
  const fontFamilyKey = el.fontFamily || 'virgil';
  const fontFamilyStr = FONT_FAMILIES[fontFamilyKey as keyof typeof FONT_FAMILIES] || FONT_FAMILIES.virgil;
  const lineHeight = fontSize * 1.25;
  const lines = el.text.split('\n');

  ctx.save();
  ctx.font = `${fontSize}px ${fontFamilyStr}`;
  ctx.fillStyle = el.strokeColor;
  ctx.textBaseline = 'middle';
  ctx.textAlign = (el.textAlign as CanvasTextAlign) || 'left';

  let xOffset = el.x;
  if (el.textAlign === 'center') xOffset = el.x + el.width / 2;
  if (el.textAlign === 'right') xOffset = el.x + el.width;

  lines.forEach((line, i) => {
    ctx.fillText(line, xOffset, el.y + (i + 0.5) * lineHeight);
  });
  ctx.restore();
}

function renderFreehand(ctx: CanvasRenderingContext2D, el: ExcalidrawElement) {
  if (!el.points || el.points.length < 2) return;

  const pts = el.points.map(([px, py]) => [el.x + px, el.y + py]);
  const stroke = getStroke(pts, {
    size: Math.max(el.strokeWidth * 3, 4),
    thinning: 0.5,
    smoothing: 0.5,
    streamline: 0.5,
    simulatePressure: el.simulatePressure !== false,
  });

  if (!stroke.length) return;
  const pathData = getSvgPathFromStroke(stroke);
  const path = new Path2D(pathData);
  ctx.save();
  ctx.fillStyle = el.strokeColor;
  ctx.fill(path);
  ctx.restore();
}

export function renderElement(
  ctx: CanvasRenderingContext2D,
  element: ExcalidrawElement,
) {
  if (element.isDeleted) return;

  ctx.save();
  ctx.globalAlpha = element.opacity / 100;

  // Apply rotation around element center
  if (element.angle) {
    const b = getElementBounds(element);
    const cx = b.x + b.width / 2;
    const cy = b.y + b.height / 2;
    ctx.translate(cx, cy);
    ctx.rotate((element.angle * Math.PI) / 180);
    ctx.translate(-cx, -cy);
  }

  // @ts-ignore – roughjs types
  const rc = rough.canvas(ctx.canvas);
  const opts = getRoughOptions(element);

  switch (element.type) {
    case 'rectangle': {
      const b = getElementBounds(element);
      rc.rectangle(b.x, b.y, b.width, b.height, opts);
      break;
    }
    case 'diamond': {
      const b = getElementBounds(element);
      const cx = b.x + b.width / 2;
      const cy = b.y + b.height / 2;
      rc.polygon([
        [cx, b.y],
        [b.x + b.width, cy],
        [cx, b.y + b.height],
        [b.x, cy],
      ], opts);
      break;
    }
    case 'ellipse': {
      const b = getElementBounds(element);
      rc.ellipse(b.x + b.width / 2, b.y + b.height / 2, b.width, b.height, opts);
      break;
    }
    case 'line':
    case 'arrow': {
      if (!element.points || element.points.length < 2) break;
      const lineOpts = { ...opts, fill: undefined, fillStyle: undefined as any };
      for (let i = 0; i < element.points.length - 1; i++) {
        const [ax, ay] = element.points[i];
        const [bx, by] = element.points[i + 1];
        rc.line(
          element.x + ax, element.y + ay,
          element.x + bx, element.y + by,
          lineOpts,
        );
      }
      if (element.type === 'arrow') {
        const last = element.points[element.points.length - 1];
        const secondLast = element.points[element.points.length - 2];
        const first = element.points[0];
        const second = element.points[1];
        drawArrowhead(
          ctx,
          element.x + secondLast[0], element.y + secondLast[1],
          element.x + last[0], element.y + last[1],
          element.endArrowhead || 'arrow',
          element.strokeColor, element.strokeWidth,
        );
        if (element.startArrowhead) {
          drawArrowhead(
            ctx,
            element.x + second[0], element.y + second[1],
            element.x + first[0], element.y + first[1],
            element.startArrowhead,
            element.strokeColor, element.strokeWidth,
          );
        }
      }
      break;
    }
    case 'freedraw':
      renderFreehand(ctx, element);
      break;
    case 'text':
      renderText(ctx, element);
      break;
  }

  ctx.restore();
}

// ── Welcome screen drawn in world space ──────────────────────────────────────

function arrowHead(ctx: CanvasRenderingContext2D, fx: number, fy: number, tx: number, ty: number) {
  const a = Math.atan2(ty - fy, tx - fx);
  const s = 14;
  ctx.beginPath();
  ctx.moveTo(tx, ty);
  ctx.lineTo(tx - s * Math.cos(a - 0.42), ty - s * Math.sin(a - 0.42));
  ctx.moveTo(tx, ty);
  ctx.lineTo(tx - s * Math.cos(a + 0.42), ty - s * Math.sin(a + 0.42));
  ctx.stroke();
}

export function renderWelcome(
  ctx: CanvasRenderingContext2D,
  zoom: number,
  offsetX: number,
  offsetY: number,
  theme: 'light' | 'dark',
) {
  const muted = theme === 'dark'
    ? 'rgba(200,200,230,0.45)'
    : 'rgba(90,90,130,0.5)';

  ctx.save();
  ctx.translate(offsetX, offsetY);
  ctx.scale(zoom, zoom);

  // ── ESDraw logo ──────────────────────────────────────
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = '700 68px Virgil, cursive';
  ctx.fillStyle = '#6965db';
  ctx.fillText('ESDraw', 0, 0);

  // ── Subtitle ─────────────────────────────────────────
  ctx.font = '17px Virgil, cursive';
  ctx.fillStyle = muted;
  ctx.fillText("Your drawings are saved in your browser's storage.", 0, 54);
  ctx.fillText("Browser storage can be cleared unexpectedly.", 0, 78);
  ctx.font = '700 16px Virgil, cursive';
  ctx.fillText("Save your work as an image to keep it.", 0, 104);

  ctx.lineWidth = 2;
  ctx.lineCap = 'round';
  ctx.strokeStyle = muted;

  // ── Hint 1: top-left → hamburger menu ────────────────
  ctx.textAlign = 'right';
  ctx.font = '15px Virgil, cursive';
  ctx.fillStyle = muted;
  ctx.fillText('Export, preferences, ...', -170, -190);

  // Curved arrow from label toward top-left
  ctx.beginPath();
  ctx.moveTo(-290, -210);
  ctx.quadraticCurveTo(-370, -260, -420, -330);
  ctx.stroke();
  arrowHead(ctx, -370, -260, -420, -330);

  // ── Hint 2: top-center → toolbar ─────────────────────
  ctx.textAlign = 'left';
  ctx.fillStyle = muted;
  ctx.fillText('Pick a tool &', 100, -190);
  ctx.fillText('Start drawing!', 100, -213);

  // Curved arrow from label toward top-center
  ctx.beginPath();
  ctx.moveTo(95, -225);
  ctx.quadraticCurveTo(40, -290, 10, -360);
  ctx.stroke();
  arrowHead(ctx, 40, -290, 10, -360);

  ctx.restore();
}

export function renderScene(
  ctx: CanvasRenderingContext2D,
  elements: ExcalidrawElement[],
  zoom: number,
  offsetX: number,
  offsetY: number,
  drawingElement: ExcalidrawElement | null,
  selectedIds: Set<string>,
  selectionBox: { x1: number; y1: number; x2: number; y2: number } | null,
) {
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

  ctx.save();
  ctx.translate(offsetX, offsetY);
  ctx.scale(zoom, zoom);

  // Render background grid (dots)
  renderGrid(ctx, zoom, offsetX, offsetY);

  // Render all elements
  for (const el of elements) {
    if (!el.isDeleted) {
      renderElement(ctx, el);
    }
  }
  if (drawingElement) {
    renderElement(ctx, drawingElement);
  }

  ctx.restore();

  // Render selection on top (in screen coords)
  if (selectedIds.size > 0) {
    const selected = elements.filter(el => selectedIds.has(el.id) && !el.isDeleted);
    if (selected.length > 0) {
      renderSelectionBorder(ctx, selected, zoom, offsetX, offsetY);
    }
  }

  // Render selection box
  if (selectionBox) {
    const sx1 = selectionBox.x1 * zoom + offsetX;
    const sy1 = selectionBox.y1 * zoom + offsetY;
    const sx2 = selectionBox.x2 * zoom + offsetX;
    const sy2 = selectionBox.y2 * zoom + offsetY;
    ctx.save();
    ctx.strokeStyle = '#4d90fe';
    ctx.lineWidth = 1;
    ctx.fillStyle = 'rgba(77, 144, 254, 0.08)';
    ctx.setLineDash([4, 2]);
    const rx = Math.min(sx1, sx2);
    const ry = Math.min(sy1, sy2);
    const rw = Math.abs(sx2 - sx1);
    const rh = Math.abs(sy2 - sy1);
    ctx.fillRect(rx, ry, rw, rh);
    ctx.strokeRect(rx, ry, rw, rh);
    ctx.restore();
  }
}

function renderGrid(
  ctx: CanvasRenderingContext2D,
  zoom: number,
  offsetX: number,
  offsetY: number,
) {
  // Called inside the world-space transform (translate+scale already applied)
  const gridSize = 20;
  const canvas = ctx.canvas;
  const w = canvas.width;
  const h = canvas.height;

  const startX = Math.floor(-offsetX / zoom / gridSize) * gridSize - gridSize;
  const startY = Math.floor(-offsetY / zoom / gridSize) * gridSize - gridSize;
  const endX = (w - offsetX) / zoom + gridSize;
  const endY = (h - offsetY) / zoom + gridSize;
  const dotSize = Math.max(0.5, 1.5 / zoom);

  ctx.fillStyle = 'rgba(128,128,128,0.3)';
  for (let gx = startX; gx < endX; gx += gridSize) {
    for (let gy = startY; gy < endY; gy += gridSize) {
      ctx.fillRect(gx - dotSize / 2, gy - dotSize / 2, dotSize, dotSize);
    }
  }
}

function renderSelectionBorder(
  ctx: CanvasRenderingContext2D,
  elements: ExcalidrawElement[],
  zoom: number,
  offsetX: number,
  offsetY: number,
) {
  const bounds = getMultiElementBounds(elements);
  const { x, y, width, height } = bounds;

  const sx = x * zoom + offsetX;
  const sy = y * zoom + offsetY;
  const sw = width * zoom;
  const sh = height * zoom;

  ctx.save();
  ctx.strokeStyle = '#4d90fe';
  ctx.lineWidth = 1;
  ctx.setLineDash([5, 3]);
  ctx.strokeRect(sx - 4, sy - 4, sw + 8, sh + 8);
  ctx.setLineDash([]);

  // Resize handles
  const handleBounds = {
    x: bounds.x - 4 / zoom,
    y: bounds.y - 4 / zoom,
    width: bounds.width + 8 / zoom,
    height: bounds.height + 8 / zoom,
  };
  const handles = getResizeHandlePoints(handleBounds);
  const hs = HANDLE_SIZE;

  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = '#4d90fe';
  ctx.lineWidth = 1.5;

  for (const pt of Object.values(handles)) {
    const hsx = pt.x * zoom + offsetX;
    const hsy = pt.y * zoom + offsetY;
    ctx.beginPath();
    ctx.rect(hsx - hs / 2, hsy - hs / 2, hs, hs);
    ctx.fill();
    ctx.stroke();
  }

  // Rotation handle
  const rotateSx = sx + sw / 2;
  const rotateSy = sy - 4 - 20;
  ctx.strokeStyle = '#4d90fe';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(rotateSx, sy - 4);
  ctx.lineTo(rotateSx, rotateSy + 8);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(rotateSx, rotateSy, 5, 0, Math.PI * 2);
  ctx.fillStyle = '#ffffff';
  ctx.fill();
  ctx.strokeStyle = '#4d90fe';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.restore();
}
