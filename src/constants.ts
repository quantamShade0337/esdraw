export const COLORS = {
  black: '#1e1e1e',
  white: '#ffffff',
  transparent: 'transparent',
};

export const STROKE_COLORS = [
  '#1e1e1e',
  '#ffffff',
  '#e03131',
  '#c2255c',
  '#e8590c',
  '#f08c00',
  '#2f9e44',
  '#099268',
  '#1971c2',
  '#7048e8',
  '#0c8599',
];

export const BACKGROUND_COLORS = [
  'transparent',
  '#ffc9c9',
  '#fcc2d7',
  '#ffd8a8',
  '#ffec99',
  '#b2f2bb',
  '#96f2d7',
  '#a5d8ff',
  '#d0bfff',
  '#99e9f2',
  '#e9ecef',
  '#ffffff',
];

export const FONT_FAMILIES = {
  virgil: 'Virgil, "Comic Sans MS", cursive',
  helvetica: '-apple-system, BlinkMacSystemFont, "Helvetica Neue", Helvetica, Arial, sans-serif',
  cascadia: '"Cascadia Code", "Cascadia Mono", "Courier New", monospace',
};

export const HANDLE_SIZE = 8;
export const HANDLE_HIT_AREA = 12;
export const MIN_ELEMENT_SIZE = 2;
export const ZOOM_STEP = 0.1;
export const MAX_ZOOM = 30;
export const MIN_ZOOM = 0.1;

export const DEFAULT_APP_STATE = {
  tool: 'selection' as const,
  zoom: 1,
  offsetX: 0,
  offsetY: 0,
  selectedElementIds: new Set<string>(),
  editingElementId: null,
  theme: 'light' as const,
  strokeColor: '#1e1e1e',
  backgroundColor: 'transparent',
  fillStyle: 'hachure' as const,
  strokeWidth: 2,
  strokeStyle: 'solid' as const,
  roughness: 1,
  opacity: 100,
  fontSize: 20,
  fontFamily: 'virgil' as const,
  textAlign: 'left' as const,
  startArrowhead: null as null,
  endArrowhead: 'arrow' as const,
};

export const TOOL_SHORTCUTS: Record<string, string> = {
  'v': 'selection',
  '1': 'selection',
  'h': 'hand',
  '2': 'hand',
  'r': 'rectangle',
  '3': 'rectangle',
  'd': 'diamond',
  '4': 'diamond',
  'o': 'ellipse',
  '5': 'ellipse',
  'a': 'arrow',
  '6': 'arrow',
  'l': 'line',
  '7': 'line',
  'p': 'freedraw',
  '8': 'freedraw',
  't': 'text',
  '9': 'text',
  'e': 'eraser',
  '0': 'eraser',
};
