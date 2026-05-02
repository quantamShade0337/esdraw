import React from 'react';

interface Props {
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onExport: () => void;
  onClearCanvas: () => void;
  canUndo: boolean;
  canRedo: boolean;
}

export const TopBar: React.FC<Props> = ({
  theme, onToggleTheme, onUndo, onRedo, onExport, onClearCanvas, canUndo, canRedo,
}) => (
  <div className="topbar">
    <span className="logo-text">ESDraw</span>
    <div className="topbar-sep" />

    <button className="topbar-btn" onClick={onUndo} disabled={!canUndo} title="Undo (⌘Z)">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 7v6h6" /><path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13" />
      </svg>
    </button>
    <button className="topbar-btn" onClick={onRedo} disabled={!canRedo} title="Redo (⌘⇧Z)">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 7v6h-6" /><path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3L21 13" />
      </svg>
    </button>

    <div className="topbar-sep" />

    <button className="topbar-btn" onClick={onToggleTheme} title="Toggle theme">
      {theme === 'light' ? (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="5" />
          <line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" />
          <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
          <line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" />
          <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
        </svg>
      )}
      {theme === 'light' ? 'Dark' : 'Light'}
    </button>

    <div className="topbar-sep" />

    <button className="topbar-btn" onClick={onExport} title="Export as PNG">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="7 10 12 15 17 10" />
        <line x1="12" y1="15" x2="12" y2="3" />
      </svg>
      Export PNG
    </button>
    <button className="topbar-btn danger" onClick={onClearCanvas} title="Clear canvas">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="3 6 5 6 21 6" />
        <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
        <path d="M10 11v6" /><path d="M14 11v6" />
        <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
      </svg>
      Clear
    </button>
  </div>
);
