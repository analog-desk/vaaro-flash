import { useEffect, useState } from 'react';
import { Calculator, Camera, Film, GraduationCap, RotateCcw, Zap } from 'lucide-react';
import { useStore, type Tab } from './state/store';
import { CAMERAS } from './data/cameras';
import { QuickShoot } from './screens/QuickShoot';
import { FilmLibrary } from './screens/FilmLibrary';
import { FlashCalculator } from './screens/FlashCalculator';
import { Learn } from './screens/Learn';
import { Segmented, Sheet, cx } from './components/ui';
import type { CameraId } from './data/types';
import { fmtDistance } from './lib/format';

const TABS: { id: Tab; label: string; icon: typeof Zap }[] = [
  { id: 'shoot', label: 'Quick Shoot', icon: Zap },
  { id: 'films', label: 'Film Library', icon: Film },
  { id: 'flash', label: 'Flash Calc', icon: Calculator },
  { id: 'learn', label: 'Learn', icon: GraduationCap },
];

export function App() {
  const { state, dispatch } = useStore();
  const [camOpen, setCamOpen] = useState(false);
  const cam = CAMERAS[state.camera];
  // New screen, start at the top (one-handed use: no hunting for where you were).
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [state.tab, state.step]);

  return (
    <div className="mx-auto flex min-h-full max-w-xl flex-col">
      <header className="safe-top sticky top-0 z-30 border-b border-line bg-bg/95 backdrop-blur">
        <div className="safe-x flex h-14 items-center gap-2">
          <div className="mr-auto flex shrink-0 items-baseline gap-2">
            <span className="whitespace-nowrap font-display text-xl font-bold tracking-wide">
              Vaaro <span className="text-accent">Flash</span>
            </span>
          </div>
          <button
            type="button"
            onClick={() => setCamOpen(true)}
            className="flex min-h-10 items-center gap-1.5 whitespace-nowrap rounded-full border border-line bg-surface px-3 text-sm font-semibold"
            aria-label={`Camera: ${cam.name}. Change camera`}
          >
            <Camera size={16} className="text-accent" aria-hidden />
            {cam.shortName}
          </button>
          <button
            type="button"
            onClick={() => dispatch({ type: 'units', units: state.units === 'm' ? 'ft' : 'm' })}
            className="min-h-10 min-w-10 rounded-full border border-line bg-surface px-2.5 text-sm font-semibold tnum"
            aria-label={`Units: ${state.units === 'm' ? 'metres' : 'feet'}. Switch`}
          >
            {state.units}
          </button>
          <button
            type="button"
            onClick={() => dispatch({ type: 'reset' })}
            className="flex min-h-10 min-w-10 items-center justify-center gap-1.5 rounded-full border border-line bg-surface px-2.5 text-sm font-semibold"
            aria-label="Reset shot"
            title="Reset shot"
          >
            <RotateCcw size={18} aria-hidden />
          </button>
        </div>
      </header>

      <main className="flex-1 pb-[calc(76px+env(safe-area-inset-bottom,0px))]">
        {state.tab === 'shoot' && <QuickShoot />}
        {state.tab === 'films' && <FilmLibrary />}
        {state.tab === 'flash' && <FlashCalculator />}
        {state.tab === 'learn' && <Learn />}
      </main>

      <nav className="safe-bottom fixed inset-x-0 bottom-0 z-30 border-t border-line bg-bg/95 backdrop-blur" aria-label="Main">
        <div className="safe-x mx-auto grid max-w-xl grid-cols-4">
          {TABS.map((t) => {
            const I = t.icon;
            const on = state.tab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => dispatch({ type: 'tab', tab: t.id })}
                aria-current={on ? 'page' : undefined}
                className={cx('flex h-[68px] flex-col items-center justify-center gap-1 text-[11px] font-semibold', on ? 'text-accent' : 'text-muted')}
              >
                <I size={22} strokeWidth={on ? 2.2 : 1.75} aria-hidden />
                {t.label}
              </button>
            );
          })}
        </div>
      </nav>

      <Sheet open={camOpen} onClose={() => setCamOpen(false)} title="Camera">
        <CameraPicker onDone={() => setCamOpen(false)} />
      </Sheet>
    </div>
  );
}

function CameraPicker({ onDone }: { onDone: () => void }) {
  const { state, dispatch } = useStore();
  return (
    <div className="flex flex-col gap-5">
      <Segmented<CameraId>
        label="Camera"
        value={state.camera}
        onChange={(c) => dispatch({ type: 'camera', camera: c })}
        options={[
          { value: 'ae1p', label: 'Canon AE-1 Program' },
          { value: 'xt5', label: 'Fujifilm X-T5' },
        ]}
      />
      <div className="rounded-xl border border-line bg-bg p-4 text-sm leading-relaxed">
        <p className="font-semibold">{CAMERAS[state.camera].name}</p>
        <p className="text-muted">{CAMERAS[state.camera].format} · flash sync {state.camera === 'ae1p' ? '1/60' : '1/250'} s</p>
        <ul className="mt-2 list-disc pl-5 text-muted">
          {CAMERAS[state.camera].flashNotes.map((n) => (
            <li key={n}>{n}</li>
          ))}
        </ul>
      </div>
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.08em] text-muted">Lens</p>
        <div className="flex flex-col gap-2">
          {CAMERAS[state.camera].lenses.map((l) => (
            <button
              key={l.id}
              type="button"
              onClick={() => dispatch({ type: 'lens', camera: state.camera, lensId: l.id })}
              className={cx(
                'min-h-12 rounded-xl border px-4 py-2 text-left text-sm',
                state.lensId[state.camera] === l.id ? 'border-accent bg-accent/10' : 'border-line bg-surface',
              )}
            >
              <span className="block font-semibold">{l.name}</span>
              <span className="text-muted">
                f/{l.maxApertureAtMin}
                {l.maxApertureAtMax !== l.maxApertureAtMin ? `–${l.maxApertureAtMax}` : ''} · closest focus {fmtDistance(l.closeFocusM, state.units)}
              </span>
            </button>
          ))}
        </div>
      </div>
      <button type="button" onClick={onDone} className="min-h-12 rounded-full bg-accent font-semibold text-accent-ink">
        Done
      </button>
    </div>
  );
}
