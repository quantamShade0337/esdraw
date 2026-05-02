import React, { useRef, useEffect } from 'react';

interface Props {
  open: boolean;
  onToggle: () => void;
  onClose: () => void;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  zenMode: boolean;
  onToggleZen: () => void;
  onExport: () => void;
  onClearCanvas: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
}

interface ItemProps {
  icon: React.ReactNode;
  label: string;
  shortcut?: string;
  onClick: () => void;
  active?: boolean;
  danger?: boolean;
  disabled?: boolean;
}

const MenuItem: React.FC<ItemProps> = ({ icon, label, shortcut, onClick, active, danger, disabled }) => (
  <button
    className={`hmenu-item${active ? ' active' : ''}${danger ? ' danger' : ''}`}
    onClick={onClick}
    disabled={disabled}
  >
    <span className="hmenu-icon">{icon}</span>
    <span className="hmenu-label">{label}</span>
    {shortcut && <span className="hmenu-shortcut">{shortcut}</span>}
    {active && (
      <svg className="hmenu-check" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <path d="M2 8l4 4 8-8" />
      </svg>
    )}
  </button>
);

export const HamburgerMenu: React.FC<Props> = ({
  open, onToggle, onClose, theme, onToggleTheme,
  zenMode, onToggleZen, onExport, onClearCanvas,
  canUndo, canRedo, onUndo, onRedo,
}) => {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open, onClose]);

  return (
    <div className="hamburger-root" ref={menuRef}>
      <button className="hamburger-btn" onClick={onToggle} title="Menu">
        <span /><span /><span />
      </button>

      {open && (
        <div className="hmenu-panel">
          {/* Undo / Redo */}
          <MenuItem
            icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7v6h6"/><path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13"/></svg>}
            label="Undo"
            shortcut="⌘Z"
            onClick={() => { onUndo(); onClose(); }}
            disabled={!canUndo}
          />
          <MenuItem
            icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 7v6h-6"/><path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3L21 13"/></svg>}
            label="Redo"
            shortcut="⌘⇧Z"
            onClick={() => { onRedo(); onClose(); }}
            disabled={!canRedo}
          />

          <div className="hmenu-sep" />

          {/* Export */}
          <MenuItem
            icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>}
            label="Export image…"
            onClick={() => { onExport(); onClose(); }}
          />

          <div className="hmenu-sep" />

          {/* Zen mode */}
          <MenuItem
            icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M8 12a4 4 0 0 0 8 0"/></svg>}
            label="Zen mode"
            shortcut="Alt Z"
            onClick={() => { onToggleZen(); onClose(); }}
            active={zenMode}
          />

          {/* Dark mode */}
          <MenuItem
            icon={theme === 'dark'
              ? <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
              : <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
            }
            label={theme === 'dark' ? 'Light mode' : 'Dark mode'}
            onClick={() => { onToggleTheme(); onClose(); }}
          />

          <div className="hmenu-sep" />

          {/* Clear canvas */}
          <MenuItem
            icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>}
            label="Clear canvas"
            onClick={() => { onClearCanvas(); onClose(); }}
            danger
          />
        </div>
      )}
    </div>
  );
};
