// Exposure maths. EV values are referenced to ISO 100 unless a name says otherwise.

export const log2 = (x: number) => Math.log(x) / Math.LN2;

/** EV (ISO 100) that a camera setting represents: EV = log2(N²/t) − log2(ISO/100). */
export function settingsEv100(aperture: number, shutterS: number, iso: number): number {
  return log2((aperture * aperture) / shutterS) - log2(iso / 100);
}

/** Shutter time that correctly exposes a scene of `ev100` at `aperture` and `iso`. */
export function shutterFor(aperture: number, ev100: number, iso: number): number {
  return (aperture * aperture) / 2 ** (ev100 + log2(iso / 100));
}

/** Aperture that correctly exposes a scene of `ev100` at `shutterS` and `iso`. */
export function apertureFor(shutterS: number, ev100: number, iso: number): number {
  return Math.sqrt(shutterS * 2 ** (ev100 + log2(iso / 100)));
}

/**
 * Exposure of a scene relative to "correct", in stops, for given settings.
 * Positive = overexposed (more light than needed), negative = underexposed.
 */
export function exposureStops(sceneEv100: number, aperture: number, shutterS: number, iso: number): number {
  return sceneEv100 - settingsEv100(aperture, shutterS, iso);
}

/** Nearest value in a list, compared on a log scale (stops). */
export function nearestLog(value: number, list: readonly number[]): number {
  let best = list[0]!;
  let bestD = Infinity;
  for (const v of list) {
    const d = Math.abs(log2(v / value));
    if (d < bestD) {
      bestD = d;
      best = v;
    }
  }
  return best;
}

/** Largest list value ≤ value (with a small tolerance), or undefined. */
export function floorIn(value: number, list: readonly number[], tolStops = 0.02): number | undefined {
  const sorted = [...list].sort((a, b) => a - b);
  let out: number | undefined;
  for (const v of sorted) if (log2(v / value) <= tolStops) out = v;
  return out;
}

/** Smallest list value ≥ value (with a small tolerance), or undefined. */
export function ceilIn(value: number, list: readonly number[], tolStops = 0.02): number | undefined {
  const sorted = [...list].sort((a, b) => a - b);
  for (const v of sorted) if (log2(value / v) <= tolStops) return v;
  return undefined;
}

export function clamp(v: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, v));
}

export function isFiniteNumber(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v);
}
