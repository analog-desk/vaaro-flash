import type { CameraId, CameraSpec, LensSpec } from './types';

// ---------------------------------------------------------------------------
// Lenses
// ---------------------------------------------------------------------------

export const CANON_FD_35_70: LensSpec = {
  id: 'fd35-70',
  name: 'Canon New FD 35–70mm f/3.5–4.5',
  focalMin: 35,
  focalMax: 70,
  maxApertureAtMin: 3.5,
  maxApertureAtMax: 4.5,
  minAperture: 22,
  closeFocusM: 0.5,
  maxMagnification: 0.15,
  filterMm: 52,
  focalStops: [35, 40, 50, 60, 70],
  source: 'Canon published specs as listed by Canon Classics / MIT FD lens table: 0.5 m close focus, 1:6.7 (0.15×), 52 mm filter, f/22 minimum.',
  notes: [
    'Maximum aperture is f/3.5 at 35mm and f/4.5 at 70mm. Canon does not publish the in-between values, so the app treats anything longer than 35mm as f/4.5 maximum.',
    'Apertures from f/5.6 down are used as marked across the zoom range (assumption: Canon does not document any drift).',
    'Maximum magnification (0.15×) is reached at 70mm and 0.5 m.',
  ],
};

export const XF_23_28: LensSpec = {
  id: 'xf23-2.8',
  name: 'Fujinon XF 23mm f/2.8 R WR',
  focalMin: 23,
  focalMax: 23,
  maxApertureAtMin: 2.8,
  maxApertureAtMax: 2.8,
  minAperture: 16,
  closeFocusM: 0.2,
  maxMagnification: 0.15,
  filterMm: 39,
  focalStops: [23],
  source: 'Fujifilm published specifications: f/2.8–f/16, 0.2 m minimum focus, 0.15× maximum magnification, 39 mm filter.',
  notes: ['Fixed 23mm frames like a 35mm lens on 35mm film. Zoom with your feet.'],
};

// ---------------------------------------------------------------------------
// Shutter / aperture / ISO scales
// ---------------------------------------------------------------------------

const fullStopShutters = [2, 1, 1 / 2, 1 / 4, 1 / 8, 1 / 15, 1 / 30, 1 / 60, 1 / 125, 1 / 250, 1 / 500, 1 / 1000];

const thirdStopShutterDenoms = [
  2.5, 3, 4, 5, 6, 8, 10, 13, 15, 20, 25, 30, 40, 50, 60, 80, 100, 125, 160, 200, 250, 320, 400, 500, 640, 800,
  1000, 1250, 1600, 2000, 2500, 3200, 4000, 5000, 6400, 8000,
];
const thirdStopLong = [30, 25, 20, 15, 13, 10, 8, 6, 5, 4, 3, 2.5, 2, 1.6, 1.3, 1, 0.8, 0.6, 0.5];
export const THIRD_STOP_SHUTTERS = [...thirdStopLong, ...thirdStopShutterDenoms.map((d) => 1 / d)];

export const THIRD_STOP_APERTURES = [
  1.4, 1.6, 1.8, 2, 2.2, 2.5, 2.8, 3.2, 3.5, 4, 4.5, 5, 5.6, 6.4, 7.1, 8, 9, 10, 11, 13, 14, 16, 18, 20, 22,
];

export const THIRD_STOP_ISOS = [
  64, 80, 100, 125, 160, 200, 250, 320, 400, 500, 640, 800, 1000, 1250, 1600, 2000, 2500, 3200, 4000, 5000, 6400,
  8000, 10000, 12800, 25600, 51200,
];

// ---------------------------------------------------------------------------
// Cameras
// ---------------------------------------------------------------------------

export const CAMERAS: Record<CameraId, CameraSpec> = {
  ae1p: {
    id: 'ae1p',
    name: 'Canon AE-1 Program',
    shortName: 'AE-1 Program',
    medium: 'film',
    format: '35mm film (135)',
    cropFactor: 1,
    cocMm: 0.03,
    flashSyncS: 1 / 60,
    shutterSpeeds: fullStopShutters,
    longestTimedS: 2,
    apertureStops: [3.5, 4, 4.5, 5.6, 8, 11, 16, 22],
    ttl: false,
    hss: false,
    rearCurtain: false,
    stabilisationStopsUsed: 0,
    lenses: [CANON_FD_35_70],
    focusAid: 'Manual focus: split-image / microprism screen. Line up the split image on an eye or an edge.',
    flashNotes: [
      'Normal X-sync is 1/60 s. Faster speeds give a partly black frame because the shutter curtain covers part of the film during the flash.',
      'The iT32 fires from the centre contact only. No TTL and no automatic shutter setting, so set everything yourself.',
      'Use Manual mode (aperture ring off "A") so the camera does not change the aperture. A manual flash calculation only holds at the aperture you chose.',
      'Rear-curtain sync and high-speed sync are not available.',
    ],
    sourceNotes: ['Canon AE-1 Program instruction manual: 2 s – 1/1000 s plus B, X-sync 1/60 s, film-speed dial ASA 12–3200.'],
  },
  xt5: {
    id: 'xt5',
    name: 'Fujifilm X-T5',
    shortName: 'X-T5',
    medium: 'digital',
    format: 'APS-C digital (1.5× crop)',
    cropFactor: 1.5,
    cocMm: 0.02,
    flashSyncS: 1 / 250,
    shutterSpeeds: THIRD_STOP_SHUTTERS,
    longestTimedS: 30,
    apertureStops: THIRD_STOP_APERTURES,
    isoRange: { min: 125, max: 12800, extendedMin: 64, extendedMax: 51200, stops: THIRD_STOP_ISOS },
    ttl: true,
    hss: true,
    rearCurtain: true,
    stabilisationStopsUsed: 3,
    lenses: [XF_23_28],
    focusAid: 'Autofocus: AF-S with face/eye detection for people, single point for products, AF-C for moving subjects.',
    flashNotes: [
      'Flash sync is 1/250 s with the mechanical shutter. Use the mechanical shutter (MS) for flash. Fujifilm listings disagree on flash with the electronic shutter, so do not rely on it.',
      'TTL, HSS and rear-curtain sync need the iT32 fitted with the Fujifilm X5-F module (or another Godox Fuji-protocol trigger) and current firmware on both.',
      'HSS output above 1/250 s is much lower than normal output and Godox does not publish an HSS guide number, so the app does not calculate HSS power.',
    ],
    sourceNotes: [
      'Fujifilm X-T5 specifications: flash sync 1/250 s (mechanical shutter), ISO 125–12800 (extended 64–51200), mechanical shutter up to 1/8000 s.',
      'The app assumes only 3 of the X-T5\'s rated in-body stabilisation stops. Stabilisation steadies the camera, not the subject.',
    ],
  },
};

/** Documented maximum aperture at a focal length. Returns the conservative value between the documented end points. */
export function maxApertureAt(lens: LensSpec, focal: number): { value: number; documented: boolean } {
  if (lens.maxApertureAtMin === lens.maxApertureAtMax) return { value: lens.maxApertureAtMin, documented: true };
  if (focal <= lens.focalMin) return { value: lens.maxApertureAtMin, documented: true };
  if (focal >= lens.focalMax) return { value: lens.maxApertureAtMax, documented: true };
  return { value: lens.maxApertureAtMax, documented: false };
}

export function clampFocal(lens: LensSpec, focal: number): number {
  return Math.min(lens.focalMax, Math.max(lens.focalMin, focal));
}
