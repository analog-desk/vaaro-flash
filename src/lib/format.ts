import type { Units } from '../data/types';

export const M_TO_FT = 3.28084;

export function fmtShutter(t: number): string {
  if (t >= 1) return `${Number.isInteger(t) ? t : t.toFixed(1)} s`;
  if (t >= 0.45 && t < 1 && Math.abs(1 / t - Math.round(1 / t)) > 0.05) return `${t.toFixed(1)} s`;
  const d = 1 / t;
  const r = Math.round(d);
  return Math.abs(d - r) < 0.06 ? `1/${r}` : `1/${d.toFixed(1)}`;
}

export function fmtAperture(n: number): string {
  if (n >= 10) return `f/${Math.round(n)}`;
  return `f/${Number.isInteger(n) ? n : n.toFixed(1)}`;
}

export function fmtDistance(m: number, units: Units, digits = 1): string {
  if (!Number.isFinite(m)) return '∞';
  if (units === 'ft') {
    const ft = m * M_TO_FT;
    if (ft < 1) return `${Math.max(1, Math.round(ft * 12))} in`;
    return `${ft.toFixed(ft < 10 ? digits : 0)} ft`;
  }
  return `${m.toFixed(m < 10 ? digits : 0)} m`;
}

export function fmtGn(gnM: number, units: Units): string {
  return units === 'ft' ? `GN ${(gnM * M_TO_FT).toFixed(0)} (ft)` : `GN ${gnM.toFixed(1)} (m)`;
}

export function fmtStops(s: number, digits = 1): string {
  const v = Math.abs(s) < 0.05 ? 0 : s;
  const sign = v > 0 ? '+' : v < 0 ? '−' : '±';
  return `${sign}${Math.abs(v).toFixed(digits)} EV`;
}

/** Thirds-style exposure compensation label: +⅔, −1⅓ … */
export function fmtThirds(s: number): string {
  const thirds = Math.round(s * 3);
  if (thirds === 0) return '0';
  const sign = thirds > 0 ? '+' : '−';
  const a = Math.abs(thirds);
  const whole = Math.floor(a / 3);
  const frac = a % 3 === 1 ? '⅓' : a % 3 === 2 ? '⅔' : '';
  return `${sign}${whole || ''}${frac}`;
}

function ftNumber(m: number): string {
  const ft = m * M_TO_FT;
  if (ft < 10) return String(Math.round(ft * 2) / 2).replace(/\.0$/, '');
  return String(Math.round(ft));
}

/**
 * Rewrites metre distances in prose ("2 m", "1.5–3 m", "≈0.8 m") as feet when the app is in feet.
 * Ratios stay true because every distance in the sentence is converted. "mm" focal lengths are untouched.
 */
export function localizeText(text: string, units: Units): string {
  if (units === 'm') return text;
  return text.replace(/(\d+(?:\.\d+)?)(?:\s?[–-]\s?(\d+(?:\.\d+)?))?\s?m\b(?!m)/g, (_all, a: string, b?: string) =>
    b ? `${ftNumber(Number(a))}–${ftNumber(Number(b))} ft` : `${ftNumber(Number(a))} ft`,
  );
}

/** Guide number in the current units, e.g. "18 m" or "59 ft". */
export function fmtGnShort(gnM: number, units: Units): string {
  return units === 'ft' ? `${Math.round(gnM * M_TO_FT)} ft` : `${+gnM.toFixed(1)} m`;
}

export function toMetres(v: number, units: Units) {
  return units === 'ft' ? v / M_TO_FT : v;
}
export function fromMetres(m: number, units: Units) {
  return units === 'ft' ? m * M_TO_FT : m;
}
