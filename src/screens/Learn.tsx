import { useMemo, useState } from 'react';
import { BookOpen, Dumbbell, FlaskConical, ListChecks, MessageCircleQuestion, Library } from 'lucide-react';
import { useStore } from '../state/store';
import { EXERCISES, GLOSSARY, LESSONS, QUIZ, type Lesson, type QuizQ } from '../data/lessons';
import { LIGHTING, SUBJECTS, COMBO_NOTES } from '../data/scenarios';
import { STYLES } from '../data/styles';
import { CAMERAS } from '../data/cameras';
import { GODOX_IT32 } from '../data/flash';
import { Bullets, Chip, ChipRow, Disclosure, FieldLabel, Steps, cx } from '../components/ui';
import { fmtAperture, fmtDistance, fmtShutter, fmtStops, localizeText } from '../lib/format';
import { gnAtIso, powerLabel } from '../lib/flashcalc';
import { log2, shutterFor } from '../lib/exposure';

function relevant(l: Lesson, ctx: { subject?: string; lighting?: string; flash: boolean; film: boolean }) {
  if (!l.when) return false;
  if (l.when.subjects && ctx.subject && l.when.subjects.includes(ctx.subject as never)) return true;
  if (l.when.lighting && ctx.lighting && l.when.lighting.includes(ctx.lighting as never)) return true;
  if (l.when.flash && ctx.flash && !l.when.lighting && !l.when.subjects) return true;
  if (l.when.film && ctx.film && !l.when.lighting) return true;
  return false;
}

export function Learn() {
  const { state, rec } = useStore();
  const ctx = { subject: state.subject, lighting: state.lighting, flash: !!rec?.flash.on, film: CAMERAS[state.camera].medium === 'film' };
  const forYou = LESSONS.filter((l) => relevant(l, ctx));
  const others = LESSONS.filter((l) => !forYou.includes(l));
  const L = (xs: string[]) => xs.map((s) => localizeText(s, state.units));

  return (
    <div className="safe-x flex flex-col gap-6 py-4">
      <div>
        <h1 className="font-display text-[30px] font-semibold leading-none tracking-wide">Learn</h1>
        <p className="mt-1 text-sm text-muted">{rec ? `Lessons picked for your ${rec.title.toLowerCase()} shot.` : 'Pick a shot in Quick Shoot and the lessons here adapt to it.'}</p>
      </div>

      {rec && state.subject && state.lighting && (
        <section className="rounded-xl border border-line bg-surface px-4">
          <Disclosure title={`${SUBJECTS[state.subject].label}: what matters`} icon={BookOpen} defaultOpen>
            <Bullets items={L(SUBJECTS[state.subject].guidance)} />
          </Disclosure>
          <Disclosure title={`${LIGHTING[state.lighting].label} light`} icon={BookOpen}>
            <Bullets
              items={L([
                LIGHTING[state.lighting].meaning,
                LIGHTING[state.lighting].flashAdvice,
                LIGHTING[state.lighting].balance,
                `Colour temperature: ${LIGHTING[state.lighting].kelvin}.`,
                ...LIGHTING[state.lighting].mistakes.map((m) => `Mistake: ${m}`),
                ...(COMBO_NOTES[`${state.subject}:${state.lighting}`] ? [COMBO_NOTES[`${state.subject}:${state.lighting}`]!] : []),
              ])}
            />
          </Disclosure>
          <Disclosure title={`The ${STYLES[state.style].label} look`} icon={BookOpen}>
            <Bullets items={L(Object.entries(STYLES[state.style].how).map(([k, v]) => (k === 'extra' ? v : `${k[0]!.toUpperCase()}${k.slice(1)}: ${v}`)))} />
          </Disclosure>
        </section>
      )}

      <Lab />

      <section>
        <FieldLabel>{forYou.length ? 'For this shot' : 'Lessons'}</FieldLabel>
        <div className="rounded-xl border border-line bg-surface px-4">
          {(forYou.length ? forYou : LESSONS).map((l) => (
            <Disclosure key={l.id} title={l.title} icon={ListChecks}>
              <Bullets items={L(l.body)} />
            </Disclosure>
          ))}
        </div>
      </section>
      {forYou.length > 0 && (
        <section>
          <FieldLabel>More lessons</FieldLabel>
          <div className="rounded-xl border border-line bg-surface px-4">
            {others.map((l) => (
              <Disclosure key={l.id} title={l.title} icon={ListChecks}>
                <Bullets items={L(l.body)} />
              </Disclosure>
            ))}
          </div>
        </section>
      )}

      <section>
        <FieldLabel>Flash techniques compared</FieldLabel>
        <TechniqueTable />
      </section>

      <Quiz />

      <section>
        <FieldLabel>Practical exercises</FieldLabel>
        <div className="rounded-xl border border-line bg-surface px-4">
          {EXERCISES.map((e) => (
            <Disclosure key={e.title} title={e.title} icon={Dumbbell}>
              <Steps items={L(e.steps)} />
            </Disclosure>
          ))}
        </div>
      </section>

      <section>
        <FieldLabel>Glossary</FieldLabel>
        <div className="rounded-xl border border-line bg-surface px-4">
          <Disclosure title="Terms explained" icon={Library}>
            <dl className="flex flex-col gap-3">
              {GLOSSARY.map((g) => (
                <div key={g.term}>
                  <dt className="font-semibold">{g.term}</dt>
                  <dd className="text-fg/80">{localizeText(g.def, state.units)}</dd>
                </div>
              ))}
            </dl>
          </Disclosure>
        </div>
      </section>
    </div>
  );
}

function TechniqueTable() {
  const rows = [
    ['Direct', 'Simple, most power, crisp', 'Flat face, hard shadow behind, red-eye'],
    ['Bounced', 'Soft, natural indoors', 'Needs a low white surface; 1.5–3 stops more power'],
    ['Off-camera', 'Shape, texture, direction', 'Needs a trigger and a stand or helper'],
    ['Side light', 'Dramatic modelling', 'Deep shadows on the far side'],
    ['Fill', 'Opens shadows, keeps ambient look', 'Range-limited in sun by sync speed'],
    ['Hard light', 'Texture, graphic shadows', 'Unflattering skin'],
    ['Soft / diffused', 'Flattering, gentle shadows', 'Costs power; a small diffuser softens little'],
  ];
  return (
    <div className="overflow-x-auto rounded-xl border border-line">
      <table className="w-full min-w-[420px] text-sm">
        <thead>
          <tr className="text-left text-xs uppercase tracking-[0.06em] text-muted">
            <th className="px-3 py-2">Technique</th>
            <th className="px-3 py-2">Advantages</th>
            <th className="px-3 py-2">Disadvantages</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(([t, a, d]) => (
            <tr key={t} className="border-t border-line align-top">
              <td className="px-3 py-2 font-semibold">{t}</td>
              <td className="px-3 py-2 text-fg/85">{a}</td>
              <td className="px-3 py-2 text-fg/85">{d}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Interactive ambient vs flash demonstration with a before/after comparison. */
function Lab() {
  const { state, rec } = useStore();
  const cam = CAMERAS[state.camera];
  const light = LIGHTING[state.lighting ?? 'night'];
  const baseN = rec?.aperture.value ?? 5.6;
  const baseT = rec?.shutter.value ?? 1 / 60;
  const baseIso = rec?.iso.value ?? 400;
  const basePow = rec?.flash.power?.stops ?? -3;
  const baseD = rec?.flash.distance?.value ?? 2;
  const flashOnBase = rec?.flash.on ?? true;

  const [N, setN] = useState(baseN);
  const [t, setT] = useState(baseT);
  const [iso, setIso] = useState(baseIso);
  const [pw, setPw] = useState(basePow);
  const [d, setD] = useState(baseD);
  const [flashOn, setFlashOn] = useState(flashOnBase);
  const gnRef = state.gnSource === 'custom' && state.customGnM ? state.customGnM : state.gnSource === 'measured' ? GODOX_IT32.measuredGnM!.value : GODOX_IT32.ratedGnM;

  // Same light loss and path geometry as the recommendation (diffuser, bounce), so "Recommended" matches the plan.
  const lossStops = rec?.flash.on ? rec.flash.lossStops : 0;
  const pathExtra = rec?.flash.on && rec.flash.pathM !== undefined ? rec.flash.pathM / rec.flash.distance!.value : 1;
  const subjectEv = rec?.exposure.subjectEv ?? light.subjectEv;
  const backgroundEv = rec?.exposure.backgroundEv ?? light.backgroundEv;
  const compute = (n: number, tt: number, i: number, p: number, dist: number, on: boolean) => {
    const amb = log2(tt / shutterFor(n, subjectEv, i));
    const bg = log2(tt / shutterFor(n, backgroundEv, i));
    const flashLin = on ? (((gnAtIso(gnRef, 100, i) * Math.sqrt(2 ** p)) / (n * dist * pathExtra)) ** 2) / 2 ** lossStops : 0;
    const bgFlash = on ? flashLin * (dist / (dist + 3)) ** 2 : 0;
    return { subject: log2(2 ** amb + flashLin), bg: log2(2 ** bg + bgFlash), amb, flash: on ? log2(flashLin) : -Infinity };
  };
  const before = compute(baseN, baseT, baseIso, basePow, baseD, flashOnBase);
  const after = compute(N, t, iso, pw, d, flashOn);
  const shutters = cam.id === 'ae1p' ? cam.shutterSpeeds : cam.shutterSpeeds.filter((x) => x <= 2 && x >= 1 / 1000);

  return (
    <section>
      <FieldLabel hint={`${light.label} scene`}>Flash vs ambient lab</FieldLabel>
      <div className="rounded-xl border border-line bg-surface p-4">
        <div className="grid grid-cols-2 gap-3">
          <Scene label="Recommended" r={before} />
          <Scene label="Your change" r={after} />
        </div>
        <div className="mt-4 flex flex-col gap-3">
          <ChipRow>
            <Chip active={flashOn} onClick={() => setFlashOn((x) => !x)}>
              Flash {flashOn ? 'on' : 'off'}
            </Chip>
            <Chip
              onClick={() => {
                setN(baseN);
                setT(baseT);
                setIso(baseIso);
                setPw(basePow);
                setD(baseD);
                setFlashOn(flashOnBase);
              }}
            >
              Reset lab
            </Chip>
          </ChipRow>
          <LabSlider label="Aperture" value={cam.apertureStops.indexOf(N) >= 0 ? cam.apertureStops.indexOf(N) : 3} max={cam.apertureStops.length - 1} display={fmtAperture(N)} onChange={(i) => setN(cam.apertureStops[i]!)} note="both" />
          <LabSlider
            label="Shutter"
            value={Math.max(0, shutters.findIndex((x) => Math.abs(log2(x / t)) < 0.05))}
            max={shutters.length - 1}
            display={fmtShutter(t)}
            onChange={(i) => setT(shutters[i]!)}
            note="ambient only"
            warn={flashOn && t < cam.flashSyncS - 1e-9 ? 'above sync' : undefined}
          />
          <LabSlider label="ISO" value={[100, 200, 400, 800, 1600].indexOf(iso) >= 0 ? [100, 200, 400, 800, 1600].indexOf(iso) : 2} max={4} display={String(iso)} onChange={(i) => setIso([100, 200, 400, 800, 1600][i]!)} note="both" />
          <LabSlider label="Flash power" value={Math.round(-pw * 3)} max={21} display={powerLabel(pw)} onChange={(i) => setPw(-i / 3)} note="flash only" invert />
          <LabSlider label="Flash distance" value={Math.round(d * 10)} max={80} min={3} display={fmtDistance(d, state.units)} onChange={(i) => setD(i / 10)} note="flash only" />
        </div>
        <p className="mt-3 text-sm text-muted">
          Subject {fmtStops(after.subject)} · background {fmtStops(after.bg)}
          {flashOn ? ` · flash share ${Math.round((Math.min(1, 2 ** after.flash / 2 ** after.subject) || 0) * 100)}%` : ''}. Background is assumed {fmtDistance(3, state.units, 0)} behind the subject
          {lossStops ? `; includes ${lossStops.toFixed(1)} stops of modifier/bounce loss` : ''}.
        </p>
      </div>
    </section>
  );
}

function tone(stops: number) {
  // Simple film-like tone curve: 0 EV → mid grey; ±3 EV → near black / white.
  const v = 1 / (1 + Math.exp(-1.15 * stops));
  return Math.round(v * 255);
}

function Scene({ label, r }: { label: string; r: { subject: number; bg: number } }) {
  const bg = tone(r.bg);
  const sj = tone(r.subject);
  return (
    <figure className="min-w-0">
      <svg viewBox="0 0 120 90" className="aspect-[4/3] w-full max-w-full rounded-lg border border-line" role="img" aria-label={`${label}: subject ${r.subject.toFixed(1)} EV, background ${r.bg.toFixed(1)} EV`}>
        <rect width="120" height="90" fill={`rgb(${bg},${bg},${Math.min(255, bg + 6)})`} />
        <rect x="8" y="14" width="18" height="30" fill={`rgb(${Math.min(255, bg + 40)},${Math.min(255, bg + 34)},${bg})`} opacity="0.7" />
        <rect x="92" y="10" width="14" height="24" fill={`rgb(${Math.min(255, bg + 40)},${Math.min(255, bg + 34)},${bg})`} opacity="0.7" />
        <circle cx="60" cy="38" r="13" fill={`rgb(${sj},${Math.round(sj * 0.9)},${Math.round(sj * 0.82)})`} />
        <path d="M34 90 C36 62 46 54 60 54 C74 54 84 62 86 90 Z" fill={`rgb(${Math.round(sj * 0.75)},${Math.round(sj * 0.75)},${Math.round(sj * 0.8)})`} />
      </svg>
      <figcaption className="mt-1 text-xs text-muted">
        {label}: S {fmtStops(r.subject)} · B {fmtStops(r.bg)}
      </figcaption>
    </figure>
  );
}

function LabSlider({
  label,
  value,
  max,
  min = 0,
  display,
  onChange,
  note,
  warn,
  invert,
}: {
  label: string;
  value: number;
  max: number;
  min?: number;
  display: string;
  onChange: (i: number) => void;
  note: string;
  warn?: string;
  invert?: boolean;
}) {
  const id = `lab-${label.replace(/\s/g, '-').toLowerCase()}`;
  return (
    <div className="flex items-center gap-3">
      <label htmlFor={id} className="w-24 shrink-0 text-sm">
        {label}
        <span className={cx('block text-[11px]', warn ? 'text-critical' : 'text-dim')}>{warn ?? note}</span>
      </label>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={1}
        value={invert ? max - value : value}
        onChange={(e) => onChange(invert ? max - Number(e.target.value) : Number(e.target.value))}
        className="h-10 min-w-0 flex-1"
      />
      <span className="w-16 shrink-0 text-right font-display text-lg font-semibold tnum">{display}</span>
    </div>
  );
}

function Quiz() {
  const { rec, state } = useStore();
  const units = state.units;
  const questions = useMemo<QuizQ[]>(() => {
    const qs = QUIZ.map((x) => ({ ...x, q: localizeText(x.q, units), explain: localizeText(x.explain, units) }));
    if (rec?.flash.on && rec.flash.power && rec.flash.distance && rec.flash.power.stops <= -2) {
      const d = rec.flash.distance.value;
      qs.unshift({
        q: `Your plan: ${rec.flash.power.label} at ${fmtDistance(d, units)}. Your subject steps back to ${fmtDistance(d * 1.41, units)}. New power?`,
        options: [powerLabel(Math.max(-7, rec.flash.power.stops - 1)), rec.flash.power.label, powerLabel(Math.min(0, rec.flash.power.stops + 1)), powerLabel(Math.min(0, rec.flash.power.stops + 2))],
        answer: 2,
        explain: '1.41× the distance is half the light (one stop), so double the power.',
      });
    }
    return qs;
  }, [rec, units]);
  const [i, setI] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const q = questions[i % questions.length]!;
  return (
    <section>
      <FieldLabel hint={`${score} correct`}>Quick quiz</FieldLabel>
      <div className="rounded-xl border border-line bg-surface p-4">
        <p className="flex gap-2 font-semibold">
          <MessageCircleQuestion size={18} className="mt-0.5 shrink-0 text-accent" aria-hidden />
          {q.q}
        </p>
        <div className="mt-3 flex flex-col gap-2">
          {q.options.map((o, k) => (
            <button
              key={k}
              type="button"
              disabled={picked !== null}
              onClick={() => {
                setPicked(k);
                if (k === q.answer) setScore((s) => s + 1);
              }}
              className={cx(
                'min-h-11 rounded-lg border px-3 py-2 text-left text-sm',
                picked === null ? 'border-line bg-bg hover:border-line-strong' : k === q.answer ? 'border-ok bg-ok/10' : k === picked ? 'border-critical bg-critical/10' : 'border-line bg-bg opacity-60',
              )}
            >
              {o}
            </button>
          ))}
        </div>
        {picked !== null && (
          <div className="mt-3 flex items-start gap-3">
            <p className="flex-1 text-sm text-fg/85">
              <FlaskConical size={14} className="mr-1 inline text-accent" aria-hidden />
              {q.explain}
            </p>
            <button
              type="button"
              onClick={() => {
                setPicked(null);
                setI((x) => x + 1);
              }}
              className="min-h-10 rounded-full bg-accent px-4 text-sm font-semibold text-accent-ink"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
