export type ToolType =
  | 'selection'
  | 'hand'
  | 'rectangle'
  | 'diamond'
  | 'ellipse'
  | 'arrow'
  | 'line'
  | 'freedraw'
  | 'text'
  | 'eraser';

export type FillStyle = 'hachure' | 'cross-hatch' | 'solid' | 'none';
export type StrokeStyle = 'solid' | 'dashed' | 'dotted';
export type TextAlign = 'left' | 'center' | 'right';
export type FontFamily = 'virgil' | 'helvetica' | 'cascadia';
export type Arrowhead = 'arrow' | 'dot' | 'bar' | null;

export type ElementType =
  | 'rectangle'
  | 'diamond'
  | 'ellipse'
  | 'arrow'
  | 'line'
  | 'freedraw'
  | 'text';

export interface ExcalidrawElement {
  id: string;
  type: ElementType;
  x: number;
  y: number;
  width: number;
  height: number;
  angle: number;
  strokeColor: string;
  backgroundColor: string;
  fillStyle: FillStyle;
  strokeWidth: number;
  strokeStyle: StrokeStyle;
  roughness: number;
  opacity: number;
  seed: number;
  isDeleted: boolean;
  // line/arrow: relative points from (x,y), first is always [0,0]
  points?: [number, number][];
  startArrowhead?: Arrowhead;
  endArrowhead?: Arrowhead;
  // text
  text?: string;
  fontSize?: number;
  fontFamily?: FontFamily;
  textAlign?: TextAlign;
  // freedraw
  pressures?: number[];
  simulatePressure?: boolean;
}

export interface AppState {
  tool: ToolType;
  zoom: number;
  offsetX: number;
  offsetY: number;
  selectedElementIds: Set<string>;
  editingElementId: string | null;
  theme: 'light' | 'dark';
  // current drawing defaults
  strokeColor: string;
  backgroundColor: string;
  fillStyle: FillStyle;
  strokeWidth: number;
  strokeStyle: StrokeStyle;
  roughness: number;
  opacity: number;
  fontSize: number;
  fontFamily: FontFamily;
  textAlign: TextAlign;
  startArrowhead: Arrowhead;
  endArrowhead: Arrowhead;
}

export interface Point {
  x: number;
  y: number;
}

export interface Bounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export type ResizeHandle =
  | 'nw' | 'n' | 'ne'
  | 'e'
  | 'se' | 's' | 'sw'
  | 'w';

export const RESIZE_HANDLES: ResizeHandle[] = ['nw','n','ne','e','se','s','sw','w'];
