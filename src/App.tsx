import React, { useCallback, useEffect, useRef, useState } from 'react';
import { nanoid } from 'nanoid';
import { ExcalidrawElement, AppState, ToolType, ResizeHandle } from './types';
import { DEFAULT_APP_STATE, TOOL_SHORTCUTS, ZOOM_STEP, MAX_ZOOM, MIN_ZOOM, FONT_FAMILIES } from './constants';
import { renderScene, renderWelcome } from './rendering/renderer';
import { getTopElementAtPoint, getElementsInBox, measureText } from './tools/hitTest';
import {
  screenToWorld, worldToScreen, getElementBounds, getMultiElementBounds,
  hitTestHandle, applyResize, normalizeElement,
} from './utils/geometry';
import { exportToPng } from './utils/export';
import { HorizontalToolbar } from './components/HorizontalToolbar';
import { HamburgerMenu } from './components/HamburgerMenu';
import { PropertiesPanel } from './components/PropertiesPanel';
import type { SelectionContext } from './components/PropertiesPanel';

// ── History ─────────────────────────────────────────────────────────────────

interface HistoryEntry { elements: ExcalidrawElement[] }

function useHistory(initial: ExcalidrawElement[]) {
  const [past, setPast] = useState<HistoryEntry[]>([]);
  const [future, setFuture] = useState<HistoryEntry[]>([]);
  const [elements, setElements] = useState<ExcalidrawElement[]>(initial);

  const commit = useCallback((next: ExcalidrawElement[]) => {
    setPast(p => [...p.slice(-49), { elements }]);
    setFuture([]);
    setElements(next);
  }, [elements]);

  const undo = useCallback(() => {
    if (!past.length) return;
    const prev = past[past.length - 1];
    setFuture(f => [{ elements }, ...f]);
    setPast(p => p.slice(0, -1));
    setElements(prev.elements);
  }, [past, elements]);

  const redo = useCallback(() => {
    if (!future.length) return;
    const next = future[0];
    setPast(p => [...p, { elements }]);
    setFuture(f => f.slice(1));
    setElements(next.elements);
  }, [future, elements]);

  return { elements, setElements, commit, undo, redo, canUndo: past.length > 0, canRedo: future.length > 0 };
}

// ── App ──────────────────────────────────────────────────────────────────────

function newElement(
  type: ExcalidrawElement['type'],
  x: number, y: number,
  state: AppState,
): ExcalidrawElement {
  return {
    id: nanoid(),
    type,
    x, y,
    width: 0,
    height: 0,
    angle: 0,
    strokeColor: state.strokeColor,
    backgroundColor: state.backgroundColor,
    fillStyle: state.fillStyle,
    strokeWidth: state.strokeWidth,
    strokeStyle: state.strokeStyle,
    roughness: state.roughness,
    opacity: state.opacity,
    seed: Math.floor(Math.random() * 100000),
    isDeleted: false,
    points: type === 'line' || type === 'arrow' || type === 'freedraw' ? [[0, 0]] : undefined,
    startArrowhead: type === 'arrow' ? state.startArrowhead : undefined,
    endArrowhead: type === 'arrow' ? state.endArrowhead : undefined,
    text: type === 'text' ? '' : undefined,
    fontSize: type === 'text' ? state.fontSize : undefined,
    fontFamily: type === 'text' ? state.fontFamily : undefined,
    textAlign: type === 'text' ? state.textAlign : undefined,
    simulatePressure: type === 'freedraw' ? true : undefined,
  };
}

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const animFrameRef = useRef<number>(0);
  const pointerDownRef = useRef(false);
  const lastPosRef = useRef({ x: 0, y: 0 });
  const drawingElRef = useRef<ExcalidrawElement | null>(null);
  const selBoxRef = useRef<{ x1: number; y1: number; x2: number; y2: number } | null>(null);
  const activeResizeHandle = useRef<ResizeHandle | null>(null);
  const movingRef = useRef(false);
  const panStartRef = useRef({ x: 0, y: 0, ox: 0, oy: 0 });
  const isPanningRef = useRef(false);
  const spacePressedRef = useRef(false);

  // Load persisted elements
  const savedElements = (() => {
    try { return JSON.parse(localStorage.getItem('esdraw_elements') || '[]'); } catch { return []; }
  })();

  const { elements, setElements, commit, undo, redo, canUndo, canRedo } = useHistory(savedElements);
  const [appState, setAppState] = useState<AppState>(DEFAULT_APP_STATE);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  const [zenMode, setZenMode] = useState(false);
  const [hamburgerOpen, setHamburgerOpen] = useState(false);
  const [toolLocked, setToolLocked] = useState(false);
  // Welcome screen: show only when canvas was empty on load
  const [showWelcome, setShowWelcome] = useState(savedElements.filter((e: ExcalidrawElement) => !e.isDeleted).length === 0);
  const [textEditing, setTextEditing] = useState<{
    elementId: string;
    x: number; y: number;
    width: number; height: number;
    fontSize: number;
    fontFamily: string;
    textAlign: string;
    color: string;
  } | null>(null);

  const selectedElements = elements.filter(el => appState.selectedElementIds.has(el.id) && !el.isDeleted);

  // ── Persist to localStorage ───────────────────────────────────────────────

  useEffect(() => {
    localStorage.setItem('esdraw_elements', JSON.stringify(elements));
  }, [elements]);

  // ── Dismiss welcome screen ────────────────────────────────────────────────

  const dismissWelcome = useCallback(() => {
    if (showWelcome) setShowWelcome(false);
  }, [showWelcome]);

  // ── Render loop ───────────────────────────────────────────────────────────

  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.scale(dpr, dpr);
    }

    // Don't show selection handles on the element being text-edited (looks like a tiny broken box)
    const visibleSelectedIds = appState.editingElementId
      ? new Set([...appState.selectedElementIds].filter(id => id !== appState.editingElementId))
      : appState.selectedElementIds;

    renderScene(
      ctx,
      elements,
      appState.zoom,
      appState.offsetX,
      appState.offsetY,
      drawingElRef.current,
      visibleSelectedIds,
      selBoxRef.current,
    );

    // Welcome content drawn in world space (zooms/pans with canvas)
    if (showWelcome) {
      renderWelcome(ctx, appState.zoom, appState.offsetX, appState.offsetY, appState.theme);
    }
  }, [elements, appState, showWelcome]);

  useEffect(() => {
    animFrameRef.current = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [render]);

  // ── Coordinate helpers ────────────────────────────────────────────────────

  const toWorld = useCallback((sx: number, sy: number) =>
    screenToWorld(sx, sy, appState.zoom, appState.offsetX, appState.offsetY),
    [appState.zoom, appState.offsetX, appState.offsetY]
  );

  // ── Text editing ──────────────────────────────────────────────────────────

  const openTextEditor = useCallback((el: ExcalidrawElement) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const sx = el.x * appState.zoom + appState.offsetX + rect.left;
    const sy = el.y * appState.zoom + appState.offsetY + rect.top;
    const fontSize = el.fontSize || 20;
    const fontFamilyStr = FONT_FAMILIES[(el.fontFamily || 'virgil') as keyof typeof FONT_FAMILIES];
    const scaledFontSize = fontSize * appState.zoom;
    setTextEditing({
      elementId: el.id,
      x: sx, y: sy,
      width: Math.max(el.width * appState.zoom, scaledFontSize * 4),
      height: Math.max(el.height * appState.zoom, scaledFontSize * 1.25),
      fontSize: scaledFontSize,
      fontFamily: fontFamilyStr,
      textAlign: el.textAlign || 'left',
      color: el.strokeColor,
    });
    setAppState(s => ({ ...s, editingElementId: el.id }));
    setTimeout(() => {
      const ta = textareaRef.current;
      if (ta) {
        ta.value = el.text || '';
        // size to content immediately
        ta.style.height = 'auto';
        ta.style.height = Math.max(ta.scrollHeight, scaledFontSize * 1.25) + 'px';
        ta.style.width = 'auto';
        ta.style.width = Math.max(ta.scrollWidth, scaledFontSize * 4) + 'px';
        ta.focus();
        ta.selectionStart = ta.value.length;
      }
    }, 10);
  }, [appState.zoom, appState.offsetX, appState.offsetY]);

  const commitText = useCallback(() => {
    if (!textEditing || !textareaRef.current) return;
    const text = textareaRef.current.value;
    const el = elements.find(e => e.id === textEditing.elementId);
    if (!el) { setTextEditing(null); return; }

    const fontFamilyKey = el.fontFamily || 'virgil';
    const fontFamilyStr = FONT_FAMILIES[fontFamilyKey as keyof typeof FONT_FAMILIES];
    const measured = measureText(text || ' ', el.fontSize || 20, fontFamilyStr);

    const updated = elements.map(e =>
      e.id === textEditing.elementId
        ? { ...e, text, width: measured.width, height: measured.height, isDeleted: !text.trim() }
        : e
    );
    commit(updated);
    setTextEditing(null);
    setAppState(s => ({ ...s, editingElementId: null, tool: 'selection' }));
  }, [textEditing, elements, commit]);

  // ── Canvas resize ─────────────────────────────────────────────────────────

  useEffect(() => {
    const obs = new ResizeObserver(() => render());
    if (canvasRef.current?.parentElement) {
      obs.observe(canvasRef.current.parentElement);
    }
    return () => obs.disconnect();
  }, [render]);

  // Center viewport on first load so world (0,0) appears at screen center
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const hasExisting = savedElements.filter((e: ExcalidrawElement) => !e.isDeleted).length > 0;
    if (!hasExisting) {
      setAppState(s => ({
        ...s,
        offsetX: canvas.clientWidth / 2,
        offsetY: canvas.clientHeight / 2,
      }));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // run once on mount

  // ── Keyboard shortcuts ────────────────────────────────────────────────────

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'TEXTAREA' || target.tagName === 'INPUT') return;

      if (e.code === 'Space') {
        spacePressedRef.current = true;
        e.preventDefault();
        return;
      }

      const meta = e.metaKey || e.ctrlKey;

      if (meta && e.key === 'z') {
        e.preventDefault();
        if (e.shiftKey) redo(); else undo();
        return;
      }
      if (meta && e.key === 'a') {
        e.preventDefault();
        setAppState(s => ({
          ...s,
          selectedElementIds: new Set(elements.filter(el => !el.isDeleted).map(el => el.id)),
        }));
        return;
      }
      if (meta && e.key === 'c') {
        // Copy
        const sel = elements.filter(el => appState.selectedElementIds.has(el.id) && !el.isDeleted);
        if (sel.length) sessionStorage.setItem('excalidraw_clipboard', JSON.stringify(sel));
        return;
      }
      if (meta && e.key === 'v') {
        // Paste
        const raw = sessionStorage.getItem('excalidraw_clipboard');
        if (!raw) return;
        try {
          const copied: ExcalidrawElement[] = JSON.parse(raw);
          const newEls = copied.map(el => ({ ...el, id: nanoid(), x: el.x + 20, y: el.y + 20 }));
          const next = [...elements, ...newEls];
          commit(next);
          setAppState(s => ({
            ...s,
            selectedElementIds: new Set(newEls.map(el => el.id)),
          }));
        } catch {}
        return;
      }
      if (meta && e.key === 'd') {
        e.preventDefault();
        // Duplicate
        const sel = elements.filter(el => appState.selectedElementIds.has(el.id) && !el.isDeleted);
        if (sel.length) {
          const newEls = sel.map(el => ({ ...el, id: nanoid(), x: el.x + 20, y: el.y + 20 }));
          const next = [...elements, ...newEls];
          commit(next);
          setAppState(s => ({ ...s, selectedElementIds: new Set(newEls.map(el => el.id)) }));
        }
        return;
      }

      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (appState.selectedElementIds.size) {
          const next = elements.map(el =>
            appState.selectedElementIds.has(el.id) ? { ...el, isDeleted: true } : el
          );
          commit(next);
          setAppState(s => ({ ...s, selectedElementIds: new Set() }));
        }
        return;
      }

      if (e.key === 'Escape') {
        setAppState(s => ({ ...s, selectedElementIds: new Set(), tool: 'selection' }));
        if (zenMode) setZenMode(false);
        return;
      }

      // Alt+Z → zen mode
      if (e.altKey && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        setZenMode(z => !z);
        return;
      }

      if (e.key === '+' || e.key === '=') {
        setAppState(s => ({ ...s, zoom: Math.min(s.zoom + ZOOM_STEP, MAX_ZOOM) }));
        return;
      }
      if (e.key === '-') {
        setAppState(s => ({ ...s, zoom: Math.max(s.zoom - ZOOM_STEP, MIN_ZOOM) }));
        return;
      }

      const tool = TOOL_SHORTCUTS[e.key.toLowerCase()];
      if (tool) {
        setAppState(s => ({ ...s, tool: tool as ToolType }));
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') spacePressedRef.current = false;
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [elements, appState.selectedElementIds, appState.zoom, undo, redo, commit]);

  // ── Wheel zoom ────────────────────────────────────────────────────────────

  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      if (e.ctrlKey || e.metaKey) {
        const rect = el.getBoundingClientRect();
        const mx = e.clientX - rect.left;
        const my = e.clientY - rect.top;
        setAppState(s => {
          const factor = e.deltaY > 0 ? 0.9 : 1.1;
          const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, s.zoom * factor));
          const newOx = mx - (mx - s.offsetX) * (newZoom / s.zoom);
          const newOy = my - (my - s.offsetY) * (newZoom / s.zoom);
          return { ...s, zoom: newZoom, offsetX: newOx, offsetY: newOy };
        });
      } else {
        setAppState(s => ({
          ...s,
          offsetX: s.offsetX - e.deltaX,
          offsetY: s.offsetY - e.deltaY,
        }));
      }
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);

  // ── Mouse events ──────────────────────────────────────────────────────────

  const onPointerDown = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    if (e.button === 1 || spacePressedRef.current || appState.tool === 'hand') {
      // Pan
      isPanningRef.current = true;
      panStartRef.current = { x: e.clientX, y: e.clientY, ox: appState.offsetX, oy: appState.offsetY };
      (e.target as HTMLCanvasElement).setPointerCapture(e.pointerId);
      return;
    }

    if (e.button !== 0) return;
    (e.target as HTMLCanvasElement).setPointerCapture(e.pointerId);
    pointerDownRef.current = true;

    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    const { x, y } = toWorld(sx, sy);
    lastPosRef.current = { x: sx, y: sy };

    setContextMenu(null);
    dismissWelcome();

    const tool = appState.tool;

    if (tool === 'selection') {
      // Check resize handles first
      if (selectedElements.length > 0) {
        const multiB = getMultiElementBounds(selectedElements);
        const handleBounds = {
          x: multiB.x - 4 / appState.zoom,
          y: multiB.y - 4 / appState.zoom,
          width: multiB.width + 8 / appState.zoom,
          height: multiB.height + 8 / appState.zoom,
        };
        const handle = hitTestHandle(x, y, handleBounds, appState.zoom);
        if (handle) {
          activeResizeHandle.current = handle;
          return;
        }
      }

      // Hit test
      const hit = getTopElementAtPoint(elements, x, y);
      if (hit) {
        if (!appState.selectedElementIds.has(hit.id)) {
          if (e.shiftKey) {
            setAppState(s => ({
              ...s,
              selectedElementIds: new Set([...s.selectedElementIds, hit.id]),
            }));
          } else {
            setAppState(s => ({ ...s, selectedElementIds: new Set([hit.id]) }));
          }
        }
        movingRef.current = true;
      } else {
        // Start selection box
        if (!e.shiftKey) setAppState(s => ({ ...s, selectedElementIds: new Set() }));
        selBoxRef.current = { x1: x, y1: y, x2: x, y2: y };
      }
      return;
    }

    if (tool === 'eraser') {
      const hit = getTopElementAtPoint(elements, x, y);
      if (hit) {
        const next = elements.map(el => el.id === hit.id ? { ...el, isDeleted: true } : el);
        commit(next);
      }
      return;
    }

    if (tool === 'text') {
      // Check if clicking existing text
      const hit = elements.find(el => el.type === 'text' && !el.isDeleted &&
        x >= el.x && x <= el.x + el.width && y >= el.y && y <= el.y + el.height);
      if (hit) {
        setAppState(s => ({ ...s, selectedElementIds: new Set([hit.id]) }));
        openTextEditor(hit);
        return;
      }
      // Create new text element
      const el = newElement('text', x, y, appState);
      const newEls = [...elements, el];
      commit(newEls);
      setAppState(s => ({ ...s, selectedElementIds: new Set([el.id]) }));
      openTextEditor(el);
      return;
    }

    // Shape tools
    const toolToType: Record<string, ExcalidrawElement['type'] | null> = {
      rectangle: 'rectangle',
      diamond: 'diamond',
      ellipse: 'ellipse',
      arrow: 'arrow',
      line: 'line',
      freedraw: 'freedraw',
    };
    const elType = toolToType[tool];
    if (!elType) return;

    const el = newElement(elType, x, y, appState);
    drawingElRef.current = el;
  }, [appState, elements, selectedElements, toWorld, commit, openTextEditor]);

  const onPointerMove = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    const { x, y } = toWorld(sx, sy);
    const dsx = sx - lastPosRef.current.x;
    const dsy = sy - lastPosRef.current.y;
    const dx = dsx / appState.zoom;
    const dy = dsy / appState.zoom;
    lastPosRef.current = { x: sx, y: sy };

    // Panning
    if (isPanningRef.current) {
      const { x: px, y: py, ox, oy } = panStartRef.current;
      setAppState(s => ({
        ...s,
        offsetX: ox + (e.clientX - px),
        offsetY: oy + (e.clientY - py),
      }));
      return;
    }

    if (!pointerDownRef.current) {
      // Update cursor
      updateCursor(x, y);
      return;
    }

    // Resize
    if (activeResizeHandle.current && selectedElements.length > 0) {
      const handle = activeResizeHandle.current;
      const next = elements.map(el => {
        if (!appState.selectedElementIds.has(el.id)) return el;
        const resized = applyResize(el, handle, dx, dy);
        return { ...el, ...resized };
      });
      setElements(next);
      return;
    }

    // Move
    if (movingRef.current && appState.selectedElementIds.size > 0) {
      const next = elements.map(el => {
        if (!appState.selectedElementIds.has(el.id)) return el;
        return { ...el, x: el.x + dx, y: el.y + dy };
      });
      setElements(next);
      return;
    }

    // Selection box
    if (selBoxRef.current) {
      selBoxRef.current = { ...selBoxRef.current, x2: x, y2: y };
      return;
    }

    // Drawing
    const drawing = drawingElRef.current;
    if (!drawing) return;

    if (drawing.type === 'freedraw') {
      const lastPt = drawing.points![drawing.points!.length - 1];
      const newPt: [number, number] = [x - drawing.x, y - drawing.y];
      drawingElRef.current = {
        ...drawing,
        points: [...drawing.points!, newPt],
        width: x - drawing.x,
        height: y - drawing.y,
      };
    } else if (drawing.type === 'line' || drawing.type === 'arrow') {
      const snap = e.shiftKey;
      let endX = x - drawing.x;
      let endY = y - drawing.y;
      if (snap) {
        const angle = Math.atan2(endY, endX);
        const snap45 = Math.round(angle / (Math.PI / 4)) * (Math.PI / 4);
        const len = Math.hypot(endX, endY);
        endX = len * Math.cos(snap45);
        endY = len * Math.sin(snap45);
      }
      drawingElRef.current = {
        ...drawing,
        points: [[0, 0], [endX, endY]],
        width: endX,
        height: endY,
      };
    } else {
      const snap = e.shiftKey;
      let w = x - drawing.x;
      let h = y - drawing.y;
      if (snap) {
        const size = Math.max(Math.abs(w), Math.abs(h));
        w = Math.sign(w) * size;
        h = Math.sign(h) * size;
      }
      drawingElRef.current = { ...drawing, width: w, height: h };
    }
  }, [appState, elements, selectedElements, toWorld, setElements]);

  const updateCursor = useCallback((wx: number, wy: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const tool = appState.tool;
    if (tool === 'hand' || spacePressedRef.current) { canvas.style.cursor = 'grab'; return; }
    if (tool === 'text') { canvas.style.cursor = 'text'; return; }
    if (tool === 'eraser') { canvas.style.cursor = 'cell'; return; }
    if (tool !== 'selection') { canvas.style.cursor = 'crosshair'; return; }

    // Check handles
    if (selectedElements.length > 0) {
      const mb = getMultiElementBounds(selectedElements);
      const hb = {
        x: mb.x - 4 / appState.zoom,
        y: mb.y - 4 / appState.zoom,
        width: mb.width + 8 / appState.zoom,
        height: mb.height + 8 / appState.zoom,
      };
      const handle = hitTestHandle(wx, wy, hb, appState.zoom);
      if (handle) {
        const cursors: Record<string, string> = {
          nw: 'nw-resize', n: 'n-resize', ne: 'ne-resize',
          e: 'e-resize', se: 'se-resize', s: 's-resize',
          sw: 'sw-resize', w: 'w-resize',
        };
        canvas.style.cursor = cursors[handle] || 'default';
        return;
      }
    }

    const hit = getTopElementAtPoint(elements, wx, wy);
    canvas.style.cursor = hit ? 'move' : 'default';
  }, [appState, elements, selectedElements]);

  const onPointerUp = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    if (isPanningRef.current) {
      isPanningRef.current = false;
      return;
    }

    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    const { x, y } = toWorld(sx, sy);

    // Finish resize
    if (activeResizeHandle.current) {
      activeResizeHandle.current = null;
      commit(elements);
      return;
    }

    // Finish moving
    if (movingRef.current) {
      movingRef.current = false;
      commit(elements);
      return;
    }

    // Finish selection box
    if (selBoxRef.current) {
      const { x1, y1, x2, y2 } = selBoxRef.current;
      const boxSelected = getElementsInBox(elements, x1, y1, x2, y2);
      if (boxSelected.length > 0) {
        setAppState(s => ({
          ...s,
          selectedElementIds: new Set([
            ...(e.shiftKey ? s.selectedElementIds : []),
            ...boxSelected.map(el => el.id),
          ]),
        }));
      }
      selBoxRef.current = null;
      pointerDownRef.current = false;
      return;
    }

    // Finish drawing
    const drawing = drawingElRef.current;
    if (drawing) {
      const minSize = 2;
      let el = normalizeElement(drawing);
      const isPoint = Math.abs(el.width) < minSize && Math.abs(el.height) < minSize;

      if (el.type === 'freedraw') {
        if (el.points && el.points.length < 3) {
          drawingElRef.current = null;
          pointerDownRef.current = false;
          return;
        }
        // Compute bounding box from points
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        el.points!.forEach(([px, py]) => {
          minX = Math.min(minX, px); minY = Math.min(minY, py);
          maxX = Math.max(maxX, px); maxY = Math.max(maxY, py);
        });
        el = { ...el, width: maxX - minX, height: maxY - minY };
      } else if ((el.type === 'line' || el.type === 'arrow') && isPoint) {
        drawingElRef.current = null;
        pointerDownRef.current = false;
        return;
      } else if (isPoint && el.type !== 'text') {
        // Minimum size
        el = { ...el, width: 100, height: 100 };
      }

      const next = [...elements, el];
      commit(next);
      setAppState(s => ({
        ...s,
        selectedElementIds: new Set([el.id]),
        // If tool locked, keep current tool; freedraw always stays; else switch to selection
        tool: toolLocked ? s.tool : 'selection',
      }));
      drawingElRef.current = null;
    }

    pointerDownRef.current = false;
  }, [elements, toWorld, commit]);

  const onDoubleClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    const { x, y } = toWorld(sx, sy);

    const hit = getTopElementAtPoint(elements, x, y);
    if (hit?.type === 'text') {
      openTextEditor(hit);
    } else if (!hit) {
      // Create text element on double-click on empty canvas
      const el = newElement('text', x, y, appState);
      const next = [...elements, el];
      commit(next);
      setAppState(s => ({ ...s, selectedElementIds: new Set([el.id]), tool: 'selection' }));
      openTextEditor(el);
    }
  }, [elements, toWorld, appState, commit, openTextEditor]);

  const onContextMenu = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY });
  }, []);

  // ── Zoom controls ─────────────────────────────────────────────────────────

  const zoomIn = () => setAppState(s => ({ ...s, zoom: Math.min(s.zoom + ZOOM_STEP, MAX_ZOOM) }));
  const zoomOut = () => setAppState(s => ({ ...s, zoom: Math.max(s.zoom - ZOOM_STEP, MIN_ZOOM) }));
  const zoomReset = () => setAppState(s => ({ ...s, zoom: 1, offsetX: 0, offsetY: 0 }));
  const fitToScreen = () => {
    const vis = elements.filter(el => !el.isDeleted);
    if (!vis.length) return zoomReset();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const b = getMultiElementBounds(vis);
    const cw = canvas.clientWidth, ch = canvas.clientHeight;
    const MARGIN = 80;
    const newZoom = Math.min((cw - MARGIN * 2) / b.width, (ch - MARGIN * 2) / b.height, MAX_ZOOM);
    const ox = (cw - b.width * newZoom) / 2 - b.x * newZoom;
    const oy = (ch - b.height * newZoom) / 2 - b.y * newZoom;
    setAppState(s => ({ ...s, zoom: newZoom, offsetX: ox, offsetY: oy }));
  };

  // ── Prop updates (apply to selection + set default) ───────────────────────

  const onPropUpdate = useCallback((updates: Partial<AppState>) => {
    setAppState(s => ({ ...s, ...updates }));
    if (appState.selectedElementIds.size > 0) {
      const elUpdates: Partial<ExcalidrawElement> = {};
      if ('strokeColor' in updates) elUpdates.strokeColor = updates.strokeColor;
      if ('backgroundColor' in updates) elUpdates.backgroundColor = updates.backgroundColor;
      if ('fillStyle' in updates) elUpdates.fillStyle = updates.fillStyle;
      if ('strokeWidth' in updates) elUpdates.strokeWidth = updates.strokeWidth;
      if ('strokeStyle' in updates) elUpdates.strokeStyle = updates.strokeStyle;
      if ('roughness' in updates) elUpdates.roughness = updates.roughness;
      if ('opacity' in updates) elUpdates.opacity = updates.opacity;
      if ('fontSize' in updates) elUpdates.fontSize = updates.fontSize;
      if ('fontFamily' in updates) elUpdates.fontFamily = updates.fontFamily;
      if ('textAlign' in updates) elUpdates.textAlign = updates.textAlign;
      if ('startArrowhead' in updates) elUpdates.startArrowhead = updates.startArrowhead;
      if ('endArrowhead' in updates) elUpdates.endArrowhead = updates.endArrowhead;
      if (Object.keys(elUpdates).length > 0) {
        const next = elements.map(el =>
          appState.selectedElementIds.has(el.id) ? { ...el, ...elUpdates } : el
        );
        commit(next);
      }
    }
  }, [appState, elements, commit]);

  // ── Sync appState from selection ──────────────────────────────────────────

  useEffect(() => {
    if (selectedElements.length === 1) {
      const el = selectedElements[0];
      setAppState(s => ({
        ...s,
        strokeColor: el.strokeColor,
        backgroundColor: el.backgroundColor,
        fillStyle: el.fillStyle,
        strokeWidth: el.strokeWidth,
        strokeStyle: el.strokeStyle,
        roughness: el.roughness,
        opacity: el.opacity,
        ...(el.type === 'text' ? {
          fontSize: el.fontSize || s.fontSize,
          fontFamily: el.fontFamily || s.fontFamily,
          textAlign: el.textAlign || s.textAlign,
        } : {}),
        ...(el.type === 'arrow' ? {
          startArrowhead: el.startArrowhead ?? null,
          endArrowhead: el.endArrowhead ?? 'arrow',
        } : {}),
      }));
    }
  }, [selectedElements[0]?.id ?? null]);

  // ── Derive selection context for adaptive properties panel ───────────────

  const selectionContext = (() => {
    if (selectedElements.length === 0) return 'none' as const;
    const types = new Set(selectedElements.map(el => el.type));
    if (types.size > 1) return 'mixed' as const;
    const t = [...types][0];
    if (t === 'text') return 'text' as const;
    if (t === 'line' || t === 'arrow') return 'line' as const;
    return 'shape' as const;
  })();

  // ── Theme ─────────────────────────────────────────────────────────────────

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', appState.theme);
  }, [appState.theme]);

  // ── Render ────────────────────────────────────────────────────────────────

  const toggleTheme = () => setAppState(s => {
    const next = s.theme === 'light' ? 'dark' : 'light';
    const defaultStroke = next === 'dark' ? '#ffffff' : '#1e1e1e';
    const currentIsDefault = s.strokeColor === '#1e1e1e' || s.strokeColor === '#ffffff';
    return { ...s, theme: next, strokeColor: currentIsDefault ? defaultStroke : s.strokeColor };
  });

  const clearCanvas = () => {
    if (window.confirm('Clear canvas? This cannot be undone.')) {
      commit([]);
      setAppState(s => ({ ...s, selectedElementIds: new Set() }));
      setShowWelcome(true);
    }
  };

  return (
    <div className="app" onClick={() => setContextMenu(null)}>
      {/* Canvas */}
      <div className="canvas-container">
        <canvas
          ref={canvasRef}
          className="main-canvas"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onDoubleClick={onDoubleClick}
          onContextMenu={onContextMenu}
          style={{
            background: appState.theme === 'dark' ? '#121212' : '#f5f5f5',
            cursor: appState.tool === 'hand' ? 'grab'
              : appState.tool === 'text' ? 'text'
              : appState.tool === 'eraser' ? 'cell'
              : appState.tool !== 'selection' ? 'crosshair'
              : 'default',
          }}
        />
      </div>

      {/* Welcome is rendered on the canvas via renderWelcome() — not an HTML overlay */}

      {/* Text editor overlay */}
      {textEditing && (
        <div className="text-editor-container">
          <textarea
            ref={textareaRef}
            className="text-editor"
            style={{
              left: textEditing.x,
              top: textEditing.y,
              fontSize: textEditing.fontSize,
              fontFamily: textEditing.fontFamily,
              textAlign: textEditing.textAlign as any,
              color: textEditing.color,
              minWidth: Math.max(textEditing.width, 80),
              lineHeight: 1.25,
              position: 'fixed',
            }}
            onBlur={commitText}
            onKeyDown={e => {
              if (e.key === 'Escape') { e.preventDefault(); commitText(); }
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); commitText(); }
              e.stopPropagation();
            }}
            onChange={() => {
              if (textareaRef.current) {
                textareaRef.current.style.height = 'auto';
                textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
                textareaRef.current.style.width = 'auto';
                textareaRef.current.style.width = Math.max(textareaRef.current.scrollWidth, 80) + 'px';
              }
            }}
          />
        </div>
      )}

      {/* ── UI chrome (hidden in zen mode) ── */}
      {!zenMode && (
        <>
          {/* Hamburger menu — top left */}
          <HamburgerMenu
            open={hamburgerOpen}
            onToggle={() => setHamburgerOpen(o => !o)}
            onClose={() => setHamburgerOpen(false)}
            theme={appState.theme}
            onToggleTheme={toggleTheme}
            zenMode={zenMode}
            onToggleZen={() => setZenMode(z => !z)}
            onExport={() => exportToPng(elements, appState.theme)}
            onClearCanvas={clearCanvas}
            canUndo={canUndo}
            canRedo={canRedo}
            onUndo={undo}
            onRedo={redo}
          />

          {/* Horizontal toolbar — top center */}
          <HorizontalToolbar
            tool={appState.tool}
            locked={toolLocked}
            onToolChange={(t) => {
              dismissWelcome();
              setAppState(s => ({ ...s, tool: t, selectedElementIds: new Set() }));
            }}
            onToggleLock={() => setToolLocked(l => !l)}
          />

          {/* Properties panel — right */}
          <PropertiesPanel
            state={appState}
            context={selectionContext}
            onUpdate={onPropUpdate}
          />

          {/* Bottom bar — zoom + undo/redo */}
          <div className="bottom-bar">
            <div className="bbar-group">
              <button className="bbar-btn" onClick={undo} disabled={!canUndo} title="Undo (⌘Z)">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 7v6h6"/><path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13"/>
                </svg>
              </button>
              <button className="bbar-btn" onClick={redo} disabled={!canRedo} title="Redo (⌘⇧Z)">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 7v6h-6"/><path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3L21 13"/>
                </svg>
              </button>
            </div>
            <div className="bbar-group">
              <button className="bbar-btn" onClick={zoomOut} title="Zoom out (-)">−</button>
              <span className="bbar-zoom-label" onClick={zoomReset} title="Reset zoom (click)">
                {Math.round(appState.zoom * 100)}%
              </span>
              <button className="bbar-btn" onClick={zoomIn} title="Zoom in (+)">+</button>
              <button className="bbar-btn" onClick={fitToScreen} title="Fit to screen" style={{ fontSize: 10, width: 32 }}>Fit</button>
            </div>
          </div>
        </>
      )}

      {/* Zen mode exit hint */}
      {zenMode && (
        <button className="zen-exit" onClick={() => setZenMode(false)}>
          Exit Zen · Esc
        </button>
      )}

      {/* Context menu */}
      {contextMenu && (
        <div
          className="context-menu"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onClick={e => e.stopPropagation()}
        >
          {appState.selectedElementIds.size > 0 && <>
            <button className="ctx-item" onClick={() => {
              const sel = elements.filter(el => appState.selectedElementIds.has(el.id) && !el.isDeleted);
              if (sel.length) sessionStorage.setItem('esdraw_clipboard', JSON.stringify(sel));
              setContextMenu(null);
            }}>
              Copy <span className="ctx-shortcut">⌘C</span>
            </button>
            <button className="ctx-item" onClick={() => {
              const sel = elements.filter(el => appState.selectedElementIds.has(el.id) && !el.isDeleted);
              if (sel.length) {
                const newEls = sel.map(el => ({ ...el, id: nanoid(), x: el.x + 20, y: el.y + 20 }));
                commit([...elements, ...newEls]);
                setAppState(s => ({ ...s, selectedElementIds: new Set(newEls.map(el => el.id)) }));
              }
              setContextMenu(null);
            }}>
              Duplicate <span className="ctx-shortcut">⌘D</span>
            </button>
            <div className="ctx-sep" />
            <button className="ctx-item" onClick={() => {
              const sel = elements.filter(el => appState.selectedElementIds.has(el.id));
              const rest = elements.filter(el => !appState.selectedElementIds.has(el.id));
              commit([...rest, ...sel]);
              setContextMenu(null);
            }}>Bring to front</button>
            <button className="ctx-item" onClick={() => {
              const sel = elements.filter(el => appState.selectedElementIds.has(el.id));
              const rest = elements.filter(el => !appState.selectedElementIds.has(el.id));
              commit([...sel, ...rest]);
              setContextMenu(null);
            }}>Send to back</button>
            <div className="ctx-sep" />
            <button className="ctx-item danger" onClick={() => {
              const next = elements.map(el =>
                appState.selectedElementIds.has(el.id) ? { ...el, isDeleted: true } : el
              );
              commit(next);
              setAppState(s => ({ ...s, selectedElementIds: new Set() }));
              setContextMenu(null);
            }}>
              Delete <span className="ctx-shortcut">Del</span>
            </button>
          </>}
          {appState.selectedElementIds.size === 0 && <>
            <button className="ctx-item" onClick={() => {
              const raw = sessionStorage.getItem('esdraw_clipboard');
              if (!raw) return;
              try {
                const copied: ExcalidrawElement[] = JSON.parse(raw);
                const newEls = copied.map(el => ({ ...el, id: nanoid(), x: el.x + 20, y: el.y + 20 }));
                commit([...elements, ...newEls]);
                setAppState(s => ({ ...s, selectedElementIds: new Set(newEls.map(el => el.id)) }));
              } catch {}
              setContextMenu(null);
            }}>
              Paste <span className="ctx-shortcut">⌘V</span>
            </button>
            <button className="ctx-item" onClick={() => {
              setAppState(s => ({
                ...s,
                selectedElementIds: new Set(elements.filter(el => !el.isDeleted).map(el => el.id)),
              }));
              setContextMenu(null);
            }}>
              Select all <span className="ctx-shortcut">⌘A</span>
            </button>
          </>}
        </div>
      )}
    </div>
  );
}
