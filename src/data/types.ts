// Shared, strongly typed data structures for cameras, lenses, flash, film and scenarios.

/** How much we trust a value. Shown in the UI so you always know what a number is based on. */
export type Provenance =
  | 'verified' // published by the manufacturer (or consistent across manufacturer + independent sources)
  | 'calculated' // derived by this app from verified inputs and physics
  | 'estimate' // a reasoned starting point (typical scene brightness, light loss of a bounce, etc.)
  | 'assumption' // something we could not verify and had to assume
  | 'user'; // a value you typed in or chose

export type CameraId = 'ae1p' | 'xt5';
export type Units = 'm' | 'ft';

export interface LensSpec {
  id: string;
  name: string;
  /** Zoom range or single focal length in mm. */
  focalMin: number;
  focalMax: number;
  /** Maximum aperture at the short and long end. Only these two points are documented for variable-aperture zooms. */
  maxApertureAtMin: number;
  maxApertureAtMax: number;
  minAperture: number;
  /** Closest focus in metres. */
  closeFocusM: number;
  maxMagnification?: number;
  filterMm?: number;
  /** Selectable focal lengths (marked on the barrel or common stops). */
  focalStops: number[];
  source: string;
  notes?: string[];
}

export interface CameraSpec {
  id: CameraId;
  name: string;
  shortName: string;
  medium: 'film' | 'digital';
  format: string;
  /** Crop factor relative to 35mm full frame. */
  cropFactor: number;
  /** Circle of confusion used for depth-of-field maths, mm. */
  cocMm: number;
  /** Fastest shutter speed that syncs with a conventional flash (seconds). */
  flashSyncS: number;
  /** Shutter speeds the camera offers, in seconds, slowest first. */
  shutterSpeeds: number[];
  /** Longest timed speed; longer exposures need Bulb. */
  longestTimedS: number;
  /** Aperture values the app will recommend on this system. */
  apertureStops: number[];
  isoRange?: { min: number; max: number; extendedMin: number; extendedMax: number; stops: number[] };
  /** Whether the flash can use TTL with this camera + trigger. */
  ttl: boolean;
  hss: boolean;
  rearCurtain: boolean;
  /** Image stabilisation in stops; 0 if none. Used conservatively. */
  stabilisationStopsUsed: number;
  lenses: LensSpec[];
  focusAid: string;
  flashNotes: string[];
  sourceNotes: string[];
}

export interface FlashSpec {
  id: string;
  name: string;
  /** Rated guide number, metres, at the reference ISO, full power. */
  ratedGnM: number;
  gnReferenceIso: number;
  gnProvenance: Provenance;
  gnNotes: string;
  /** Independent measurement(s) that came in below the rating. */
  measuredGnM?: { value: number; by: string };
  zoom: false | { minMm: number; maxMm: number };
  coverageNote: string;
  powerStepsPerStop: number; // 3 = 1/3-stop steps
  minPowerStops: number; // -7 → 1/128
  tiltDeg: { min: number; max: number };
  rotateDeg: number;
  recycleFullS: number;
  colourTempNote: string;
  sources: string[];
}

export type SubjectId =
  | 'portrait'
  | 'street'
  | 'fashion'
  | 'product'
  | 'landscape'
  | 'food'
  | 'architecture'
  | 'macro'
  | 'automotive'
  | 'nightlife'
  | 'other';

export type LightingId =
  | 'sunny'
  | 'overcast'
  | 'golden'
  | 'blue'
  | 'indoor'
  | 'window'
  | 'backlit'
  | 'night'
  | 'lowlight'
  | 'verydark'
  | 'mixed'
  | 'studio';

export type FlashChoice = 'none' | 'direct' | 'bounce' | 'offcamera' | 'auto';

export type StyleId =
  | 'natural'
  | 'vintage'
  | 'direct90s'
  | 'cinematic'
  | 'airy'
  | 'contrast'
  | 'shadows'
  | 'warm'
  | 'editorial'
  | 'documentary'
  | 'dreamy'
  | 'minimal'
  | 'atmospheric'
  | 'commercial';

export type FlashDirection = 'front' | 'side45' | 'side90' | 'rim';
export type BounceSurface = 'ceiling' | 'wall';
export type Modifier = 'bare' | 'diffuser' | 'softbox';
