import { ExcalidrawElement } from '../types';
import { getMultiElementBounds } from './geometry';
import { renderScene } from '../rendering/renderer';

const PADDING = 32;

export function exportToPng(
  elements: ExcalidrawElement[],
  theme: 'light' | 'dark',
  scale = 2,
) {
  const visible = elements.filter(el => !el.isDeleted);
  if (visible.length === 0) return;

  const bounds = getMultiElementBounds(visible);
  const w = Math.max(bounds.width + PADDING * 2, 1);
  const h = Math.max(bounds.height + PADDING * 2, 1);

  const canvas = document.createElement('canvas');
  canvas.width = w * scale;
  canvas.height = h * scale;

  const ctx = canvas.getContext('2d')!;
  ctx.scale(scale, scale);
  ctx.fillStyle = theme === 'dark' ? '#121212' : '#ffffff';
  ctx.fillRect(0, 0, w, h);

  const ox = -bounds.x + PADDING;
  const oy = -bounds.y + PADDING;

  renderScene(ctx, visible, 1, ox, oy, null, new Set(), null);

  canvas.toBlob(blob => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'esdraw.png';
    a.click();
    URL.revokeObjectURL(url);
  });
}

export function exportToSvg(
  elements: ExcalidrawElement[],
  theme: 'light' | 'dark',
) {
  const visible = elements.filter(el => !el.isDeleted);
  if (visible.length === 0) return;

  const bounds = getMultiElementBounds(visible);
  const w = Math.max(bounds.width + PADDING * 2, 1);
  const h = Math.max(bounds.height + PADDING * 2, 1);

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = theme === 'dark' ? '#121212' : '#ffffff';
  ctx.fillRect(0, 0, w, h);

  const ox = -bounds.x + PADDING;
  const oy = -bounds.y + PADDING;
  renderScene(ctx, visible, 1, ox, oy, null, new Set(), null);

  // Export as PNG for now (SVG path generation requires more complex logic)
  exportToPng(elements, theme);
}
