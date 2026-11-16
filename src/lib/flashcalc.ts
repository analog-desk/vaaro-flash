// Manual flash maths. All distances are metres internally; guide numbers are metre guide numbers.
import { log2 } from './exposure';

/** GN at another ISO: GN_iso = GN_ref × √(ISO / ISO_ref). */
export function gnAtIso(gnRef: number, isoRef: number, iso: number): number {
  return gnRef * Math.sqrt(iso / isoRef);
}

/** GN at a power fraction: GN_p = GN_full × √p. */
export function gnAtPower(gnFull: number, power: number): number {
  return gnFull * Math.sqrt(power);
}

/** GN after light loss (bounce, modifier): every stop of loss divides GN by √2. */
export function gnAfterLoss(gn: number, lossStops: number): number {
  return gn / Math.SQRT2 ** lossStops;
}

/**
 * Required power fraction: p = (N × d / GN_full)² × 2^loss × target.
 * `target` is the flash exposure wanted relative to a "correct" exposure (1 = correct, 0.5 = one stop under).
 */
export function requiredPower(aperture: number, distanceM: number, gnFullAtIso: number, lossStops = 0, target = 1): number {
  return ((aperture * distanceM) / gnFullAtIso) ** 2 * 2 ** lossStops * target;
}

/** Longest distance at which a power can deliver `target`: d = GN_full × √p / (N × √(2^loss × target)). */
export function distanceFor(aperture: number, gnFullAtIso: number, power = 1, lossStops = 0, target = 1): number {
  return (gnFullAtIso * Math.sqrt(power)) / (aperture * Math.sqrt(2 ** lossStops * target));
}

/** Aperture that a power gives at a distance. */
export function apertureForFlash(distanceM: number, gnFullAtIso: number, power = 1, lossStops = 0, target = 1): number {
  return (gnFullAtIso * Math.sqrt(power)) / (distanceM * Math.sqrt(2 ** lossStops * target));
}

export interface SnappedPower {
  /** Power fraction actually set on the flash. */
  fraction: number;
  /** Stops below full power (0, −1/3 … −7). */
  stops: number;
  /** Godox-style label such as "1/8 +0.3". */
  label: string;
  /** Nearest full-stop setting, for anyone who prefers whole stops. */
  fullStopLabel: string;
  /** Exact fraction the maths asked for. */
  exact: number;
  /** Exposure difference of the set power vs the exact requirement, stops (+ = brighter). */
  errorStops: number;
  /** 'over' = even 1/128 is too strong, 'under' = even full power is too weak. */
  limit: 'over' | 'under' | null;
}

function fullStopLabel(stops: number) {
  const k = Math.round(stops);
  return k === 0 ? '1/1' : `1/${2 ** -k}`;
}

export function powerLabel(stops: number): string {
  const k = Math.floor(stops + 1e-6);
  const thirds = Math.round((stops - k) * 3);
  const base = k === 0 ? '1/1' : `1/${2 ** -k}`;
  if (thirds === 0 || k === 0) return base;
  return `${base} +${thirds === 1 ? '0.3' : '0.7'}`;
}

/** Snap an exact power fraction to the flash's available settings. */
export function snapPower(exact: number, stepsPerStop = 3, minStops = -7): SnappedPower {
  const exactStops = log2(exact);
  let stops = Math.round(exactStops * stepsPerStop) / stepsPerStop;
  let limit: SnappedPower['limit'] = null;
  if (stops > 0) {
    stops = 0;
    if (exactStops > 0.17) limit = 'under';
  }
  if (stops < minStops) {
    stops = minStops;
    if (exactStops < minStops - 0.17) limit = 'over';
  }
  const fraction = 2 ** stops;
  return {
    fraction,
    stops,
    label: powerLabel(stops),
    fullStopLabel: fullStopLabel(Math.max(minStops, Math.min(0, exactStops))),
    exact,
    errorStops: stops - exactStops,
    limit,
  };
}

export interface BounceGeometry {
  pathM: number;
  tiltDeg: number;
  note: string;
}

/**
 * Ceiling bounce: flash at camera height, light hits the ceiling midway and comes down to the subject.
 * Path = 2 × √((d/2)² + h²), where h is ceiling height above flash/subject height.
 */
export function ceilingBounce(subjectDistanceM: number, ceilingM: number, flashHeightM = 1.6): BounceGeometry {
  const h = Math.max(0.2, ceilingM - flashHeightM);
  const half = subjectDistanceM / 2;
  const pathM = 2 * Math.sqrt(half * half + h * h);
  const tiltDeg = Math.min(90, Math.max(30, (Math.atan2(h, half) * 180) / Math.PI));
  return {
    pathM,
    tiltDeg,
    note: `Light travels ≈${pathM.toFixed(1)} m (up ${h.toFixed(1)} m to the ceiling and back down) instead of ${subjectDistanceM.toFixed(1)} m.`,
  };
}

/** Side-wall bounce: head turned toward a wall `wallM` away, light returns to a subject `d` in front. */
export function wallBounce(subjectDistanceM: number, wallM: number): BounceGeometry {
  const pathM = wallM + Math.sqrt(wallM * wallM + subjectDistanceM * subjectDistanceM);
  return { pathM, tiltDeg: 0, note: `Light travels ≈${pathM.toFixed(1)} m via the wall instead of ${subjectDistanceM.toFixed(1)} m.` };
}

/** Relative brightness of something at distance d2 versus d1 under the same flash (inverse-square), in stops. */
export function falloffStops(d1: number, d2: number): number {
  return -2 * log2(d2 / d1);
}
