import { useRef, useState } from 'react';
import {
  BookOpen,
  Calculator,
  Check,
  ChevronLeft,
  CircleHelp,
  Copy,
  Crosshair,
  Film,
  ListChecks,
  Palette,
  SlidersHorizontal,
  TriangleAlert,
  Zap,
} from 'lucide-react';
import { useStore } from '../state/store';
import { LIGHTING, SUBJECTS } from '../data/scenarios';
import { STYLES, STYLE_ORDER } from '../data/styles';
import { filmTitle } from '../lib/films';
import { CAMERAS } from '../data/cameras';
import type { Provenance } from '../data/types';
import { FLASH_ICON, LIGHTING_ICON, SUBJECT_ICON } from './icons';
import { Bullets, Chip, Disclosure, DotLegend, OptionCard, ProvDot, ProvLegend, Sheet, Steps, WarningItem, cx } from './ui';
import { FilmPicker } from './FilmPicker';
import { AdvancedPanel } from './AdvancedPanel';
import { FLASH_OPTIONS, LIGHTING_MORE, LIGHTING_QUICK, SUBJECT_ORDER } from '../screens/QuickShoot';
import { fmtDistance, fmtGnShort, fmtStops } from '../lib/format';

type SheetKind = 'subject' | 'lighting' | 'flash' | 'film' | 'style' | null;

function Tile({ label, value, sub, p, tone }: { label: string; value: string; sub?: string; p?: Provenance; tone?: 'off' | 'warn' }) {
  return (
    <div className={cx('flex min-w-0 flex-col justify-between gap-1 rounded-xl border bg-surface px-2 py-2', tone === 'warn' ? 'border-critical/60' : 'border-line')}>
      <span className="flex items-center justify-between gap-1">
        <span className="truncate text-[10px] font-semibold uppercase tracking-[0.03em] text-muted">{label}</span>
        {p && <ProvDot p={p} />}
      </span>
      <span
        className={cx(
          'truncate font-display font-semibold leading-none tnum',
          value.length > 7 ? 'text-[17px]' : value.length > 5 ? 'text-[21px]' : 'text-[25px]',
          tone === 'off' && 'text-muted',
        )}
        title={value}
      >
        {value}
      </span>
      <span className="truncate text-[11px] leading-tight text-muted" title={sub}>
        {sub ?? ' '}
      </span>
    </div>
  );
}

export function Result() {
  const { state, dispatch, rec } = useStore();
  const [sheet, setSheet] = useState<SheetKind>(null);
  const [copied, setCopied] = useState<'ok' | 'fail' | null>(null);
  const [explain, setExplain] = useState(false);
  const copyRef = useRef<HTMLTextAreaElement>(null);
  const explainRef = useRef<HTMLDivElement>(null);
  if (!rec || !state.subject || !state.lighting || !state.flash) return null;
  const f = rec.flash;
  const film = rec.film;
  const subj = SUBJECTS[state.subject];
  const light = LIGHTING[state.lighting];
  const visibleWarnings = rec.warnings.filter((w) => w.level !== 'info');
  const notes = rec.warnings.filter((w) => w.level === 'info');
  const cam = CAMERAS[state.camera];

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(rec.copyText);
      setCopied('ok');
    } catch {
      setCopied('fail');
      requestAnimationFrame(() => copyRef.current?.select());
    }
    window.setTimeout(() => setCopied((c) => (c === 'ok' ? null : c)), 2000);
  };

  const filmChip = film ? filmTitle(film) : state.customIso ? `ISO ${state.customIso}` : 'Pick film';

  return (
    <div className="flex flex-col gap-4 py-3">
      {/* Header */}
      <div className="safe-x flex items-center gap-2">
        <button
          type="button"
          onClick={() => dispatch({ type: 'back' })}
          className="-ml-2 flex size-11 shrink-0 items-center justify-center rounded-full text-muted hover:text-fg"
          aria-label="Back"
        >
          <ChevronLeft size={22} />
        </button>
        <div className="min-w-0 flex-1">
          <h1 className="truncate font-display text-[26px] font-semibold leading-tight tracking-wide">{rec.title}</h1>
          <p className="truncate text-xs text-muted">
            {rec.cameraName} · {rec.lensName.replace('Canon New ', '').replace('Fujinon ', '')} · {STYLES[state.style].label}
          </p>
        </div>
      </div>

      {/* Readout */}
      <section className="safe-x" aria-label="Recommended settings">
        <div className="grid grid-cols-4 gap-1.5">
          <Tile label="Aperture" value={rec.aperture.display} sub={rec.aperture.note ?? (rec.focus.dof.farM === Infinity ? 'Deep focus' : 'Set on ring')} p={rec.aperture.provenance} />
          <Tile
            label="Shutter"
            value={rec.shutter.display}
            sub={rec.bulb ? 'Bulb, cable' : f.on ? (rec.shutter.value >= cam.flashSyncS - 1e-9 ? 'Sync OK' : 'Over sync!') : 'Handheld'}
            p={rec.shutter.provenance}
            tone={f.on && rec.shutter.value < cam.flashSyncS - 1e-9 ? 'warn' : undefined}
          />
          <Tile
            label={rec.medium === 'film' ? 'Film' : 'ISO'}
            value={String(rec.iso.value)}
            sub={rec.medium === 'film' ? (film ? film.name : state.customIso ? 'Custom ISO' : 'Pick film') : rec.iso.display.includes('auto') ? 'Auto ISO' : 'Set ISO'}
            p={rec.iso.provenance}
            tone={rec.needsFilm ? 'warn' : undefined}
          />
          <Tile
            label="Focal"
            value={rec.focal.display}
            sub={rec.focal.note ?? (rec.focal.value === 70 ? 'Long end' : rec.focal.value === 35 ? 'Wide end' : 'Zoom')}
            p={rec.focal.provenance}
          />
          <Tile label="Flash" value={f.on ? (f.technique === 'offcamera' ? 'Off-cam' : f.technique === 'bounce' ? 'Bounce' : 'Direct') : 'Off'} sub={f.on ? (f.role === 'fill' ? 'Fill light' : 'Main light') : 'Natural light'} tone={f.on ? undefined : 'off'} />
          <Tile
            label="Power"
            value={f.on ? f.powerDisplay : '—'}
            sub={f.on ? (f.ttlFec !== undefined ? `Manual ${f.power!.label}` : f.mode.startsWith('Manual') ? 'Manual' : f.mode) : ' '}
            p={f.on ? 'calculated' : undefined}
            tone={f.on ? undefined : 'off'}
          />
          <Tile
            label={f.technique === 'offcamera' ? 'Flash dist.' : 'Distance'}
            value={f.on ? f.distance!.display : rec.focus.display}
            sub={f.on ? (f.technique === 'bounce' ? `Tilt ${f.tiltDeg ?? 45}°` : f.technique === 'offcamera' ? 'Flash→subj.' : 'To subject') : 'To subject'}
            p={f.on ? f.distance!.provenance : 'estimate'}
          />
          <Tile label="Focus" p="calculated" value={rec.focus.display} sub={rec.focus.dof.farM === Infinity ? `${fmtDistance(rec.focus.dof.nearM, state.units)} → ∞` : `DoF ${state.units === 'm' && rec.focus.dof.totalM < 1 ? Math.round(rec.focus.dof.totalM * 100) + ' cm' : fmtDistance(rec.focus.dof.totalM, state.units)}`} />
        </div>
        <div className="mt-2">
          <DotLegend />
        </div>
      </section>

      {/* Do this */}
      <section className="safe-x" aria-label="Instruction">
        <div className="rounded-xl border border-accent/50 bg-accent/[0.07] px-4 py-3">
          <p className="mb-1 text-[11px] font-bold uppercase tracking-[0.12em] text-accent">Do this</p>
          <p className="text-[16px] font-medium leading-snug">{rec.instruction}</p>
          {rec.decision && <p className="mt-2 border-t border-accent/20 pt-2 text-sm leading-snug text-fg/85">{rec.decision}</p>}
        </div>
      </section>

      {/* Critical + caution warnings: never collapsed */}
      {visibleWarnings.length > 0 && (
        <section className="safe-x" aria-label="Warnings">
          <ul className="flex flex-col gap-2">
            {visibleWarnings.map((w) => (
              <WarningItem key={w.text} w={w} />
            ))}
          </ul>
        </section>
      )}

      {/* Change one thing */}
      <section className="safe-x" aria-label="Change a setting">
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-muted">Change one thing</p>
        <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4">
          <Chip onClick={() => setSheet('subject')}>{subj.label}</Chip>
          <Chip onClick={() => setSheet('lighting')}>{light.label}</Chip>
          <Chip onClick={() => setSheet('flash')}>{FLASH_OPTIONS.find((o) => o.id === state.flash)!.label}</Chip>
          {cam.medium === 'film' && (
            <Chip onClick={() => setSheet('film')} tone={rec.needsFilm ? 'warn' : undefined}>
              {filmChip}
            </Chip>
          )}
          <Chip onClick={() => setSheet('style')}>{STYLES[state.style].label}</Chip>
        </div>
      </section>

      {/* Actions */}
      <section className="safe-x grid grid-cols-3 gap-2" aria-label="Actions">
        <button type="button" onClick={copy} className="flex min-h-12 items-center justify-center gap-2 rounded-full border border-line bg-surface text-sm font-semibold">
          {copied === 'ok' ? <Check size={16} className="text-ok" /> : <Copy size={16} />} {copied === 'ok' ? 'Copied' : 'Copy'}
        </button>
        <button
          type="button"
          aria-pressed={explain}
          onClick={() => {
            setExplain((e) => !e);
            requestAnimationFrame(() => explainRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
          }}
          className={cx('flex min-h-12 items-center justify-center gap-2 rounded-full border text-sm font-semibold', explain ? 'border-accent text-accent' : 'border-line bg-surface')}
        >
          <CircleHelp size={16} /> Explain
        </button>
        <button
          type="button"
          aria-pressed={state.advanced}
          onClick={() => dispatch({ type: 'advanced', on: !state.advanced })}
          className={cx('flex min-h-12 items-center justify-center gap-2 rounded-full border text-sm font-semibold', state.advanced ? 'border-accent bg-accent text-accent-ink' : 'border-line bg-surface')}
        >
          <SlidersHorizontal size={16} /> Adjust
        </button>
      </section>
      {copied === 'fail' && (
        <div className="safe-x">
          <p className="mb-1 text-xs text-caution">Clipboard is blocked here. The text is selected: copy it manually.</p>
          <textarea ref={copyRef} readOnly value={rec.copyText} rows={6} className="w-full rounded-lg border border-line bg-bg p-2 font-mono text-xs" />
        </div>
      )}

      {state.advanced && <AdvancedPanel />}

      {/* Exposure summary */}
      <section className="safe-x" aria-label="Expected result">
        <div className="rounded-xl border border-line bg-surface px-4 py-3 text-sm leading-relaxed">
          <p className="font-semibold">{rec.exposure.expected}</p>
          <p className="mt-1 text-muted">{rec.exposure.subjectLine}</p>
          <p className="text-muted">{rec.exposure.backgroundLine}</p>
          <ExposureBar subject={rec.exposure.totalSubjectStops} background={rec.exposure.backgroundStops} />
        </div>
      </section>

      {/* Details */}
      <div ref={explainRef} className="safe-x scroll-mt-16" key={explain ? 'x1' : 'x0'}>
        <Disclosure title="Why these settings work" icon={BookOpen} defaultOpen={explain}>
          <Bullets items={rec.why} />
        </Disclosure>
        <Disclosure title={f.on ? 'Flash position & technique' : 'Light & technique'} icon={Zap} defaultOpen={explain}>
          <Bullets items={rec.technique} />
          {f.on && (
            <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 rounded-lg border border-line bg-bg p-3 text-sm">
              <dt className="text-muted">Mode</dt>
              <dd>{f.mode}</dd>
              <dt className="text-muted">Head</dt>
              <dd>{f.angle}</dd>
              <dt className="text-muted">Modifier</dt>
              <dd className="capitalize">{f.modifier === 'bare' ? 'Bare head' : f.modifier}</dd>
              <dt className="text-muted">Light loss</dt>
              <dd>{f.lossStops ? `${f.lossStops.toFixed(1)} stops` : 'None'}</dd>
              <dt className="text-muted">Guide number</dt>
              <dd>
                {fmtGnShort(f.gnRefM, state.units)} @ ISO 100 ({f.gnSource}) → {fmtGnShort(f.gnAtIsoM, state.units)} @ ISO {rec.iso.value}
              </dd>
              {f.maxDistanceM !== null && (
                <>
                  <dt className="text-muted">Full-power reach</dt>
                  <dd>{fmtDistance(f.maxDistanceM, state.units)}</dd>
                </>
              )}
              {f.pathM !== undefined && (
                <>
                  <dt className="text-muted">Bounce path</dt>
                  <dd>{fmtDistance(f.pathM, state.units)}</dd>
                </>
              )}
              {f.power && f.ttlFec === undefined && (
                <>
                  <dt className="text-muted">Nearest full stop</dt>
                  <dd>{f.power.fullStopLabel}</dd>
                </>
              )}
            </dl>
          )}
        </Disclosure>
        <Disclosure title="Step by step" icon={ListChecks} defaultOpen={explain}>
          <Steps items={rec.example} />
        </Disclosure>
        <Disclosure title="Exposure calculation" icon={Calculator} defaultOpen={explain}>
          <div className="flex flex-col gap-2.5">
            <p className="text-sm text-muted">
              Subject ≈ EV {rec.exposure.subjectEv}, background ≈ EV {rec.exposure.backgroundEv} (ISO 100). Exposure bias {fmtStops(rec.exposure.biasStops)}.
            </p>
            {rec.calc.map((c) => (
              <div key={c.label} className="rounded-lg border border-line bg-bg p-3">
                <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted">{c.label}</p>
                <p className="mt-1 overflow-x-auto font-mono text-[13px] leading-snug text-fg/85">{c.formula}</p>
                <p className="mt-1 font-mono text-[13px] text-accent">= {c.result}</p>
              </div>
            ))}
            <p className="text-sm text-muted">{rec.focus.zone}</p>
          </div>
        </Disclosure>
        <Disclosure title="Creative suggestions" icon={Palette} defaultOpen={explain}>
          <Bullets items={rec.creative} />
        </Disclosure>
        <Disclosure title="Common mistakes" icon={TriangleAlert} defaultOpen={explain}>
          <Bullets items={rec.mistakes} />
        </Disclosure>
        <Disclosure title={rec.medium === 'film' ? 'Film notes' : 'Digital notes'} icon={Film} defaultOpen={explain}>
          <Bullets items={rec.filmNotes} />
          {rec.filmSuggestions.length > 0 && (
            <div className="mt-3">
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.08em] text-muted">Films that suit this shot</p>
              <div className="flex flex-wrap gap-2">
                {rec.filmSuggestions.map((s) => (
                  <Chip key={s.id} active={state.filmId === s.id} onClick={() => dispatch({ type: 'film', filmId: s.id })}>
                    {filmTitle(s)}
                  </Chip>
                ))}
              </div>
            </div>
          )}
        </Disclosure>
        <Disclosure title="Assumptions & focus" icon={Crosshair} defaultOpen={explain} badge={notes.length ? <span className="text-xs text-info">{notes.length} notes</span> : undefined}>
          <div className="flex flex-col gap-3">
            {notes.length > 0 && (
              <ul className="flex flex-col gap-2">
                {notes.map((w) => (
                  <WarningItem key={w.text} w={w} />
                ))}
              </ul>
            )}
            <p className="text-sm">{rec.focus.method}</p>
            <Bullets items={rec.assumptions} />
            <ProvLegend />
          </div>
        </Disclosure>
      </div>

      {/* Change sheets */}
      <Sheet open={sheet === 'subject'} onClose={() => setSheet(null)} title="What are you shooting?">
        <div className="grid grid-cols-3 gap-2">
          {SUBJECT_ORDER.map((id) => (
            <OptionCard
              key={id}
              icon={SUBJECT_ICON[id]}
              label={SUBJECTS[id].label.replace(' / close-up', '').replace(' / events', '')}
              active={state.subject === id}
              onClick={() => {
                dispatch({ type: 'subject', subject: id });
                setSheet(null);
              }}
            />
          ))}
        </div>
      </Sheet>
      <Sheet open={sheet === 'lighting'} onClose={() => setSheet(null)} title="What is the light like?">
        <div className="grid grid-cols-3 gap-2">
          {[...LIGHTING_QUICK, ...LIGHTING_MORE].map((id) => (
            <OptionCard
              key={id}
              icon={LIGHTING_ICON[id]}
              label={LIGHTING[id].label}
              sub={LIGHTING[id].short}
              active={state.lighting === id}
              onClick={() => {
                dispatch({ type: 'lighting', lighting: id });
                setSheet(null);
              }}
            />
          ))}
        </div>
      </Sheet>
      <Sheet open={sheet === 'flash'} onClose={() => setSheet(null)} title="Using flash?">
        <div className="grid grid-cols-2 gap-2">
          {FLASH_OPTIONS.map((o) => (
            <OptionCard
              key={o.id}
              icon={FLASH_ICON[o.id]}
              label={o.label}
              sub={o.sub}
              active={state.flash === o.id}
              onClick={() => {
                dispatch({ type: 'flash', flash: o.id });
                setSheet(null);
              }}
            />
          ))}
        </div>
      </Sheet>
      <Sheet open={sheet === 'film'} onClose={() => setSheet(null)} title="Film loaded">
        <FilmPicker onPicked={() => setSheet(null)} />
      </Sheet>
      <Sheet open={sheet === 'style'} onClose={() => setSheet(null)} title="What look are you going for?">
        <div className="grid grid-cols-2 gap-2">
          {STYLE_ORDER.map((id) => (
            <OptionCard
              key={id}
              label={STYLES[id].label}
              sub={STYLES[id].short}
              active={state.style === id}
              onClick={() => {
                dispatch({ type: 'style', style: id });
                setSheet(null);
              }}
            />
          ))}
        </div>
      </Sheet>
    </div>
  );
}

/** Simple scale showing where subject and background land relative to a correct exposure. */
function ExposureBar({ subject, background }: { subject: number; background: number }) {
  const pos = (s: number) => `${((Math.max(-4, Math.min(4, s)) + 4) / 8) * 100}%`;
  return (
    <div className="mt-3" aria-hidden>
      <div className="relative h-8">
        <div className="absolute inset-x-0 top-3.5 h-1 rounded-full bg-gradient-to-r from-black via-[#6b6a66] to-white" />
        <div className="absolute top-3 h-2 w-px bg-fg/60" style={{ left: '50%' }} />
        <span className="absolute -translate-x-1/2 rounded bg-accent px-1 text-[10px] font-bold text-accent-ink" style={{ left: pos(subject), top: -2 }}>
          S
        </span>
        <span className="absolute -translate-x-1/2 rounded bg-info px-1 text-[10px] font-bold text-bg" style={{ left: pos(background), top: 20 }}>
          B
        </span>
      </div>
      <div className="flex justify-between text-[10px] text-dim tnum">
        <span>−4</span>
        <span>correct</span>
        <span>+4 EV</span>
      </div>
    </div>
  );
}
