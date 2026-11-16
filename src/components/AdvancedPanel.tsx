import { useState, type ReactNode } from 'react';
import { RotateCcw } from 'lucide-react';
import { useStore, type Overrides } from '../state/store';
import { CAMERAS, maxApertureAt } from '../data/cameras';
import { GODOX_IT32, MODIFIERS } from '../data/flash';
import type { FlashDirection, Modifier } from '../data/types';
import { LIGHTING } from '../data/scenarios';
import { fmtAperture, fmtShutter, fromMetres, toMetres, fmtDistance, fmtGnShort } from '../lib/format';
import { powerLabel } from '../lib/flashcalc';
import { Chip, ChipRow, FieldLabel, NumberInput, Segmented, cx } from './ui';

function Block({ title, hint, onReset, children }: { title: string; hint?: string; onReset?: () => void; children: ReactNode }) {
  return (
    <div className="border-b border-line py-4 last:border-b-0">
      <FieldLabel
        hint={hint}
        right={
          onReset && (
            <button type="button" onClick={onReset} className="flex min-h-8 items-center gap-1 text-xs font-semibold text-accent">
              <RotateCcw size={12} aria-hidden /> Auto
            </button>
          )
        }
      >
        {title}
      </FieldLabel>
      {children}
    </div>
  );
}

const POWER_STOPS = Array.from({ length: 22 }, (_, i) => -i / 3); // 0 … −7

export function AdvancedPanel() {
  const { state, dispatch, rec } = useStore();
  if (!rec || !state.lighting) return null;
  const o = state.overrides;
  const cam = CAMERAS[state.camera];
  const lens = cam.lenses.find((l) => l.id === state.lensId[state.camera]) ?? cam.lenses[0]!;
  const set = (patch: Partial<Overrides>) => dispatch({ type: 'override', patch });
  const focal = rec.focal.value;
  const maxAp = maxApertureAt(lens, focal).value;
  const apertures = cam.apertureStops.filter((n) => n >= maxAp - 0.01 && n <= lens.minAperture + 0.01);
  const flashOn = rec.flash.on;
  const units = state.units;
  const light = LIGHTING[state.lighting];
  const shutterList = cam.id === 'ae1p' ? cam.shutterSpeeds : cam.shutterSpeeds.filter((t) => t <= 30);

  return (
    <section className="safe-x" aria-label="Adjust settings">
      <div className="rounded-xl border border-line bg-surface px-4">
        <div className="flex items-center justify-between border-b border-line py-3">
          <p className="font-display text-lg font-semibold tracking-wide">Adjust</p>
          <button type="button" onClick={() => dispatch({ type: 'clearOverrides' })} className="flex min-h-9 items-center gap-1.5 text-sm font-semibold text-accent">
            <RotateCcw size={14} aria-hidden /> All auto
          </button>
        </div>

        <Block title="Focal length" hint={cam.cropFactor !== 1 ? `×${cam.cropFactor} crop` : undefined} onReset={o.focal !== undefined ? () => set({ focal: undefined }) : undefined}>
          <ChipRow>
            {lens.focalStops.map((fl) => (
              <Chip key={fl} active={focal === fl} onClick={() => set({ focal: fl, aperture: undefined })}>
                {fl}mm{cam.cropFactor !== 1 ? ` (${Math.round(fl * cam.cropFactor)})` : ''}
              </Chip>
            ))}
          </ChipRow>
        </Block>

        <Block title="Aperture" hint={`max ${fmtAperture(maxAp)} at ${focal}mm`} onReset={o.aperture !== undefined ? () => set({ aperture: undefined }) : undefined}>
          <ChipRow>
            {apertures.map((n) => (
              <Chip key={n} active={Math.abs(rec.aperture.value - n) < 0.01} onClick={() => set({ aperture: n })}>
                {fmtAperture(n)}
              </Chip>
            ))}
          </ChipRow>
        </Block>

        <Block
          title="Shutter"
          hint={flashOn ? `flash sync ${fmtShutter(cam.flashSyncS)} or slower` : undefined}
          onReset={o.shutter !== undefined ? () => set({ shutter: undefined }) : undefined}
        >
          <ChipRow>
            {shutterList.map((t) => (
              <Chip
                key={t}
                active={Math.abs(Math.log2(rec.shutter.value / t)) < 0.05 && o.shutter !== undefined}
                tone={flashOn && t < cam.flashSyncS - 1e-9 ? 'warn' : undefined}
                title={flashOn && t < cam.flashSyncS - 1e-9 ? 'Faster than flash sync' : undefined}
                onClick={() => set({ shutter: t })}
              >
                {fmtShutter(t)}
              </Chip>
            ))}
          </ChipRow>
          {flashOn && <p className="mt-2 text-xs text-muted">With normal sync, shutter speed changes the ambient (background) exposure, not the flash exposure.</p>}
        </Block>

        {cam.medium === 'film' ? (
          <Block title="Exposure index (push / pull)" hint={rec.film ? `box ${rec.film.iso}` : undefined} onReset={o.ei !== undefined ? () => set({ ei: undefined }) : undefined}>
            {rec.film ? (
              <>
                <ChipRow>
                  {[-1, -2 / 3, -1 / 3, 0, 1 / 3, 2 / 3, 1, 2, 3].map((st) => {
                    const ei = Math.round(rec.film!.iso * 2 ** st);
                    const label = st === 0 ? `Box ${rec.film!.iso}` : `${st > 0 ? 'Push' : 'Pull'} ${Math.abs(st) < 1 ? (Math.abs(st) < 0.5 ? '⅓' : '⅔') : Math.abs(st)} · ${ei}`;
                    return (
                      <Chip key={st} active={(o.ei ?? rec.film!.iso) === ei} onClick={() => set({ ei: st === 0 ? undefined : ei })}>
                        {label}
                      </Chip>
                    );
                  })}
                </ChipRow>
                <p className="mt-2 text-xs text-muted">
                  Rating ⅓–⅔ stop slower is just extra exposure (process normally). Rating 1+ stop faster means the lab must push the whole roll.
                </p>
              </>
            ) : (
              <p className="text-sm text-muted">Pick a film stock to rate it at a different speed.</p>
            )}
          </Block>
        ) : (
          <Block title="ISO" onReset={o.digitalIso !== undefined ? () => set({ digitalIso: undefined }) : undefined}>
            <ChipRow>
              <Chip active={o.digitalIso === undefined} onClick={() => set({ digitalIso: undefined })}>
                Auto
              </Chip>
              {[125, 160, 200, 400, 800, 1600, 3200, 6400, 12800].map((iso) => (
                <Chip key={iso} active={o.digitalIso === iso} onClick={() => set({ digitalIso: iso })}>
                  {iso}
                </Chip>
              ))}
            </ChipRow>
          </Block>
        )}

        <Block title="Tripod" onReset={o.tripod !== undefined ? () => set({ tripod: undefined }) : undefined}>
          <Segmented
            label="Tripod"
            value={o.tripod === undefined ? 'auto' : o.tripod ? 'yes' : 'no'}
            onChange={(v) => set({ tripod: v === 'auto' ? undefined : v === 'yes' })}
            options={[
              { value: 'auto', label: 'App decides' },
              { value: 'no', label: 'Handheld' },
              { value: 'yes', label: 'Tripod' },
            ]}
          />
        </Block>

        <Block title="Scene brightness" hint="meter it for accuracy" onReset={o.subjectEv !== undefined ? () => set({ subjectEv: undefined, backgroundEv: undefined }) : undefined}>
          <div className="flex items-center gap-3">
            <input
              id="ev-slider"
              type="range"
              min={-2}
              max={17}
              step={0.5}
              value={o.subjectEv ?? light.subjectEv}
              onChange={(e) => set({ subjectEv: Number(e.target.value) })}
              className="h-10 flex-1"
              aria-label="Subject brightness EV at ISO 100"
            />
            <span className="w-16 text-right font-display text-xl font-semibold tnum">EV {o.subjectEv ?? light.subjectEv}</span>
          </div>
          <MeterInput />
        </Block>

        {flashOn && (
          <>
            <Block title={rec.flash.technique === 'offcamera' ? 'Flash-to-subject distance' : 'Distance to subject'} onReset={o.distanceM !== undefined ? () => set({ distanceM: undefined }) : undefined}>
              <div className="flex items-center gap-3">
                <input
                  id="dist-slider"
                  type="range"
                  min={0.3}
                  max={8}
                  step={0.1}
                  value={o.distanceM ?? rec.flash.distance!.value}
                  onChange={(e) => set({ distanceM: Number(e.target.value) })}
                  className="h-10 flex-1"
                  aria-label="Distance"
                />
                <span className="w-20 text-right font-display text-xl font-semibold tnum">{fmtDistance(o.distanceM ?? rec.flash.distance!.value, units)}</span>
              </div>
            </Block>

            <Block title="Flash power" hint="iT32: 1/1 – 1/128 in ⅓ stops" onReset={o.powerStops !== undefined ? () => set({ powerStops: undefined }) : undefined}>
              <ChipRow>
                <Chip active={o.powerStops === undefined} onClick={() => set({ powerStops: undefined })}>
                  Calculated
                </Chip>
                {POWER_STOPS.map((s) => (
                  <Chip key={s} active={o.powerStops !== undefined && Math.abs(o.powerStops - s) < 0.01} onClick={() => set({ powerStops: s })}>
                    {powerLabel(s)}
                  </Chip>
                ))}
              </ChipRow>
              {o.powerStops !== undefined && rec.flash.power && (
                <p className="mt-2 text-sm text-muted">
                  At {rec.flash.power.label} the flash part of the exposure is {rec.flash.power.errorStops >= 0 ? '+' : '−'}
                  {Math.abs(rec.flash.power.errorStops).toFixed(1)} EV versus the calculated target.
                </p>
              )}
            </Block>

            <Block title="Flash role" onReset={o.role && o.role !== 'auto' ? () => set({ role: undefined }) : undefined}>
              <Segmented
                label="Flash role"
                value={o.role ?? 'auto'}
                onChange={(v) => set({ role: v })}
                options={[
                  { value: 'auto', label: 'Auto' },
                  { value: 'key', label: 'Main light' },
                  { value: 'fill', label: 'Fill' },
                ]}
              />
            </Block>

            <Block title="Modifier" onReset={o.modifier ? () => set({ modifier: undefined }) : undefined}>
              <ChipRow>
                {(Object.keys(MODIFIERS) as Modifier[]).map((m) => (
                  <Chip key={m} active={rec.flash.modifier === m} onClick={() => set({ modifier: m })}>
                    {MODIFIERS[m].label} {MODIFIERS[m].lossStops ? `(−${MODIFIERS[m].lossStops})` : ''}
                  </Chip>
                ))}
              </ChipRow>
            </Block>

            {rec.flash.technique === 'offcamera' && (
              <Block title="Flash direction" onReset={o.direction ? () => set({ direction: undefined }) : undefined}>
                <ChipRow>
                  {(
                    [
                      ['front', 'Front'],
                      ['side45', '45° side'],
                      ['side90', '90° side'],
                      ['rim', 'Rim / behind'],
                    ] as [FlashDirection, string][]
                  ).map(([d, l]) => (
                    <Chip key={d} active={rec.flash.direction === d} onClick={() => set({ direction: d })}>
                      {l}
                    </Chip>
                  ))}
                </ChipRow>
              </Block>
            )}

            {state.flash === 'bounce' && (
              <Block title="Bounce surface" hint={`iT32 tilts ${GODOX_IT32.tiltDeg.min}–${GODOX_IT32.tiltDeg.max}°, rotates ${GODOX_IT32.rotateDeg}°`}>
                <Segmented
                  label="Bounce surface"
                  value={o.bounceSurface ?? 'ceiling'}
                  onChange={(v) => set({ bounceSurface: v })}
                  options={[
                    { value: 'ceiling', label: 'Ceiling' },
                    { value: 'wall', label: 'Side wall' },
                  ]}
                />
                <div className="mt-3 flex items-center gap-3">
                  <span className="w-28 text-sm text-muted">{(o.bounceSurface ?? 'ceiling') === 'ceiling' ? 'Ceiling height' : 'Wall distance'}</span>
                  <input
                    id="bounce-slider"
                    type="range"
                    min={(o.bounceSurface ?? 'ceiling') === 'ceiling' ? 2.2 : 0.5}
                    max={(o.bounceSurface ?? 'ceiling') === 'ceiling' ? 5 : 4}
                    step={0.1}
                    value={(o.bounceSurface ?? 'ceiling') === 'ceiling' ? (o.ceilingM ?? 2.6) : (o.wallM ?? 1.5)}
                    onChange={(e) => set((o.bounceSurface ?? 'ceiling') === 'ceiling' ? { ceilingM: Number(e.target.value) } : { wallM: Number(e.target.value) })}
                    className="h-10 flex-1"
                    aria-label="Bounce surface distance"
                  />
                  <span className="w-16 text-right font-display text-lg font-semibold tnum">
                    {fmtDistance((o.bounceSurface ?? 'ceiling') === 'ceiling' ? (o.ceilingM ?? 2.6) : (o.wallM ?? 1.5), units)}
                  </span>
                </div>
              </Block>
            )}

            <Block title="Subject to background" onReset={o.bgDistanceM !== undefined ? () => set({ bgDistanceM: undefined }) : undefined}>
              <div className="flex items-center gap-3">
                <input
                  id="bg-slider"
                  type="range"
                  min={0.2}
                  max={15}
                  step={0.1}
                  value={o.bgDistanceM ?? 3}
                  onChange={(e) => set({ bgDistanceM: Number(e.target.value) })}
                  className="h-10 flex-1"
                  aria-label="Subject to background distance"
                />
                <span className="w-16 text-right font-display text-lg font-semibold tnum">{fmtDistance(o.bgDistanceM ?? 3, units)}</span>
              </div>
            </Block>

            {cam.ttl && (
              <Block title="Flash mode (X5-F)">
                <Segmented
                  label="Flash mode"
                  value={o.useTtl === false ? 'm' : 'ttl'}
                  onChange={(v) => set({ useTtl: v === 'ttl' ? undefined : false })}
                  options={[
                    { value: 'ttl', label: 'TTL' },
                    { value: 'm', label: 'Manual' },
                  ]}
                />
              </Block>
            )}
          </>
        )}

        <GnBlock />
      </div>
    </section>
  );
}

function GnBlock() {
  const { state, dispatch } = useStore();
  const units = state.units;
  return (
    <Block title="Guide number" hint={`${units === 'ft' ? 'feet' : 'metres'}, ISO 100, full power`}>
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
        <div className="mt-3 flex items-center gap-3">
          <NumberInput
            id="custom-gn"
            label={`Your calibrated guide number in ${units === 'ft' ? 'feet' : 'metres'}`}
            value={state.customGnM !== undefined ? +fromMetres(state.customGnM, units).toFixed(1) : undefined}
            onChange={(v) => dispatch({ type: 'gn', source: 'custom', customGnM: v === undefined ? undefined : toMetres(v, units) })}
            min={units === 'ft' ? 3 : 1}
            max={units === 'ft' ? 200 : 60}
            suffix={units === 'ft' ? 'ft @ ISO 100' : 'm @ ISO 100'}
            placeholder="e.g. 14"
          />
        </div>
      )}
      <p className="mt-2 text-xs leading-relaxed text-muted">
        {GODOX_IT32.gnNotes}
        {units === 'ft'
          ? ` In feet: GN ${fmtGnShort(GODOX_IT32.ratedGnM, 'ft')} rated, ${fmtGnShort(GODOX_IT32.measuredGnM!.value, 'ft')} measured. Calibrate: photograph a grey card at 10 ft, ISO 100, 1/1 power, bracketing f/2.8–f/8. Your GN in feet = best aperture × 10.`
          : ' Calibrate: photograph a grey card at 2 m, f/8, ISO 100, 1/1 power and bracket the aperture. Your GN = best aperture × 2.'}
      </p>
    </Block>
  );
}

/** Convert a meter reading (aperture + shutter at an ISO) into scene EV. */
function MeterInput() {
  const { state, dispatch, rec } = useStore();
  const cam = CAMERAS[state.camera];
  if (!rec) return null;
  const iso = rec.iso.value;
  const apply = (n: number, t: number) => {
    const ev = Math.round((Math.log2((n * n) / t) - Math.log2(iso / 100)) * 2) / 2;
    dispatch({ type: 'override', patch: { subjectEv: ev, backgroundEv: undefined } });
  };
  return (
    <details className="mt-2 text-sm">
      <summary className={cx('min-h-9 cursor-pointer py-2 font-semibold text-accent')}>I metered it: enter my meter reading</summary>
      <MeterForm cameraApertures={cam.apertureStops} shutters={cam.shutterSpeeds} iso={iso} onApply={apply} />
    </details>
  );
}

function MeterForm({ cameraApertures, shutters, iso, onApply }: { cameraApertures: number[]; shutters: number[]; iso: number; onApply: (n: number, t: number) => void }) {
  const [n, setN] = useState(cameraApertures[3] ?? 5.6);
  const [t, setT] = useState(1 / 60);
  return (
    <div className="mt-1 flex flex-col gap-2 rounded-lg border border-line bg-bg p-3">
      <p className="text-xs text-muted">Point the camera at a mid-tone on your subject. Enter what the meter suggests at ISO {iso}.</p>
      <ChipRow>
        {cameraApertures.map((a) => (
          <Chip key={a} active={a === n} onClick={() => setN(a)}>
            {fmtAperture(a)}
          </Chip>
        ))}
      </ChipRow>
      <ChipRow>
        {shutters.filter((s) => s <= 30).map((s) => (
          <Chip key={s} active={s === t} onClick={() => setT(s)}>
            {fmtShutter(s)}
          </Chip>
        ))}
      </ChipRow>
      <button type="button" onClick={() => onApply(n, t)} className="min-h-11 rounded-full bg-accent font-semibold text-accent-ink">
        Use reading (EV {(Math.log2((n * n) / t) - Math.log2(iso / 100)).toFixed(1)})
      </button>
    </div>
  );
}
