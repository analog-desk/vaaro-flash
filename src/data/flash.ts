import type { FlashSpec, Modifier } from './types';

/**
 * Godox iT32.
 * Guide number: Godox's iT32 manual lists ≈ GN 18 (m, ISO 100) at 1/1. B&H and other retailers list 18 m / 59 ft at ISO 100.
 * The head does not zoom, so 18 is the figure for its single, fixed coverage. Godox does not publish the coverage angle.
 * Ken Rockwell measured about GN 11.5 m (38 ft) at ISO 100. Rated guide numbers are commonly optimistic, so the app
 * lets you pick the rated value, the measured value, or your own calibrated value.
 */
export const GODOX_IT32: FlashSpec = {
  id: 'it32',
  name: 'Godox iT32',
  ratedGnM: 18,
  gnReferenceIso: 100,
  gnProvenance: 'verified',
  gnNotes:
    'Godox rates the iT32 at GN 18 (metres, ISO 100, full power). The head does not zoom, so the rating applies at its one fixed coverage. Godox does not publish the beam angle.',
  measuredGnM: { value: 11.5, by: 'Ken Rockwell (independent review)' },
  zoom: false,
  coverageNote:
    'Fixed head with no zoom. Coverage is not published by Godox; one reviewer estimates the beam is roughly equivalent to a 28mm lens on full frame. If that holds, it covers 35–70mm on the AE-1 and the XF 23mm on the X-T5 (35mm equivalent).',
  powerStepsPerStop: 3,
  minPowerStops: -7,
  tiltDeg: { min: 0, max: 90 },
  rotateDeg: 270,
  recycleFullS: 1.5,
  colourTempNote: 'Godox does not list a colour temperature in the sources we could check. Treat it as roughly daylight-balanced, like other xenon speedlights.',
  sources: [
    'Godox iT32 manual (godox.com): GN ≈ 18 at 1/1, ISO 100; manual output 1/128–1/1 in 1/3-stop steps; ≈1.5 s full-power recycle.',
    'B&H / Strobepro listings: GN 18 m / 59 ft at ISO 100.',
    'Reviews (Amateur Photographer, Ken Rockwell, Digital Camera World): fixed head, no zoom; tilts up to 90°, rotates 270°; Rockwell measured ≈ GN 11.5 m.',
  ],
};

export type GnSource = 'rated' | 'measured' | 'custom';

/** Manual power settings offered by the iT32, full stops. */
export const FULL_STOP_POWERS = [1, 1 / 2, 1 / 4, 1 / 8, 1 / 16, 1 / 32, 1 / 64, 1 / 128] as const;

export interface ModifierSpec {
  id: Modifier;
  label: string;
  /** Typical light loss in stops (estimate — depends on the exact product). */
  lossStops: number;
  note: string;
}

export const MODIFIERS: Record<Modifier, ModifierSpec> = {
  bare: { id: 'bare', label: 'Bare head', lossStops: 0, note: 'No loss. Smallest, hardest light.' },
  diffuser: {
    id: 'diffuser',
    label: 'Clip-on diffuser',
    lossStops: 1,
    note: 'Typical loss ≈ 1 stop (estimate; varies by product). It softens shadow edges only slightly, because the light source is still small.',
  },
  softbox: {
    id: 'softbox',
    label: 'Small softbox / umbrella',
    lossStops: 1.7,
    note: 'Typical loss 1.5–2 stops (estimate). Much softer light, but only when it is close to the subject.',
  },
};

/** Extra loss of a bounce beyond the extra path length. White ceilings are assumed; coloured or dark surfaces lose far more. */
export const BOUNCE_SURFACE_LOSS_STOPS = 1.3;
