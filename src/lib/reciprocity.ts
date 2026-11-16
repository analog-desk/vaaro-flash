import type { Reciprocity } from '../data/films';
import { log2 } from './exposure';

export interface ReciprocityResult {
  correctedS: number;
  addedStops: number;
  documented: boolean;
  note: string;
}

/** Corrected exposure time for a metered time on a given film. */
export function correctReciprocity(meteredS: number, r: Reciprocity | undefined, filmName: string): ReciprocityResult {
  if (meteredS <= 1) return { correctedS: meteredS, addedStops: 0, documented: true, note: '' };
  if (!r) {
    return {
      correctedS: meteredS,
      addedStops: 0,
      documented: false,
      note: `No reciprocity data for ${filmName} in this catalogue. Most films need extra exposure beyond 1 s; check the datasheet and bracket longer.`,
    };
  }
  if (r.kind === 'none-until') {
    if (meteredS <= r.seconds)
      return { correctedS: meteredS, addedStops: 0, documented: true, note: `${filmName}: no correction needed up to ${r.seconds} s (manufacturer data).` };
    return { correctedS: meteredS, addedStops: 0, documented: false, note: `${filmName}: beyond ${r.seconds} s, check the manufacturer's datasheet.` };
  }
  if (r.kind === 'schwarzschild') {
    const correctedS = meteredS ** r.p;
    return {
      correctedS,
      addedStops: log2(correctedS / meteredS),
      documented: true,
      note: `${filmName}: Harman's formula Tc = Tm^${r.p} gives ${correctedS.toFixed(1)} s for a metered ${meteredS.toFixed(1)} s.`,
    };
  }
  // table: interpolate added stops in log(t)
  const pts = r.points;
  let stops = 0;
  if (meteredS <= pts[0]!.t) stops = pts[0]!.stops * (log2(meteredS) / log2(pts[0]!.t || 2));
  else if (meteredS >= pts[pts.length - 1]!.t) stops = pts[pts.length - 1]!.stops;
  else {
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i]!;
      const b = pts[i + 1]!;
      if (meteredS >= a.t && meteredS <= b.t) {
        const k = (Math.log10(meteredS) - Math.log10(a.t)) / (Math.log10(b.t) - Math.log10(a.t));
        stops = a.stops + k * (b.stops - a.stops);
      }
    }
  }
  const correctedS = meteredS * 2 ** stops;
  return {
    correctedS,
    addedStops: stops,
    documented: true,
    note: `${filmName}: add ≈${stops.toFixed(1)} stop (manufacturer table), so ${meteredS.toFixed(1)} s becomes ≈${correctedS.toFixed(1)} s.`,
  };
}
