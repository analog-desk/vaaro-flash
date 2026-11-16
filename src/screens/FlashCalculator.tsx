import { useState } from 'react';
import { CAMERAS } from '../data/cameras';
import { FULL_STOP_POWERS, GODOX_IT32 } from '../data/flash';
import { useStore } from '../state/store';
import { apertureForFlash, distanceFor, gnAtIso, powerLabel, requiredPower, snapPower } from '../lib/flashcalc';
import { fmtAperture, fmtDistance, fmtGnShort, fmtStops, fromMetres, localizeText, toMetres } from '../lib/format';
import { Chip, ChipRow, FieldLabel, NumberInput, ProvBadge, Segmented, WarningItem } from '../components/ui';
import { nearestLog } from '../lib/exposure';

type Solve = 'power' | 'distance' | 'aperture';
const LOSSES: { id: string; label: string; stops: number }[] = [
  { id: 'bare', label: 'Bare', stops: 0 },
  { id: 'diffuser', label: 'Diffuser −1', stops: 1 },
  { id: 'softbox', label: 'Softbox −1.7', stops: 1.7 },
  { id: 'bounce', label: 'Bounce −1.3', stops: 1.3 },
];
const POWER_STOPS = Array.from({ length: 22 }, (_, i) => -i / 3);

export function FlashCalculator() {
  const { state, dispatch, rec } = useStore();
  const cam = CAMERAS[state.camera];
  const units = state.units;
  const [solve, setSolve] = useState<Solve>('power');
  const [iso, setIso] = useState<number>(rec?.iso.value ?? 400);
  const [aperture, setAperture] = useState<number>(rec?.aperture.value ?? 5.6);
  const [distanceM, setDistanceM] = useState<number>(rec?.flash.distance?.value ?? 2);
  const [powerStops, setPowerStops] = useState<number>(-3);
  const [loss, setLoss] = useState<number>(0);

  const gnRef =
    state.gnSource === 'custom' && state.customGnM ? state.customGnM : state.gnSource === 'measured' ? GODOX_IT32.measuredGnM!.value : GODOX_IT32.ratedGnM;
  const gnIso = gnAtIso(gnRef, 100, iso);
  const gnEff = (gnIso * Math.sqrt(2 ** powerStops)) / Math.SQRT2 ** loss;
  const apertures = cam.apertureStops;

  let headline = '';
  let headlineSub = '';
  const lines: { label: string; formula: string; result: string }[] = [
    { label: 'GN at your ISO', formula: `${fmtGnShort(gnRef, units)} × √(${iso} / 100)`, result: fmtGnShort(gnIso, units) },
  ];
  const warnings: string[] = [];

  if (solve === 'power') {
    const p = requiredPower(aperture, distanceM, gnIso, loss);
    const snap = snapPower(p);
    headline = snap.label;
    headlineSub = `exact ${p >= 0.01 ? p.toFixed(3) : p.toExponential(1)} · nearest full stop ${snap.fullStopLabel} · ${fmtStops(snap.errorStops)}`;
    lines.push({
      label: 'Required power',
      formula: `(${aperture} × ${distanceM.toFixed(2)} / ${gnIso.toFixed(1)})² × 2^${loss}`,
      result: `${p.toFixed(4)} → ${snap.label}`,
    });
    if (snap.limit === 'under') warnings.push(`Full power is ${Math.log2(p).toFixed(1)} stops short. Move closer than ${fmtDistance(distanceFor(aperture, gnIso, 1, loss), units)} or open the aperture.`);
    if (snap.limit === 'over') warnings.push('Even 1/128 is too strong. Step back, stop down or add a diffuser.');
  } else if (solve === 'distance') {
    const d = distanceFor(aperture, gnIso, 2 ** powerStops, loss);
    headline = fmtDistance(d, units);
    headlineSub = `subject distance for a correct flash exposure at ${powerLabel(powerStops)}`;
    lines.push({ label: 'Effective GN', formula: `${fmtGnShort(gnIso, units)} × √${(2 ** powerStops).toFixed(4)} ÷ √2^${loss}`, result: fmtGnShort(gnEff, units) });
    lines.push({ label: 'Distance = GN / N', formula: `${fmtGnShort(gnEff, units)} / ${aperture}`, result: fmtDistance(d, units) });
  } else {
    const n = apertureForFlash(distanceM, gnIso, 2 ** powerStops, loss);
    const set = nearestLog(n, apertures);
    headline = fmtAperture(n);
    headlineSub = `set ${fmtAperture(set)} (${fmtStops(2 * Math.log2(n / set))} on the flash part)`;
    lines.push({ label: 'Effective GN', formula: `${fmtGnShort(gnIso, units)} × √${(2 ** powerStops).toFixed(4)} ÷ √2^${loss}`, result: fmtGnShort(gnEff, units) });
    lines.push({ label: 'Aperture = GN / d', formula: `${fmtGnShort(gnEff, units)} / ${fmtDistance(distanceM, units, 2)}`, result: fmtAperture(n) });
    if (n > apertures[apertures.length - 1]! * 1.06) warnings.push(`Needs ${fmtAperture(n)}, smaller than the lens allows. Lower the power or step back.`);
    if (n < apertures[0]! / 1.06) warnings.push(`Needs ${fmtAperture(n)}, wider than the lens allows. Raise the power or move closer.`);
  }

  return (
    <div className="safe-x flex flex-col gap-5 py-4">
      <div>
        <h1 className="font-display text-[30px] font-semibold leading-none tracking-wide">Flash Calculator</h1>
        <p className="mt-1 text-sm text-muted">Godox iT32 in manual. GN = aperture × distance.</p>
      </div>

      <Segmented<Solve>
        label="Solve for"
        value={solve}
        onChange={setSolve}
        options={[
          { value: 'power', label: 'Find power' },
          { value: 'distance', label: 'Find distance' },
          { value: 'aperture', label: 'Find aperture' },
        ]}
      />

      <div className="rounded-xl border border-accent/50 bg-accent/[0.07] px-4 py-3">
        <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-accent">{solve === 'power' ? 'Set the flash to' : solve === 'distance' ? 'Flash-to-subject distance' : 'Aperture'}</p>
        <p className="font-display text-5xl font-semibold leading-tight tnum">{headline}</p>
        <p className="text-sm text-muted">{headlineSub}</p>
      </div>
      {warnings.map((w) => (
        <ul key={w}>
          <WarningItem w={{ level: 'critical', text: w }} />
        </ul>
      ))}

      <div>
        <FieldLabel>ISO</FieldLabel>
        <ChipRow>
          {[50, 64, 100, 125, 160, 200, 400, 800, 1600, 3200].map((i) => (
            <Chip key={i} active={iso === i} onClick={() => setIso(i)}>
              {i}
            </Chip>
          ))}
        </ChipRow>
        <div className="mt-2">
          <NumberInput id="calc-iso" label="Custom ISO" value={iso} onChange={(v) => v !== undefined && setIso(v)} min={1} max={51200} suffix="ISO" />
        </div>
      </div>

      {solve !== 'aperture' && (
        <div>
          <FieldLabel hint={cam.shortName}>Aperture</FieldLabel>
          <ChipRow>
            {apertures.map((n) => (
              <Chip key={n} active={aperture === n} onClick={() => setAperture(n)}>
                {fmtAperture(n)}
              </Chip>
            ))}
          </ChipRow>
        </div>
      )}

      {solve !== 'distance' && (
        <div>
          <FieldLabel right={<span className="font-display text-xl font-semibold tnum">{fmtDistance(distanceM, units)}</span>}>Flash-to-subject distance</FieldLabel>
          <input
            id="calc-dist"
            type="range"
            min={units === 'ft' ? toMetres(1, 'ft') : 0.3}
            max={units === 'ft' ? toMetres(40, 'ft') : 12}
            step={units === 'ft' ? toMetres(0.5, 'ft') : 0.1}
            value={distanceM}
            onChange={(e) => setDistanceM(Number(e.target.value))}
            className="h-10 w-full"
            aria-label="Distance"
          />
          <div className="mt-1">
            <NumberInput
              id="calc-dist-num"
              label={`Distance in ${units === 'ft' ? 'feet' : 'metres'}`}
              value={+fromMetres(distanceM, units).toFixed(2)}
              onChange={(v) => v !== undefined && setDistanceM(toMetres(v, units))}
              min={units === 'ft' ? 0.5 : 0.1}
              max={units === 'ft' ? 150 : 50}
              suffix={units}
            />
          </div>
        </div>
      )}

      {solve !== 'power' && (
        <div>
          <FieldLabel hint="⅓-stop steps">Flash power</FieldLabel>
          <ChipRow>
            {POWER_STOPS.map((s) => (
              <Chip key={s} active={Math.abs(powerStops - s) < 0.01} onClick={() => setPowerStops(s)}>
                {powerLabel(s)}
              </Chip>
            ))}
          </ChipRow>
        </div>
      )}

      <div>
        <FieldLabel hint="estimates">Light loss</FieldLabel>
        <ChipRow>
          {LOSSES.map((l) => (
            <Chip key={l.id} active={loss === l.stops} onClick={() => setLoss(l.stops)}>
              {l.label}
            </Chip>
          ))}
        </ChipRow>
        <div className="mt-2 flex items-center gap-3">
          <input id="loss" type="range" min={0} max={4} step={0.1} value={loss} onChange={(e) => setLoss(Number(e.target.value))} className="h-10 flex-1" aria-label="Light loss in stops" />
          <span className="w-16 text-right text-sm tnum">{loss > 0 ? `−${loss.toFixed(1)}` : '0'} EV</span>
        </div>
        <p className="mt-1 text-xs text-muted">For a bounce, also use the full light path (up to the ceiling and down to the subject) as the distance.</p>
      </div>

      <div>
        <FieldLabel right={<ProvBadge p={state.gnSource === 'rated' ? 'verified' : state.gnSource === 'measured' ? 'estimate' : 'user'} />}>Guide number (ISO 100, full power)</FieldLabel>
        <Segmented
          label="Guide number source"
          value={state.gnSource}
          onChange={(v) => dispatch({ type: 'gn', source: v })}
          options={[
            { value: 'rated', label: `Rated ${fmtGnShort(GODOX_IT32.ratedGnM, units)}` },
            { value: 'measured', label: `Measured ${fmtGnShort(GODOX_IT32.measuredGnM!.value, units)}` },
            { value: 'custom', label: 'My value' },
          ]}
        />
        {state.gnSource === 'custom' && (
          <div className="mt-2">
            <NumberInput
              id="calc-gn"
              label="Your guide number"
              value={state.customGnM !== undefined ? +fromMetres(state.customGnM, units).toFixed(1) : undefined}
              onChange={(v) => dispatch({ type: 'gn', source: 'custom', customGnM: v === undefined ? undefined : toMetres(v, units) })}
              min={1}
              max={units === 'ft' ? 200 : 60}
              suffix={`${units} @ ISO 100`}
            />
          </div>
        )}
        <p className="mt-2 text-xs leading-relaxed text-muted">
          {GODOX_IT32.gnNotes}
          {units === 'ft' ? ` In feet that is GN ${fmtGnShort(GODOX_IT32.ratedGnM, 'ft')} (measured: ${fmtGnShort(GODOX_IT32.measuredGnM!.value, 'ft')}).` : ''}{' '}
          {localizeText(GODOX_IT32.coverageNote, units)}
        </p>
      </div>

      <section>
        <FieldLabel>Working</FieldLabel>
        <div className="flex flex-col gap-2">
          {lines.map((l) => (
            <div key={l.label} className="rounded-lg border border-line bg-surface p-3">
              <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted">{l.label}</p>
              <p className="mt-1 overflow-x-auto font-mono text-[13px] text-fg/85">{l.formula}</p>
              <p className="font-mono text-[13px] text-accent">= {l.result}</p>
            </div>
          ))}
        </div>
      </section>

      <section>
        <FieldLabel hint={`${fmtAperture(aperture)} · ISO ${iso}${loss ? ` · −${loss} EV loss` : ''}`}>Distance at each power</FieldLabel>
        <div className="overflow-x-auto rounded-xl border border-line">
          <table className="w-full text-sm tnum">
            <thead>
              <tr className="text-left text-xs uppercase tracking-[0.06em] text-muted">
                <th className="px-3 py-2">Power</th>
                <th className="px-3 py-2">Distance</th>
                <th className="px-3 py-2">Effective GN</th>
              </tr>
            </thead>
            <tbody>
              {FULL_STOP_POWERS.map((p) => (
                <tr key={p} className="border-t border-line">
                  <td className="px-3 py-2 font-semibold">{p === 1 ? '1/1' : `1/${Math.round(1 / p)}`}</td>
                  <td className="px-3 py-2">{fmtDistance(distanceFor(aperture, gnIso, p, loss), units)}</td>
                  <td className="px-3 py-2 text-muted">{fmtGnShort((gnIso * Math.sqrt(p)) / Math.SQRT2 ** loss, units)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-xs text-muted">Each halving of power cuts reach by √2 (×0.71). Doubling the distance needs 4× the power (2 stops).</p>
      </section>
    </div>
  );
}
