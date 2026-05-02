import React from 'react';
import { AppState, StrokeStyle, FontFamily, TextAlign, Arrowhead } from '../types';
import { STROKE_COLORS } from '../constants';

export type SelectionContext = 'none' | 'text' | 'shape' | 'line' | 'mixed';

interface Props {
  state: AppState;
  context: SelectionContext;
  onUpdate: (updates: Partial<AppState>) => void;
}

// ── Small reusable sub-components ────────────────────────────────────────────

const ColorSwatch: React.FC<{ color: string; selected: boolean; onClick: () => void }> = ({
  color, selected, onClick,
}) => (
  <button
    className={`color-swatch${selected ? ' selected' : ''}`}
    style={{ background: color }}
    title={color}
    onClick={onClick}
  />
);

const SegBtn: React.FC<{
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  title?: string;
}> = ({ active, onClick, children, title }) => (
  <button className={`seg-btn${active ? ' active' : ''}`} onClick={onClick} title={title}>
    {children}
  </button>
);

function StrokeIcon({ style }: { style: StrokeStyle }) {
  if (style === 'dashed') return (
    <svg viewBox="0 0 24 6" fill="none">
      <path d="M1 3h5M10 3h5M19 3h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
  if (style === 'dotted') return (
    <svg viewBox="0 0 24 6" fill="none">
      <circle cx="3" cy="3" r="1.5" fill="currentColor" />
      <circle cx="9" cy="3" r="1.5" fill="currentColor" />
      <circle cx="15" cy="3" r="1.5" fill="currentColor" />
      <circle cx="21" cy="3" r="1.5" fill="currentColor" />
    </svg>
  );
  return (
    <svg viewBox="0 0 24 6" fill="none">
      <path d="M1 3h22" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function arrowheadIcon(ah: Arrowhead, side: 'left' | 'right') {
  if (!ah) return (
    <svg viewBox="0 0 20 10" fill="none">
      <path d="M2 5h16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
  if (ah === 'arrow') return (
    <svg viewBox="0 0 20 10" fill="none">
      {side === 'right'
        ? <><path d="M2 5h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /><path d="M12 2l4 3-4 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></>
        : <><path d="M18 5H4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /><path d="M8 2L4 5l4 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></>}
    </svg>
  );
  if (ah === 'dot') return (
    <svg viewBox="0 0 20 10" fill="none">
      <path d="M6 5h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx={side === 'right' ? 15 : 5} cy="5" r="2.5" fill="currentColor" />
    </svg>
  );
  return (
    <svg viewBox="0 0 20 10" fill="none">
      <path d="M2 5h16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d={side === 'right' ? 'M16 2v6' : 'M4 2v6'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

// ── Section blocks ────────────────────────────────────────────────────────────

const StrokeColorSection: React.FC<{ state: AppState; onUpdate: Props['onUpdate']; label?: string }> = ({
  state, onUpdate, label = 'Stroke',
}) => (
  <div>
    <div className="prop-section-title">{label}</div>
    <div className="color-grid">
      {STROKE_COLORS.map(c => (
        <ColorSwatch
          key={c}
          color={c}
          selected={state.strokeColor === c}
          onClick={() => onUpdate({ strokeColor: c })}
        />
      ))}
    </div>
  </div>
);

const StrokeWidthSection: React.FC<{ state: AppState; onUpdate: Props['onUpdate'] }> = ({ state, onUpdate }) => (
  <div>
    <div className="prop-section-title">Stroke width</div>
    <div className="seg-control">
      {([1, 2, 4] as const).map(w => (
        <SegBtn key={w} active={state.strokeWidth === w} onClick={() => onUpdate({ strokeWidth: w })} title={`${w}px`}>
          <svg viewBox="0 0 20 20" fill="none">
            <path d="M2 10h16" stroke="currentColor" strokeWidth={w + 0.5} strokeLinecap="round" />
          </svg>
        </SegBtn>
      ))}
    </div>
  </div>
);

const StrokeStyleSection: React.FC<{ state: AppState; onUpdate: Props['onUpdate'] }> = ({ state, onUpdate }) => (
  <div>
    <div className="prop-section-title">Stroke style</div>
    <div className="seg-control">
      {(['solid', 'dashed', 'dotted'] as StrokeStyle[]).map(s => (
        <SegBtn key={s} active={state.strokeStyle === s} onClick={() => onUpdate({ strokeStyle: s })} title={s}>
          <StrokeIcon style={s} />
        </SegBtn>
      ))}
    </div>
  </div>
);

const RoughnessSection: React.FC<{ state: AppState; onUpdate: Props['onUpdate'] }> = ({ state, onUpdate }) => (
  <div>
    <div className="prop-section-title">Roughness</div>
    <div className="seg-control">
      {([0, 1, 2] as const).map((r, i) => (
        <SegBtn
          key={r}
          active={state.roughness === r}
          onClick={() => onUpdate({ roughness: r })}
          title={['Architect', 'Artist', 'Cartoonist'][i]}
        >
          <svg viewBox="0 0 20 14" fill="none">
            {r === 0 && <path d="M2 7h16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />}
            {r === 1 && <path d="M2 9c2-4 4 4 6 0s4-4 6 0 2 0 4-2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" fill="none" />}
            {r === 2 && <path d="M2 9c1-5 3 5 5-1 2-6 4 6 5 0s2-3 4-1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" fill="none" />}
          </svg>
        </SegBtn>
      ))}
    </div>
  </div>
);

const OpacitySection: React.FC<{ state: AppState; onUpdate: Props['onUpdate'] }> = ({ state, onUpdate }) => (
  <div>
    <div className="prop-section-title">Opacity</div>
    <div className="slider-row">
      <input
        type="range" className="prop-slider"
        min={0} max={100} step={1}
        value={state.opacity}
        onChange={e => onUpdate({ opacity: Number(e.target.value) })}
      />
      <span className="slider-val">{state.opacity}</span>
    </div>
  </div>
);

const FontSection: React.FC<{ state: AppState; onUpdate: Props['onUpdate'] }> = ({ state, onUpdate }) => (
  <>
    <div>
      <div className="prop-section-title">Font</div>
      <div className="prop-row">
        {(['virgil', 'helvetica', 'cascadia'] as FontFamily[]).map(f => (
          <button
            key={f}
            className={`font-btn font-${f}${state.fontFamily === f ? ' active' : ''}`}
            onClick={() => onUpdate({ fontFamily: f })}
            title={f}
          >
            {f === 'virgil' ? 'Va' : f === 'helvetica' ? 'Aa' : '</>'}
          </button>
        ))}
      </div>
    </div>
    <div>
      <div className="prop-section-title">Size</div>
      <div className="seg-control">
        {([['S', 16], ['M', 24], ['L', 36], ['XL', 48]] as [string, number][]).map(([label, size]) => (
          <SegBtn
            key={label}
            active={state.fontSize === size}
            onClick={() => onUpdate({ fontSize: size })}
            title={`${size}px`}
          >
            <span style={{ fontSize: 11, fontWeight: 600 }}>{label}</span>
          </SegBtn>
        ))}
      </div>
    </div>
    <div>
      <div className="prop-section-title">Align</div>
      <div className="seg-control">
        {(['left', 'center', 'right'] as TextAlign[]).map(a => (
          <SegBtn key={a} active={state.textAlign === a} onClick={() => onUpdate({ textAlign: a })} title={a}>
            <svg viewBox="0 0 20 14" fill="none">
              {a === 'left' && <path d="M2 3h16M2 7h10M2 11h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />}
              {a === 'center' && <path d="M2 3h16M5 7h10M3 11h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />}
              {a === 'right' && <path d="M2 3h16M8 7h10M4 11h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />}
            </svg>
          </SegBtn>
        ))}
      </div>
    </div>
  </>
);

const ArrowheadsSection: React.FC<{ state: AppState; onUpdate: Props['onUpdate'] }> = ({ state, onUpdate }) => (
  <div>
    <div className="prop-section-title">Arrowheads</div>
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {(['start', 'end'] as const).map(end => (
        <div key={end}>
          <div className="prop-label" style={{ marginBottom: 4, fontSize: 11, color: 'var(--text-muted)' }}>
            {end.charAt(0).toUpperCase() + end.slice(1)}
          </div>
          <div className="seg-control">
            {([null, 'arrow', 'dot', 'bar'] as Arrowhead[]).map(ah => (
              <SegBtn
                key={String(ah)}
                active={(end === 'start' ? state.startArrowhead : state.endArrowhead) === ah}
                onClick={() => onUpdate(end === 'start' ? { startArrowhead: ah } : { endArrowhead: ah })}
                title={ah ?? 'none'}
              >
                {arrowheadIcon(ah, end === 'end' ? 'right' : 'left')}
              </SegBtn>
            ))}
          </div>
        </div>
      ))}
    </div>
  </div>
);

// ── Main panel ────────────────────────────────────────────────────────────────

export const PropertiesPanel: React.FC<Props> = ({ state, context, onUpdate }) => {
  return (
    <div className="properties-panel">
      {/* TEXT selection */}
      {context === 'text' && (
        <>
          <StrokeColorSection state={state} onUpdate={onUpdate} label="Color" />
          <FontSection state={state} onUpdate={onUpdate} />
          <OpacitySection state={state} onUpdate={onUpdate} />
        </>
      )}

      {/* SHAPE selection or no selection (show drawing defaults) */}
      {(context === 'shape' || context === 'none') && (
        <>
          <StrokeColorSection state={state} onUpdate={onUpdate} />
          <StrokeWidthSection state={state} onUpdate={onUpdate} />
          <StrokeStyleSection state={state} onUpdate={onUpdate} />
          <RoughnessSection state={state} onUpdate={onUpdate} />
          <OpacitySection state={state} onUpdate={onUpdate} />
        </>
      )}

      {/* LINE / ARROW selection */}
      {context === 'line' && (
        <>
          <StrokeColorSection state={state} onUpdate={onUpdate} />
          <StrokeWidthSection state={state} onUpdate={onUpdate} />
          <StrokeStyleSection state={state} onUpdate={onUpdate} />
          <RoughnessSection state={state} onUpdate={onUpdate} />
          <OpacitySection state={state} onUpdate={onUpdate} />
          <ArrowheadsSection state={state} onUpdate={onUpdate} />
        </>
      )}

      {/* MIXED selection */}
      {context === 'mixed' && (
        <>
          <StrokeColorSection state={state} onUpdate={onUpdate} />
          <OpacitySection state={state} onUpdate={onUpdate} />
        </>
      )}
    </div>
  );
};
