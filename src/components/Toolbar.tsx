import React from 'react';
import { ToolType } from '../types';

interface Props {
  tool: ToolType;
  onToolChange: (tool: ToolType) => void;
}

const tools: { id: ToolType; label: string; shortcut: string; icon: React.ReactNode }[] = [
  {
    id: 'selection', label: 'Selection', shortcut: 'V',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 4l7.5 18 3.5-7.5L22 11Z" />
      </svg>
    ),
  },
  {
    id: 'hand', label: 'Hand (Pan)', shortcut: 'H',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M7 11.5V5a1.5 1.5 0 0 1 3 0v4.5" />
        <path d="M10 4.5a1.5 1.5 0 0 1 3 0V9" />
        <path d="M13 5a1.5 1.5 0 0 1 3 0v5" />
        <path d="M16 8.5a1.5 1.5 0 0 1 3 0V14a7 7 0 0 1-14 0v-2.5a1.5 1.5 0 0 1 3 0V13" />
      </svg>
    ),
  },
];

const shapeTools: { id: ToolType; label: string; shortcut: string; icon: React.ReactNode }[] = [
  {
    id: 'rectangle', label: 'Rectangle', shortcut: 'R',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="2" />
      </svg>
    ),
  },
  {
    id: 'diamond', label: 'Diamond', shortcut: 'D',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2.7 10.3a2.41 2.41 0 0 0 0 3.41l7.59 7.59a2.41 2.41 0 0 0 3.41 0l7.59-7.59a2.41 2.41 0 0 0 0-3.41L13.7 2.71a2.41 2.41 0 0 0-3.41 0z" />
      </svg>
    ),
  },
  {
    id: 'ellipse', label: 'Ellipse', shortcut: 'O',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <ellipse cx="12" cy="12" rx="10" ry="7" />
      </svg>
    ),
  },
  {
    id: 'arrow', label: 'Arrow', shortcut: 'A',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="5" y1="19" x2="19" y2="5" />
        <polyline points="13 5 19 5 19 11" />
      </svg>
    ),
  },
  {
    id: 'line', label: 'Line', shortcut: 'L',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <line x1="5" y1="19" x2="19" y2="5" />
      </svg>
    ),
  },
  {
    id: 'freedraw', label: 'Draw', shortcut: 'P',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 20h9" />
        <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
      </svg>
    ),
  },
  {
    id: 'text', label: 'Text', shortcut: 'T',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="4 7 4 4 20 4 20 7" />
        <line x1="9" y1="20" x2="15" y2="20" />
        <line x1="12" y1="4" x2="12" y2="20" />
      </svg>
    ),
  },
  {
    id: 'eraser', label: 'Eraser', shortcut: 'E',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="m7 21-4.3-4.3c-1-1-1-2.5 0-3.4l9.6-9.6c1-1 2.5-1 3.4 0l5.6 5.6c1 1 1 2.5 0 3.4L13 21" />
        <path d="M22 21H7" />
        <path d="m5 11 9 9" />
      </svg>
    ),
  },
];

export const Toolbar: React.FC<Props> = ({ tool, onToolChange }) => (
  <div className="toolbar">
    {tools.map(t => (
      <button
        key={t.id}
        className={`tool-btn${tool === t.id ? ' active' : ''}`}
        title={`${t.label} (${t.shortcut})`}
        onClick={() => onToolChange(t.id)}
      >
        {t.icon}
        <span className="tool-shortcut">{t.shortcut}</span>
      </button>
    ))}
    <div className="toolbar-divider" />
    {shapeTools.map(t => (
      <button
        key={t.id}
        className={`tool-btn${tool === t.id ? ' active' : ''}`}
        title={`${t.label} (${t.shortcut})`}
        onClick={() => onToolChange(t.id)}
      >
        {t.icon}
        <span className="tool-shortcut">{t.shortcut}</span>
      </button>
    ))}
  </div>
);
