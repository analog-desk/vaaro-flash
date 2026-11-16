import { ChevronLeft } from 'lucide-react';
import { SUBJECTS, LIGHTING } from '../data/scenarios';
import type { FlashChoice, LightingId, SubjectId } from '../data/types';
import { FLASH_ICON, LIGHTING_ICON, SUBJECT_ICON } from '../components/icons';
import { OptionCard } from '../components/ui';
import { FilmPicker } from '../components/FilmPicker';
import { Result } from '../components/Result';
import { useStore, type Step } from '../state/store';
import { CAMERAS } from '../data/cameras';

export const SUBJECT_ORDER: SubjectId[] = ['portrait', 'street', 'fashion', 'product', 'landscape', 'food', 'architecture', 'macro', 'automotive', 'nightlife', 'other'];
export const LIGHTING_QUICK: LightingId[] = ['sunny', 'overcast', 'golden', 'blue', 'indoor', 'window', 'backlit', 'night', 'verydark', 'mixed'];
export const LIGHTING_MORE: LightingId[] = ['lowlight', 'studio'];
export const FLASH_OPTIONS: { id: FlashChoice; label: string; sub: string }[] = [
  { id: 'auto', label: 'Help me decide', sub: 'App chooses' },
  { id: 'none', label: 'No flash', sub: 'Natural light' },
  { id: 'direct', label: 'Direct', sub: 'On camera, pointed at subject' },
  { id: 'bounce', label: 'Bounced', sub: 'Off a ceiling or wall' },
  { id: 'offcamera', label: 'Off-camera', sub: 'Flash on a stand / in hand' },
];

const STEP_TITLE: Record<Exclude<Step, 'result'>, string> = {
  subject: 'What are you shooting?',
  lighting: 'What is the light like?',
  flash: 'Using flash?',
  film: 'What film is loaded?',
};

export function QuickShoot() {
  const { state, dispatch } = useStore();
  const isFilm = CAMERAS[state.camera].medium === 'film';
  if (state.step === 'result' && state.subject && state.lighting && state.flash) return <Result />;

  const step: Exclude<Step, 'result'> = state.step === 'result' ? 'subject' : state.step;
  const steps: Exclude<Step, 'result'>[] = isFilm && !state.filmId && state.customIso === undefined ? ['subject', 'lighting', 'flash', 'film'] : ['subject', 'lighting', 'flash'];
  const idx = Math.max(0, steps.indexOf(step));

  return (
    <div className="safe-x flex flex-col gap-4 py-4">
      <div className="flex items-center gap-3">
        {idx > 0 ? (
          <button
            type="button"
            onClick={() => dispatch({ type: 'back' })}
            className="-ml-2 flex min-h-11 items-center gap-1 rounded-full pr-3 pl-1 text-sm font-semibold text-muted hover:text-fg"
          >
            <ChevronLeft size={20} aria-hidden /> Back
          </button>
        ) : (
          <span className="text-sm font-semibold text-muted">Quick answer</span>
        )}
        <div className="ml-auto flex items-center gap-1.5" aria-label={`Step ${idx + 1} of ${steps.length}`}>
          {steps.map((s, i) => (
            <span key={s} className={`h-1.5 w-7 rounded-full ${i <= idx ? 'bg-accent' : 'bg-line'}`} />
          ))}
        </div>
      </div>
      <h1 className="font-display text-[32px] font-semibold leading-none tracking-wide">{STEP_TITLE[step]}</h1>

      {step === 'subject' && (
        <div className="grid grid-cols-3 gap-2">
          {SUBJECT_ORDER.map((id) => (
            <OptionCard
              key={id}
              icon={SUBJECT_ICON[id]}
              label={SUBJECTS[id].label.replace(' / close-up', '').replace(' / events', '')}
              active={state.subject === id}
              onClick={() => dispatch({ type: 'subject', subject: id, advance: true })}
            />
          ))}
        </div>
      )}

      {step === 'lighting' && (
        <>
          <div className="grid grid-cols-3 gap-2">
            {[...LIGHTING_QUICK, ...LIGHTING_MORE].map((id) => (
              <OptionCard
                key={id}
                icon={LIGHTING_ICON[id]}
                label={LIGHTING[id].label}
                sub={LIGHTING[id].short}
                active={state.lighting === id}
                onClick={() => dispatch({ type: 'lighting', lighting: id, advance: true })}
              />
            ))}
          </div>
        </>
      )}

      {step === 'flash' && (
        <div className="grid grid-cols-2 gap-2">
          {FLASH_OPTIONS.map((o) => (
            <OptionCard
              key={o.id}
              icon={FLASH_ICON[o.id]}
              label={o.label}
              sub={o.sub}
              active={state.flash === o.id}
              onClick={() => dispatch({ type: 'flash', flash: o.id, advance: true })}
            />
          ))}
        </div>
      )}

      {step === 'film' && <FilmPicker onPicked={() => undefined} />}

      {step !== 'film' && (
        <p className="text-sm text-muted">
          {CAMERAS[state.camera].name}
          {isFilm && (state.filmId || state.customIso) ? ' · film remembered from last time' : ''}. Three taps to a shooting plan.
        </p>
      )}
    </div>
  );
}
