import React from 'react';

interface Props {
  theme: 'light' | 'dark';
}

// Hand-drawn style curved arrows as SVG paths
const ArrowUpLeft = () => (
  <svg width="64" height="64" viewBox="0 0 64 64" fill="none" className="welcome-arrow">
    <path d="M56 56 Q36 44 20 24 Q14 16 12 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    <path d="M6 6 L12 8 L10 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const ArrowUp = () => (
  <svg width="48" height="56" viewBox="0 0 48 56" fill="none" className="welcome-arrow">
    <path d="M24 52 Q26 32 24 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    <path d="M18 8 L24 14 L30 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const ArrowDownRight = () => (
  <svg width="64" height="56" viewBox="0 0 64 56" fill="none" className="welcome-arrow">
    <path d="M8 8 Q28 20 48 36 Q54 42 54 50" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    <path d="M58 56 L54 50 L47 52" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

export const WelcomeScreen: React.FC<Props> = ({ theme }) => {
  const muted = theme === 'dark' ? 'rgba(200,200,220,0.45)' : 'rgba(100,100,130,0.5)';

  return (
    <div className="welcome-screen" aria-hidden="true">

      {/* Top-left hint → hamburger */}
      <div className="welcome-hint" style={{ top: 64, left: 24 }}>
        <p className="welcome-hint-text" style={{ color: muted }}>
          Export, preferences, ...
        </p>
        <div style={{ color: muted, marginTop: 4 }}>
          <ArrowUpLeft />
        </div>
      </div>

      {/* Top-center hint → toolbar */}
      <div className="welcome-hint" style={{
        top: 72, left: '50%', transform: 'translateX(-50%)', alignItems: 'center',
      }}>
        <div style={{ color: muted, marginBottom: 4 }}>
          <ArrowUp />
        </div>
        <p className="welcome-hint-text" style={{ color: muted, textAlign: 'center' }}>
          Pick a tool &<br />Start drawing!
        </p>
      </div>

      {/* Centre logo */}
      <div className="welcome-logo-area">
        <div className="welcome-logo-row">
          <img src="/icon.svg" alt="" className="welcome-logo-icon" />
          <span className="welcome-logo-text">ESDraw</span>
        </div>
        <p className="welcome-sub" style={{ color: muted }}>
          Your drawings are saved in your browser's storage.<br />
          Browser storage can be cleared unexpectedly.<br />
          <strong>Save your work as an image to keep it.</strong>
        </p>
      </div>

      {/* Bottom-right hint → hamburger for zen/shortcuts */}
      <div className="welcome-hint" style={{
        bottom: 64, right: 24, alignItems: 'flex-end',
      }}>
        <p className="welcome-hint-text" style={{ color: muted, textAlign: 'right' }}>
          Zen mode &<br />shortcuts
        </p>
        <div style={{ color: muted, marginTop: 4 }}>
          <ArrowDownRight />
        </div>
      </div>
    </div>
  );
};
