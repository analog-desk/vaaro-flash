// Scenario recommendation engine.
// Pure functions: takes a ShotInput, returns a fully explained Recommendation. No UI code here.

import { CAMERAS, clampFocal, maxApertureAt } from '../data/cameras';
import { FILM_BY_ID, FILMS, isAe1Compatible, type FilmStock } from '../data/films';
import { BOUNCE_SURFACE_LOSS_STOPS, GODOX_IT32, MODIFIERS, type GnSource } from '../data/flash';
import { COMBO_NOTES, LIGHTING, SUBJECTS } from '../data/scenarios';
import { STYLES } from '../data/styles';
import type {
  BounceSurface,
  CameraId,
  FlashChoice,
  FlashDirection,
  LightingId,
  Modifier,
  Provenance,
  StyleId,
  SubjectId,
  Units,
} from '../data/types';
import { depthOfField, type Dof } from './dof';
import { ceilIn, clamp, floorIn, isFiniteNumber, log2, nearestLog, shutterFor } from './exposure';
import { ceilingBounce, gnAtIso, requiredPower, snapPower, distanceFor, wallBounce, type SnappedPower } from './flashcalc';
import { fmtAperture, fmtDistance, fmtGnShort, fmtShutter, fmtStops, fmtThirds, localizeText } from './format';
import { correctReciprocity } from './reciprocity';

// ---------------------------------------------------------------------------
// Input / output types
// ---------------------------------------------------------------------------

export interface ShotInput {
  camera: CameraId;
  lensId?: string;
  subject: SubjectId;
  lighting: LightingId;
  flash: FlashChoice;
  style: StyleId;
  units: Units;
  // Film / ISO
  filmId?: string;
  customIso?: number;
  /** Exposure index if you rate the film differently from box speed (push/pull). */
  ei?: number;
  /** Digital ISO; undefined = auto. */
  digitalIso?: number;
  // Optional overrides (Advanced)
  focal?: number;
  aperture?: number;
  shutter?: number;
  powerStops?: number;
  distanceM?: number;
  role?: 'auto' | 'key' | 'fill';
  modifier?: Modifier;
  direction?: FlashDirection;
  bounceSurface?: BounceSurface;
  ceilingM?: number;
  wallM?: number;
  bgDistanceM?: number;
  tripod?: boolean;
  subjectEv?: number;
  backgroundEv?: number;
  gnSource: GnSource;
  customGnM?: number;
  useTtl?: boolean;
}

export interface Value<T> {
  value: T;
  display: string;
  provenance: Provenance;
  note?: string;
}

export type WarningLevel = 'critical' | 'caution' | 'info';
export interface Warning {
  level: WarningLevel;
  text: string;
}

export interface CalcLine {
  label: string;
  formula: string;
  result: string;
}

export type Technique = 'none' | 'direct' | 'bounce' | 'offcamera';

export interface FlashPlan {
  on: boolean;
  technique: Technique;
  techniqueLabel: string;
  role: 'key' | 'fill' | null;
  mode: string;
  power: SnappedPower | null;
  powerDisplay: string;
  ttlFec?: string;
  distance: Value<number> | null;
  /** Light path length for bounce. */
  pathM?: number;
  angle: string;
  tiltDeg?: number;
  direction: FlashDirection;
  modifier: Modifier;
  lossStops: number;
  gnRefM: number;
  gnSource: GnSource;
  gnAtIsoM: number;
  maxDistanceM: number | null;
  flashStopsOnSubject: number | null;
}

export interface ExposurePlan {
  subjectEv: number;
  backgroundEv: number;
  ambientSubjectStops: number;
  backgroundStops: number;
  totalSubjectStops: number;
  ambientShareOfSubject: number;
  biasStops: number;
  expected: string;
  subjectLine: string;
  backgroundLine: string;
}

export interface Recommendation {
  title: string;
  cameraName: string;
  lensName: string;
  medium: 'film' | 'digital';
  film: FilmStock | null;
  needsFilm: boolean;
  iso: Value<number>;
  aperture: Value<number>;
  shutter: Value<number>;
  focal: Value<number>;
  focus: { distanceM: number; display: string; method: string; dof: Dof; zone: string };
  flash: FlashPlan;
  exposure: ExposurePlan;
  instruction: string;
  decision: string | null;
  warnings: Warning[];
  assumptions: string[];
  why: string[];
  technique: string[];
  example: string[];
  mistakes: string[];
  creative: string[];
  filmNotes: string[];
  calc: CalcLine[];
  filmSuggestions: FilmStock[];
  copyText: string;
  bulb: boolean;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const DARK: LightingId[] = ['blue', 'indoor', 'night', 'lowlight', 'verydark', 'mixed', 'studio'];

function apertureList(cameraId: CameraId, maxAp: number, minAp: number): number[] {
  return CAMERAS[cameraId].apertureStops.filter((n) => n >= maxAp - 0.01 && n <= minAp + 0.01);
}

function biasLimits(medium: 'film' | 'digital', film: FilmStock | null): { max: number; reason: string } {
  if (medium === 'digital') return { max: 0.7, reason: 'digital highlights clip abruptly, so the app adds at most +0.7 EV' };
  if (!film) return { max: 0.3, reason: 'film type unknown, so the app stays within ±0.3 EV' };
  if (film.polarity === 'positive' || film.polarity === 'instant')
    return { max: 0.3, reason: `${film.name} is a ${film.polarity === 'positive' ? 'slide' : 'instant'} film with narrow latitude` };
  if (film.colour === 'color') {
    const max = film.latitude === 'wide' ? 1 : film.latitude === 'moderate' ? 0.7 : 0.3;
    return { max, reason: `${film.name}: colour negative with ${film.latitude} latitude` };
  }
  const max = film.latitude === 'wide' ? 0.7 : 0.3;
  return { max, reason: `${film.name}: B&W negative with ${film.latitude} latitude` };
}

function snapShutter(t: number, list: number[], fastestAllowed: number): number {
  const allowed = list.filter((v) => v >= fastestAllowed - 1e-9);
  return nearestLog(t, allowed.length ? allowed : list);
}

function fmtShutterBulb(t: number, longestTimed: number) {
  return t > longestTimed + 1e-9 ? `B · ${t >= 10 ? Math.round(t) : t.toFixed(1)} s` : fmtShutter(t);
}

interface AmbientSolve {
  N: number;
  t: number;
  iso: number;
  errorStops: number; // + = more exposure than target
  status: 'ok' | 'too-dark' | 'too-bright';
  shortfallStops: number; // how far outside limits (positive number)
  isoRaised: boolean;
}

/** Choose aperture & shutter (and ISO if allowed) to expose `targetEv100` correctly. */
function solveAmbient(opts: {
  targetEv100: number;
  iso: number;
  apertures: number[];
  Npref: number;
  shutters: number[];
  tFastest: number;
  tSlowest: number;
  isoAuto: boolean;
  isoList?: number[];
  isoMax?: number;
  lockN?: number;
  lockT?: number;
}): AmbientSolve {
  const { targetEv100, apertures, shutters, tFastest } = opts;
  const tSlowest = Math.max(opts.tSlowest, tFastest);
  let iso = opts.iso;
  let isoRaised = false;
  const Nmin = apertures[0]!;
  const Nmax = apertures[apertures.length - 1]!;
  let N = opts.lockN ?? nearestLog(clamp(opts.Npref, Nmin, Nmax), apertures);
  let status: AmbientSolve['status'] = 'ok';
  let shortfall = 0;

  if (opts.lockT !== undefined) {
    const t = opts.lockT;
    if (opts.lockN === undefined) {
      const ideal = Math.sqrt(t * 2 ** (targetEv100 + log2(iso / 100)));
      N = nearestLog(clamp(ideal, Nmin, Nmax), apertures);
    }
    const exact = shutterFor(N, targetEv100, iso);
    return { N, t, iso, errorStops: log2(t / exact), status, shortfallStops: 0, isoRaised };
  }

  let t = shutterFor(N, targetEv100, iso);
  if (t > tSlowest * 1.12 && opts.lockN === undefined) {
    N = Nmin;
    t = shutterFor(N, targetEv100, iso);
  }
  if (t > tSlowest * 1.12 && opts.isoAuto && opts.isoList) {
    const needed = iso * (t / tSlowest);
    const cap = opts.isoMax ?? 6400;
    const next = ceilIn(Math.min(needed, cap), opts.isoList) ?? cap;
    if (next > iso) {
      iso = Math.min(next, cap);
      isoRaised = true;
      t = shutterFor(N, targetEv100, iso);
    }
  }
  if (t > tSlowest * 1.12) {
    status = 'too-dark';
    shortfall = log2(t / tSlowest);
    t = tSlowest;
  }
  if (t < tFastest / 1.12) {
    const Nneeded = Math.sqrt(tFastest * 2 ** (targetEv100 + log2(iso / 100)));
    if (opts.lockN === undefined && Nneeded <= Nmax * 1.06) {
      N = ceilIn(Nneeded, apertures, 0.34) ?? Nmax;
      t = Math.max(tFastest, shutterFor(N, targetEv100, iso));
    } else {
      if (opts.lockN === undefined) N = Nmax;
      t = tFastest;
      const exact = shutterFor(N, targetEv100, iso);
      status = 'too-bright';
      shortfall = log2(t / exact);
    }
  }
  let tSnap = snapShutter(t, shutters, tFastest);
  if (tSnap > tSlowest * 1.12) tSnap = snapShutter(tSlowest, shutters.filter((v) => v <= tSlowest * 1.12), tFastest);
  // Refine: a neighbouring aperture may land closer to a whole shutter speed (cameras with full-stop dials).
  if (opts.lockN === undefined && status === 'ok') {
    const i = apertures.indexOf(N);
    let best = { N, t: tSnap, err: Math.abs(log2(tSnap / shutterFor(N, targetEv100, iso))) };
    for (const j of [i - 1, i + 1]) {
      const n = apertures[j];
      if (n === undefined) continue;
      const te = shutterFor(n, targetEv100, iso);
      if (te < tFastest / 1.12 || te > tSlowest * 1.12) continue;
      const ts = snapShutter(te, shutters, tFastest);
      if (ts > tSlowest * 1.12) continue;
      const err = Math.abs(log2(ts / te));
      const towardPref = Math.abs(log2(n / opts.Npref)) < Math.abs(log2(best.N / opts.Npref));
      if (err < best.err - 0.2 || (err < best.err + 0.05 && towardPref && err < 0.34)) best = { N: n, t: ts, err };
    }
    N = best.N;
    tSnap = best.t;
  }
  const exact = shutterFor(N, targetEv100, iso);
  return { N, t: tSnap, iso, errorStops: log2(tSnap / exact), status, shortfallStops: shortfall, isoRaised };
}

const SUBJECT_FILM_TAG: Record<SubjectId, string[]> = {
  portrait: ['portrait'],
  street: ['street', 'documentary'],
  fashion: ['portrait', 'studio'],
  product: ['product', 'studio'],
  landscape: ['landscape'],
  food: ['product', 'portrait'],
  architecture: ['landscape', 'fine-art'],
  macro: ['product', 'landscape'],
  automotive: ['landscape', 'product'],
  nightlife: ['night', 'flash'],
  other: ['everyday'],
};

function styleTagScore(f: FilmStock, tags: string[]): number {
  let s = 0;
  for (const tag of tags) {
    switch (tag) {
      case 'consumer':
        if (f.uses.includes('everyday') && f.colour === 'color' && f.category === 'color-negative') s += 2;
        break;
      case 'warm':
        if (/warm|golden/i.test(f.character)) s += 1.5;
        break;
      case 'grain':
        if (f.grain === 'medium' || f.grain === 'pronounced') s += 1;
        break;
      case 'bw':
        if (f.colour === 'bw') s += 2;
        break;
      case 'contrast':
        if (f.contrast === 'high' || f.contrast === 'very high') s += 1.5;
        break;
      case 'fine':
        if (['extremely fine', 'very fine', 'fine'].includes(f.grain)) s += 1;
        break;
      case 'tungsten':
        if (f.balance === 'tungsten') s += 2;
        break;
      case 'cinema':
        if (f.category === 'motion-picture') s += 2;
        break;
      case 'pastel':
        if (f.contrast === 'low' && f.colour === 'color') s += 1.5;
        break;
      case 'latitude':
        if (f.latitude === 'wide') s += 1;
        break;
      case 'halation':
        if (/halation/i.test(f.character)) s += 2;
        break;
      case 'push':
        if (f.push) s += 1.5;
        break;
      case 'natural':
        if (f.saturation === 'natural') s += 1;
        break;
      case 'accurate':
        if (f.saturation === 'natural' && ['extremely fine', 'very fine', 'fine'].includes(f.grain)) s += 1.5;
        break;
      default:
        if (f.uses.includes(tag as never)) s += 1;
    }
  }
  return s;
}

export function suggestFilms(input: Pick<ShotInput, 'subject' | 'lighting' | 'style' | 'flash'>, limit = 3): FilmStock[] {
  const light = LIGHTING[input.lighting];
  const style = STYLES[input.style];
  // Rough speed need: ISO for f/4 at 1/60 s with this light (handheld, no flash).
  const isoNeed = 100 * 2 ** (log2(16 * 60) - light.subjectEv);
  const flashLikely = input.flash !== 'none' && (DARK.includes(input.lighting) || input.flash !== 'auto');
  const candidates = FILMS.filter(
    (f) => isAe1Compatible(f) && (f.status === 'current' || f.status === 'limited') && f.category !== 'instant' && !(f.remjet && f.process === 'ECN-2'),
  );
  const scored = candidates.map((f) => {
    let s = 0;
    for (const t of SUBJECT_FILM_TAG[input.subject]) if (f.uses.includes(t as never)) s += 1.5;
    s += styleTagScore(f, style.filmTags);
    const speedGap = Math.abs(log2(f.iso / clamp(isoNeed, 50, 800)));
    s -= speedGap * (flashLikely ? 0.35 : 0.8);
    if (flashLikely) s += f.flash === 'excellent' ? 1.2 : f.flash === 'good' ? 0.5 : f.flash === 'fair' ? -0.5 : -2;
    if (f.category === 'creative' && !style.filmTags.includes('experimental')) s -= 2;
    if (f.category === 'infrared') s -= 4;
    if (f.balance === 'tungsten' && !DARK.includes(input.lighting)) s -= 2;
    if (f.status === 'limited') s -= 0.3;
    if (f.reference !== 'manufacturer datasheet') s -= 0.4;
    return { f, s };
  });
  scored.sort((a, b) => b.s - a.s);
  const out: FilmStock[] = [];
  for (const { f } of scored) {
    if (out.length >= limit) break;
    if (out.some((o) => o.colour === f.colour && o.iso === f.iso && o.maker === f.maker)) continue;
    out.push(f);
  }
  return out;
}

const TECH_LABEL: Record<Technique, string> = {
  none: 'No flash',
  direct: 'Direct flash',
  bounce: 'Bounced flash',
  offcamera: 'Off-camera flash',
};

const DIRECTION_LABEL: Record<FlashDirection, string> = {
  front: 'From the camera position',
  side45: '45° to one side, slightly above eye level',
  side90: '90° to the side (split light)',
  rim: 'Behind the subject (rim light)',
};

// ---------------------------------------------------------------------------
// Main entry
// ---------------------------------------------------------------------------

export function recommend(input: ShotInput): Recommendation {
  const cam = CAMERAS[input.camera];
  const lens = cam.lenses.find((l) => l.id === input.lensId) ?? cam.lenses[0]!;
  const subj = SUBJECTS[input.subject];
  const light = LIGHTING[input.lighting];
  const style = STYLES[input.style];
  const warnings: Warning[] = [];
  const assumptions: string[] = [];
  const calc: CalcLine[] = [];
  const filmNotes: string[] = [];
  const units = input.units;
  const D = (m: number) => fmtDistance(m, units);

  // ---------------- Focal length ----------------
  let focal: number;
  let focalProv: Provenance = 'estimate';
  if (isFiniteNumber(input.focal)) {
    focal = clampFocal(lens, input.focal);
    focalProv = 'user';
  } else {
    const want = clampFocal(lens, subj.focalFF / cam.cropFactor);
    focal = nearestLog(want, lens.focalStops);
  }
  const maxAp = maxApertureAt(lens, focal);
  if (!maxAp.documented)
    assumptions.push(
      `${lens.name}: maximum aperture at ${focal}mm is not published. The app uses f/${maxAp.value} (the documented long-end value) to stay safe.`,
    );
  if (cam.id === 'ae1p') assumptions.push('Apertures f/5.6 and smaller are treated as accurate at every focal length (not documented by Canon).');
  const apertures = apertureList(cam.id, maxAp.value, lens.minAperture);

  // ---------------- Film / ISO ----------------
  const film = input.filmId ? FILM_BY_ID[input.filmId] ?? null : null;
  let needsFilm = false;
  let iso: number;
  let isoProv: Provenance = 'user';
  let isoLabel: string;
  const isoAuto = cam.medium === 'digital' && !isFiniteNumber(input.digitalIso);
  if (cam.medium === 'film') {
    if (film) {
      iso = isFiniteNumber(input.ei) ? input.ei : film.iso;
      isoProv = isFiniteNumber(input.ei) ? 'user' : 'verified';
      isoLabel = `${film.name}${iso !== film.iso ? ` @ EI ${iso}` : ''}`;
      if (!isAe1Compatible(film))
        warnings.push({ level: 'critical', text: `${film.name} is not made in 35mm (135). It will not fit the AE-1 Program.` });
      if (film.status === 'discontinued' || film.status === 'historical')
        warnings.push({ level: 'caution', text: `${film.name} is ${film.status}. Expired film usually needs extra exposure (often +1 stop per decade, untested).` });
      if (film.process === 'K-14')
        warnings.push({ level: 'critical', text: 'Kodachrome cannot be processed in colour any more. Only B&W development is possible.' });
    } else if (isFiniteNumber(input.customIso)) {
      iso = input.customIso;
      isoProv = 'user';
      isoLabel = `ISO ${iso} (custom)`;
    } else {
      iso = 400;
      needsFilm = true;
      isoProv = 'assumption';
      isoLabel = 'ISO 400 (pick your film)';
      warnings.push({ level: 'critical', text: 'Pick the film you have loaded. These numbers assume ISO 400 until you do.' });
    }
    if (iso < 12 || iso > 3200)
      warnings.push({ level: 'caution', text: `The AE-1 Program's film-speed dial covers ISO 12–3200. For ISO ${iso}, use Manual mode with the settings shown here.` });
  } else {
    iso = isoAuto ? cam.isoRange!.min : clamp(input.digitalIso!, cam.isoRange!.extendedMin, cam.isoRange!.extendedMax);
    isoProv = isoAuto ? 'calculated' : 'user';
    isoLabel = `ISO ${iso}`;
  }

  // ---------------- Scene brightness ----------------
  const subjectEv = isFiniteNumber(input.subjectEv) ? input.subjectEv : light.subjectEv;
  const bgEv = isFiniteNumber(input.backgroundEv)
    ? input.backgroundEv
    : isFiniteNumber(input.subjectEv)
      ? light.backgroundEv + (input.subjectEv - light.subjectEv)
      : light.backgroundEv;
  if (!isFiniteNumber(input.subjectEv))
    assumptions.push(
      `${light.label} light is assumed to be about EV ${light.subjectEv} on the subject and EV ${light.backgroundEv} in the background (ISO 100; typical range EV ${light.evRange[0]}–${light.evRange[1]}). Meter the scene for real numbers and enter them in Advanced.`,
    );

  // ---------------- Exposure bias ----------------
  const lim = biasLimits(cam.medium, film);
  let bias = Math.min(style.subjectBias, lim.max);
  if (style.subjectBias > lim.max) filmNotes.push(`The ${style.label} look asks for +${style.subjectBias} EV; capped at +${lim.max} because ${lim.reason}.`);
  if (cam.medium === 'film' && film?.polarity === 'negative' && film.colour === 'color' && bias === 0)
    filmNotes.push(
      `${film.name} is exposed at its rated speed here. Some photographers add ⅓–1 stop to colour negative for denser shadows; that is a preference, not a rule, and it depends on the stock, the lab and the scene.`,
    );
  bias = Math.round(bias * 10) / 10;

  // ---------------- Shutter limits ----------------
  const tripod = !!input.tripod;
  const handheld = (() => {
    const base = 1 / (focal * cam.cropFactor);
    return base * 2 ** cam.stabilisationStopsUsed;
  })();
  const motion = subj.motionLimitS;
  const tSlowestNoFlash = tripod ? (motion ?? 60) : Math.min(handheld, motion ?? Infinity);
  const tSync = cam.flashSyncS;
  const tFastestCam = cam.shutterSpeeds[cam.shutterSpeeds.length - 1]!;
  const shutters = tripod && cam.id === 'ae1p' ? [...[60, 30, 15, 8, 4], ...cam.shutterSpeeds] : cam.shutterSpeeds;

  // ---------------- Decide flash ----------------
  let technique: Technique = input.flash === 'auto' || input.flash === 'none' ? 'none' : input.flash;
  let decision: string | null = null;
  let tripodSuggested = false;

  const noFlashTrial = solveAmbient({
    targetEv100: subjectEv - bias,
    iso,
    apertures,
    Npref: subj.aperture.pref,
    shutters,
    tFastest: tFastestCam,
    tSlowest: tSlowestNoFlash,
    isoAuto,
    isoList: cam.isoRange?.stops,
    isoMax: 6400,
  });

  const openedUpForHandheld = noFlashTrial.N < subj.aperture.pref / 1.9;
  if (subj.tripodFriendly && input.tripod === undefined && (input.flash === 'none' || input.flash === 'auto') && openedUpForHandheld) {
    tripodSuggested = true;
  }

  if (input.flash === 'auto') {
    const ambientOk = noFlashTrial.status !== 'too-dark' || noFlashTrial.shortfallStops < 0.6;
    const backlit = input.lighting === 'backlit';
    if (input.style === 'direct90s' && subj.flashAffinity !== 'low') {
      technique = 'direct';
      decision = 'Flash: yes. The 90s direct-flash look depends on bare on-camera flash overpowering the ambient light.';
    } else if (backlit && subj.flashAffinity !== 'low' && subj.distanceM <= 4) {
      technique = 'direct';
      decision = 'Flash: yes, to light your subject. The background is about 3 stops brighter than their shaded side; flash evens it out. A reflector also works.';
    } else if (tripodSuggested) {
      technique = 'none';
      decision = `No flash; use a tripod. Handheld you would have to open up to ${fmtAperture(noFlashTrial.N)} at ${fmtShutter(noFlashTrial.t)}; on a tripod you keep ${fmtAperture(subj.aperture.pref)} for depth of field.`;
    } else if (ambientOk) {
      technique = 'none';
      decision =
        subj.flashAffinity === 'low'
          ? `No flash. There is enough light, and a small speedlight cannot light a ${subj.label.toLowerCase()} scene evenly.`
          : `No flash. There is enough light to shoot ${fmtAperture(noFlashTrial.N)} at ${fmtShutter(noFlashTrial.t)} handheld, and natural light will look better here.`;
    } else if (subj.flashAffinity === 'low' || subj.tripodFriendly) {
      technique = 'none';
      tripodSuggested = true;
      decision = `No flash; use a tripod. The light is too dim to handhold, but the iT32 only reaches a short distance, so it cannot light a ${subj.label.toLowerCase()} scene.`;
    } else {
      technique = light.outdoors ? 'direct' : subj.preferredFlash === 'offcamera' ? 'bounce' : subj.preferredFlash;
      if (light.outdoors && technique === 'bounce') technique = 'direct';
      decision = `Flash: yes. Without it you would need ${fmtShutter(shutterFor(noFlashTrial.N, subjectEv, iso))} at ${fmtAperture(noFlashTrial.N)}, about ${noFlashTrial.shortfallStops.toFixed(1)} stops too slow to handhold. ${
        technique === 'bounce'
          ? 'Indoors, bouncing off the ceiling gives softer, more natural light.'
          : light.outdoors
            ? 'Outdoors there is no ceiling to bounce from, so the flash goes direct.'
            : 'Direct flash suits this subject; bounce instead if the ceiling is low and white.'
      }`;
    }
  }

  let bounceFallback = false;
  if (technique === 'bounce' && light.outdoors && (input.bounceSurface ?? 'ceiling') === 'ceiling') {
    bounceFallback = true;
    warnings.push({ level: 'caution', text: 'There is no ceiling outdoors, so the bounce is calculated as direct flash. Turn the head to a nearby wall, or use direct or off-camera flash.' });
  }
  const useTripod = tripod || tripodSuggested;

  // ---------------- GN ----------------
  const gnRefM =
    input.gnSource === 'custom' && isFiniteNumber(input.customGnM) && input.customGnM > 0
      ? input.customGnM
      : input.gnSource === 'measured'
        ? GODOX_IT32.measuredGnM!.value
        : GODOX_IT32.ratedGnM;
  const gnIso = gnAtIso(gnRefM, GODOX_IT32.gnReferenceIso, iso);

  // ---------------- Solve ----------------
  const modifier: Modifier =
    input.modifier ??
    (technique === 'offcamera'
      ? style.preferredModifier
      : technique === 'direct' && !style.hardLight && style.preferredModifier === 'diffuser'
        ? 'diffuser'
        : 'bare');
  const direction: FlashDirection =
    input.direction ?? (technique === 'offcamera' ? (style.preferredDirection === 'front' ? 'side45' : style.preferredDirection) : 'front');

  let N: number;
  let t: number;
  let flash: FlashPlan;
  let exposure: ExposurePlan;
  let bulb = false;
  let tradeoff: string | null = null;
  let isoUsed = iso;
  let isoRaised = false;
  let distanceM = isFiniteNumber(input.distanceM) ? clamp(input.distanceM, 0.3, 30) : subj.distanceM;
  const distanceProv: Provenance = isFiniteNumber(input.distanceM) ? 'user' : 'estimate';
  if (distanceM < lens.closeFocusM) {
    warnings.push({ level: 'caution', text: `The lens focuses no closer than ${D(lens.closeFocusM)}. Distance set to ${D(lens.closeFocusM)}.` });
    distanceM = lens.closeFocusM;
  }

  const ambientShutterLimitFlash = useTripod ? 30 : style.allowDrag ? Math.max(1 / 15, Math.min(handheld, 1 / 8)) : Math.min(handheld, motion ?? Infinity);

  if (technique === 'none') {
    const s = solveAmbient({
      targetEv100: subjectEv - bias,
      iso,
      apertures,
      Npref: subj.aperture.pref,
      shutters: useTripod && cam.id === 'ae1p' ? shutters : cam.shutterSpeeds,
      tFastest: tFastestCam,
      tSlowest: useTripod ? 1800 : tSlowestNoFlash,
      isoAuto,
      isoList: cam.isoRange?.stops,
      isoMax: 6400,
      lockN: isFiniteNumber(input.aperture) ? nearestLog(input.aperture, apertures) : undefined,
      lockT: isFiniteNumber(input.shutter) ? input.shutter : undefined,
    });
    N = s.N;
    t = s.t;
    isoUsed = s.iso;
    isoRaised = s.isoRaised;
    if (s.status === 'too-dark') {
      const pushTo = Math.round(iso * 2 ** s.shortfallStops);
      warnings.push({
        level: 'critical',
        text: `Too dark to handhold: even at ${fmtAperture(N)} and ${fmtShutter(t)} you are ${s.shortfallStops.toFixed(1)} stops under. Use a tripod, flash${
          cam.medium === 'film' ? `, faster film, or push this roll to about EI ${pushTo}` : ', or a higher ISO'
        }.`,
      });
    }
    if (s.status === 'too-bright')
      warnings.push({
        level: 'critical',
        text: `Too bright: even ${fmtAperture(N)} at ${fmtShutter(t)} overexposes by ${s.shortfallStops.toFixed(1)} stops. Use slower film or an ND filter (${lens.filterMm ?? '?'}mm thread) of about ${Math.ceil(s.shortfallStops)} stops.`,
      });
    if (t > cam.longestTimedS + 1e-9) bulb = true;
    const aS = log2(t / shutterFor(N, subjectEv, isoUsed));
    const bS = log2(t / shutterFor(N, bgEv, isoUsed));
    exposure = buildExposure(subjectEv, bgEv, aS, bS, aS, 1, bias, null);
    flash = {
      on: false,
      technique: 'none',
      techniqueLabel: TECH_LABEL.none,
      role: null,
      mode: 'Off',
      power: null,
      powerDisplay: '—',
      distance: null,
      angle: '—',
      direction,
      modifier,
      lossStops: 0,
      gnRefM,
      gnSource: input.gnSource,
      gnAtIsoM: gnIso,
      maxDistanceM: null,
      flashStopsOnSubject: null,
    };
    calc.push({
      label: 'Ambient exposure',
      formula: `t = N² / 2^(EV + log₂(ISO/100)) = ${N}² / 2^(${(subjectEv - bias).toFixed(1)} + ${log2(isoUsed / 100).toFixed(2)})`,
      result: `${fmtShutter(shutterFor(N, subjectEv - bias, isoUsed))} → set ${fmtShutterBulb(t, cam.longestTimedS)} (${fmtStops(s.errorStops)})`,
    });
  } else {
    // Flash in use.
    const effTech: Technique = bounceFallback ? 'direct' : technique;
    // Light path & loss
    let pathM = distanceM;
    let lossStops = MODIFIERS[modifier].lossStops;
    let tiltDeg: number | undefined;
    let angle = 'Head straight ahead, level';
    let flashDistanceM = distanceM;
    if (effTech === 'offcamera') {
      flashDistanceM = isFiniteNumber(input.distanceM) ? distanceM : modifier === 'softbox' ? 1.2 : Math.min(2, subj.distanceM);
      pathM = flashDistanceM;
      angle = DIRECTION_LABEL[direction];
    }
    if (effTech === 'bounce') {
      const surface = input.bounceSurface ?? 'ceiling';
      const geo = surface === 'ceiling' ? ceilingBounce(distanceM, input.ceilingM ?? 2.6) : wallBounce(distanceM, input.wallM ?? 1.5);
      pathM = geo.pathM;
      lossStops = BOUNCE_SURFACE_LOSS_STOPS + (modifier === 'diffuser' ? 0.3 : 0);
      tiltDeg = surface === 'ceiling' ? Math.round(geo.tiltDeg / 15) * 15 : undefined;
      angle = surface === 'ceiling' ? `Tilt the head up ≈${tiltDeg}° toward a white ceiling` : 'Rotate the head toward a white wall beside you, slightly forward';
      assumptions.push(
        `Bounce: ${geo.note} A white ${surface} is assumed to lose a further ≈${BOUNCE_SURFACE_LOSS_STOPS} stops (estimate). Coloured or dark surfaces lose much more and tint the light.`,
      );
      if (surface === 'ceiling' && (input.ceilingM ?? 2.6) > 3.5)
        warnings.push({ level: 'caution', text: 'High ceiling: bounce loses a lot of power and light comes from too far above. Consider direct with a diffuser.' });
    }
    if (effTech === 'direct' && modifier === 'diffuser') angle = 'Head straight ahead with the diffuser fitted';
    if (effTech === 'direct' && subj.id === 'macro') angle = 'Tilt the head slightly down toward the subject (avoids overshooting at close range)';
    if (lossStops > 0 && effTech !== 'bounce')
      assumptions.push(`${MODIFIERS[modifier].label}: ${MODIFIERS[modifier].note}`);

    // Role
    const daylightish = !DARK.includes(input.lighting);
    let path: 'ambient-led' | 'flash-led' = daylightish ? 'ambient-led' : 'flash-led';
    if (input.role === 'key') path = 'flash-led';
    if (input.role === 'fill') path = 'ambient-led';
    if (input.lighting === 'mixed' && input.role !== 'fill') path = 'flash-led';

    const lockN = isFiniteNumber(input.aperture) ? nearestLog(input.aperture, apertures) : undefined;
    let lockT = isFiniteNumber(input.shutter) ? input.shutter : undefined;
    if (lockT !== undefined && lockT < tSync - 1e-9) {
      warnings.push({
        level: 'critical',
        text:
          cam.id === 'ae1p'
            ? `${fmtShutter(lockT)} is faster than the AE-1 Program's 1/60 s flash sync. Part of the frame would be black. Calculated at 1/60 s instead.`
            : `${fmtShutter(lockT)} is faster than the X-T5's 1/250 s sync. It only works with HSS (TTL via X5-F), whose output is far lower and not published. Calculated at 1/250 s.`,
      });
      lockT = tSync;
    }

    let role: 'key' | 'fill';
    let aS: number;
    let bS: number;
    if (path === 'ambient-led') {
      const backlit = input.lighting === 'backlit';
      const targetEv = backlit ? bgEv + 0.3 : subjectEv - bias;
      const s = solveAmbient({
        targetEv100: targetEv,
        iso,
        apertures,
        Npref: subj.aperture.pref,
        shutters: cam.shutterSpeeds,
        tFastest: tSync,
        tSlowest: useTripod ? 30 : Math.min(handheld, motion ?? Infinity),
        isoAuto,
        isoList: cam.isoRange?.stops,
        isoMax: 6400,
        lockN,
        lockT,
      });
      N = s.N;
      t = s.t;
      isoUsed = s.iso;
      isoRaised = s.isoRaised;
      if (s.status === 'too-bright') {
        warnings.push({
          level: 'critical',
          text: `At the ${fmtShutter(tSync)} sync limit, even ${fmtAperture(N)} overexposes the ambient light by ${s.shortfallStops.toFixed(1)} stops. ${
            cam.id === 'ae1p'
              ? `Use ISO 100 or slower film, or an ND filter (${lens.filterMm}mm). An ND filter also cuts the flash, so the flash range stays short.`
              : 'Lower the ISO, add an ND filter, or switch to HSS (TTL with the X5-F) for a faster shutter.'
          }`,
        });
      }
      if (s.status === 'too-dark')
        warnings.push({ level: 'caution', text: `Ambient is ${s.shortfallStops.toFixed(1)} stops under even at ${fmtAperture(N)} ${fmtShutter(t)}. The flash will dominate the subject.` });
      aS = log2(t / shutterFor(N, subjectEv, isoUsed));
      bS = log2(t / shutterFor(N, bgEv, isoUsed));
      role = aS < -1 ? 'key' : 'fill';
      if (cam.id === 'xt5' && s.status === 'too-bright') {
        const hss = solveAmbient({
          targetEv100: targetEv,
          iso: isoUsed,
          apertures,
          Npref: subj.aperture.pref,
          shutters: cam.shutterSpeeds,
          tFastest: 1 / 8000,
          tSlowest: 1 / 250,
          isoAuto: false,
        });
        warnings.push({
          level: 'info',
          text: `HSS alternative (needs X5-F + TTL): ${fmtAperture(hss.N)} at ${fmtShutter(hss.t)}. Godox does not publish HSS output, so use TTL and check the histogram.`,
        });
      }
    } else {
      // Flash-led: aperture from the subject, shutter from the background target.
      N = lockN ?? nearestLog(clamp(subj.aperture.pref, apertures[0]!, apertures[apertures.length - 1]!), apertures);
      const studio = input.lighting === 'studio';
      const bgOffset = studio ? Math.min(style.backgroundOffset, -3) : style.backgroundOffset;
      const tSlow = ambientShutterLimitFlash;
      const tHand = Math.max(tSync, Math.min(handheld, motion ?? Infinity));
      const pickT = (n: number) => {
        if (lockT !== undefined) return lockT;
        const tIdeal = shutterFor(n, bgEv, isoUsed) * 2 ** bgOffset;
        let tc = clamp(tIdeal, tSync, Math.max(tSync, tSlow));
        // Dragging below the handheld limit is only safe when ambient on the subject stays ≥1.5 stops under the flash.
        if (!useTripod && tc > tHand) tc = Math.min(tc, Math.max(tHand, shutterFor(n, subjectEv, isoUsed) * 2 ** -1.5));
        const snapped = snapShutter(tc, cam.shutterSpeeds, tSync);
        return snapped > tc * 1.12 && snapped > tHand ? snapShutter(tc, cam.shutterSpeeds.filter((v) => v <= tc * 1.12), tSync) : snapped;
      };
      // Digital auto ISO: rather than dragging the shutter very slowly for the background, raise ISO (up to 1600)
      // so the background target lands near 1/30 s. Less ghosting and shake for the same look.
      if (isoAuto && cam.isoRange && lockT === undefined) {
        const tIdealBase = shutterFor(N, bgEv, isoUsed) * 2 ** bgOffset;
        const tTarget = Math.max(tSync, 1 / 30);
        if (tIdealBase > tTarget * 1.3) {
          const next = ceilIn(Math.min(1600, isoUsed * (tIdealBase / tTarget)), cam.isoRange.stops) ?? 1600;
          if (next > isoUsed) {
            isoUsed = Math.min(next, 1600);
            isoRaised = true;
          }
        }
      }
      t = pickT(N);
      aS = log2(t / shutterFor(N, subjectEv, isoUsed));
      bS = log2(t / shutterFor(N, bgEv, isoUsed));
      role = aS < -1 ? 'key' : 'fill';
      // Feasibility: open up / raise ISO if the flash cannot reach.
      const need = (n: number, isoX: number, tt: number) => {
        const a = log2(tt / shutterFor(n, subjectEv, isoX));
        const target = aS < -1 ? Math.max(2 ** bias - 2 ** a, 2 ** -3) : 2 ** (bias + style.fillOffset);
        return requiredPower(n, pathM, gnAtIso(gnRefM, 100, isoX), lossStops, target);
      };
      let p = need(N, isoUsed, t);
      if (p > 1 && lockN === undefined) {
        const Nneeded = N / Math.sqrt(p);
        const Nnew = floorIn(Nneeded, apertures) ?? apertures[0]!;
        if (Nnew < N) {
          N = Nnew;
          t = pickT(N);
          p = need(N, isoUsed, t);
        }
      }
      if (p > 1 && isoAuto && cam.isoRange) {
        const isoNeeded = isoUsed * p;
        const next = ceilIn(Math.min(isoNeeded, 6400), cam.isoRange.stops) ?? 6400;
        if (next > isoUsed) {
          isoUsed = next;
          isoRaised = true;
          t = pickT(N);
          p = need(N, isoUsed, t);
        }
      }
      if (p < 2 ** GODOX_IT32.minPowerStops && lockN === undefined) {
        const Nneeded = N * Math.sqrt(2 ** GODOX_IT32.minPowerStops / p);
        const Nnew = ceilIn(Nneeded, apertures) ?? apertures[apertures.length - 1]!;
        if (Nnew > N) {
          N = Nnew;
          t = pickT(N);
          p = need(N, isoUsed, t);
        }
      }
      aS = log2(t / shutterFor(N, subjectEv, isoUsed));
      bS = log2(t / shutterFor(N, bgEv, isoUsed));
      role = aS < -1 ? 'key' : 'fill';
      const tWanted = shutterFor(N, bgEv, isoUsed) * 2 ** bgOffset;
      if (lockT === undefined && tWanted > t * 1.8 && !useTripod)
        tradeoff = `Trade-off: the ${style.label} look wants about ${fmtShutter(tWanted)} for the background, but that is too slow to handhold at ${focal}mm with this much ambient on the subject. The app kept ${fmtShutter(t)}; use a tripod, zoom wider, or accept a darker background (${fmtStops(bS)}).`;
    }

    const gnIsoUsed = gnAtIso(gnRefM, GODOX_IT32.gnReferenceIso, isoUsed);
    const target = role === 'key' ? Math.max(2 ** bias - 2 ** aS, 2 ** -3) : 2 ** (bias + style.fillOffset);
    let exactP = requiredPower(N, pathM, gnIsoUsed, lossStops, target);
    const maxReach = distanceFor(N, gnIsoUsed, 1, lossStops, target);
    let distanceNote: string | undefined;

    // Not enough power at this distance → move closer (if distance not fixed by user).
    if (exactP > 1.12) {
      const reachCamera = effTech === 'bounce' ? null : maxReach;
      if (!isFiniteNumber(input.distanceM) && reachCamera !== null && reachCamera >= lens.closeFocusM) {
        const newD = Math.floor(reachCamera * 10) / 10;
        warnings.push({
          level: 'caution',
          text: `At ${fmtAperture(N)} the iT32 only reaches ${D(reachCamera)} at full power for this exposure. Distance set to ${D(newD)}${
            effTech === 'offcamera' ? ' (flash-to-subject)' : ''
          }.`,
        });
        if (effTech === 'offcamera') flashDistanceM = newD;
        else distanceM = newD;
        pathM = newD;
        distanceNote = 'Moved closer so the flash can reach';
        exactP = requiredPower(N, pathM, gnIsoUsed, lossStops, target);
      } else if (reachCamera !== null && reachCamera < lens.closeFocusM) {
        warnings.push({
          level: 'critical',
          text: `The flash cannot provide this ${role === 'fill' ? 'fill' : 'exposure'} at any usable distance at ${fmtAperture(N)} (reach ${D(reachCamera)}). ${
            role === 'fill' ? 'Use a reflector, turn the subject, or skip the flash.' : 'Use faster film or a wider aperture.'
          }`,
        });
      } else {
        warnings.push({
          level: 'critical',
          text: `Not enough flash power: full power is ${log2(exactP).toFixed(1)} stops short at ${D(pathM)}${effTech === 'bounce' ? ' (bounce path)' : ''}. ${
            effTech === 'bounce' ? 'Switch to direct flash, bounce from a lower surface, or ' : ''
          }move closer, open the aperture, or use faster film.`,
        });
      }
    }
    const power = isFiniteNumber(input.powerStops)
      ? snapPower(2 ** clamp(input.powerStops, GODOX_IT32.minPowerStops, 0))
      : snapPower(exactP, GODOX_IT32.powerStepsPerStop, GODOX_IT32.minPowerStops);
    if (isFiniteNumber(input.powerStops)) power.exact = exactP;
    if (isFiniteNumber(input.powerStops)) power.errorStops = log2(power.fraction / exactP);
    if (power.limit === 'over' || (power.fraction === 2 ** GODOX_IT32.minPowerStops && power.errorStops > 0.17)) {
      const minD = pathM * Math.sqrt(2 ** GODOX_IT32.minPowerStops / exactP);
      warnings.push({
        level: 'caution',
        text: `Even 1/128 is ${power.errorStops.toFixed(1)} stops too strong here. Step back to about ${D(minD)}, stop down, or add a diffuser.`,
      });
    }
    const flashActual = target * 2 ** power.errorStops;
    const totalLinear = role === 'key' ? flashActual + 2 ** aS : 2 ** aS + flashActual;
    const total = log2(totalLinear);
    if (Math.abs(power.errorStops) > 0.05 && !power.limit)
      filmNotes.push(`Nearest available flash setting differs from the exact requirement by ${fmtStops(power.errorStops)}. That is well within negative film latitude; on slide film it is visible.`);

    // Ghosting risk
    if (role === 'key' && aS > -2.2 && motion !== null && t > motion * 1.4 && !useTripod)
      warnings.push({
        level: 'info',
        text: `Slow-sync ghosting: ambient light on the subject is only ${Math.abs(aS).toFixed(1)} stops below the flash at ${fmtShutter(t)}. Movement will leave a soft ghost around the sharp flash image. Intentional for some looks; use a faster shutter to avoid it.`,
      });

    // TTL on X-T5
    let ttlFec: string | undefined;
    let mode = cam.ttl ? 'Manual (M)' : 'Manual (M) — no TTL on this camera';
    if (cam.ttl && input.useTtl !== false) {
      const fec = role === 'key' ? bias : bias + style.fillOffset;
      ttlFec = fmtThirds(Math.round(fec * 3) / 3);
      mode = 'TTL via X5-F';
    }

    const dispDistance = effTech === 'offcamera' ? flashDistanceM : distanceM;
    flash = {
      on: true,
      technique: effTech,
      techniqueLabel: bounceFallback ? 'Direct flash (bounce not possible)' : TECH_LABEL[effTech],
      role,
      mode,
      power,
      powerDisplay: ttlFec !== undefined ? `TTL ${ttlFec}` : power.label,
      ttlFec,
      distance: {
        value: dispDistance,
        display: D(dispDistance),
        provenance: distanceNote ? 'calculated' : distanceProv,
        note: distanceNote ?? (effTech === 'offcamera' ? 'Flash-to-subject' : 'Camera-to-subject'),
      },
      pathM: effTech === 'bounce' ? pathM : undefined,
      angle,
      tiltDeg,
      direction,
      modifier,
      lossStops,
      gnRefM,
      gnSource: input.gnSource,
      gnAtIsoM: gnIsoUsed,
      maxDistanceM: effTech === 'bounce' ? null : maxReach,
      flashStopsOnSubject: log2(flashActual),
    };
    exposure = buildExposure(subjectEv, bgEv, aS, bS, total, 2 ** aS / totalLinear, bias, role);

    // Calculation trace, in the user's units (GN and distance must use the same unit).
    const U = units === 'ft' ? 3.28084 : 1;
    const u = units === 'ft' ? 'ft' : 'm';
    calc.push(
      {
        label: 'Guide number at your ISO',
        formula: `GN(ISO ${isoUsed}) = ${(gnRefM * U).toFixed(units === 'ft' ? 0 : 1)} ${u} × √(${isoUsed}/100)`,
        result: `${(gnIsoUsed * U).toFixed(1)} ${u}`,
      },
      {
        label: 'Ambient on subject',
        formula: `subject EV ${subjectEv} at ${fmtAperture(N)}, ${fmtShutter(t)}, ISO ${isoUsed}`,
        result: fmtStops(aS),
      },
      {
        label: 'Flash target',
        formula:
          role === 'key'
            ? `flash = 2^${bias.toFixed(1)} − 2^${aS.toFixed(1)} (fill the gap the ambient leaves)`
            : `fill = 2^(${bias.toFixed(1)} + ${style.fillOffset}) (${style.label} fill ratio)`,
        result: `${fmtStops(log2(target))} relative to a full exposure`,
      },
      {
        label: 'Required power',
        formula: `p = (N × d / GN)² × 2^loss × target = (${N} × ${(pathM * U).toFixed(2)} ${u} / ${(gnIsoUsed * U).toFixed(1)} ${u})² × 2^${lossStops.toFixed(1)} × ${target.toFixed(2)}`,
        result: `${exactP >= 0.01 ? exactP.toFixed(3) : exactP.toExponential(1)} → ${power.label} (${fmtStops(power.errorStops)})`,
      },
      {
        label: 'Reach at full power',
        formula: `d = GN × √1 / (N × √(2^loss × target))`,
        result: effTech === 'bounce' ? `${D(maxReach)} light path` : D(maxReach),
      },
    );
  }

  // ---------------- Reciprocity ----------------
  if (t > 1 && cam.medium === 'film') {
    const rec = correctReciprocity(t, film?.reciprocity, film?.name ?? 'This film');
    if (rec.note) filmNotes.push(rec.note);
    if (rec.addedStops > 0.15) {
      const corrected = rec.correctedS;
      calc.push({ label: 'Reciprocity correction', formula: `metered ${t.toFixed(1)} s`, result: `expose ≈ ${corrected.toFixed(1)} s` });
      t = corrected;
    }
    if (t > cam.longestTimedS + 1e-9) bulb = true;
  }
  if (cam.medium === 'digital' && t > cam.longestTimedS) bulb = true;

  // ---------------- Focus & depth of field ----------------
  let focusM = distanceM;
  let zone = '';
  const dofAt = (s: number) => depthOfField(focal, N, cam.cocMm, s);
  let dof = dofAt(focusM);
  if (input.subject === 'landscape' || input.subject === 'architecture') {
    focusM = Math.max(lens.closeFocusM, dof.hyperfocalM);
    dof = dofAt(focusM);
    zone = `Hyperfocal: focus at ${D(focusM)}; sharp from ${D(dof.nearM)} to infinity.`;
  } else if (input.subject === 'street' || input.subject === 'nightlife') {
    zone = `Zone focus at ${D(focusM)}: sharp from ${D(dof.nearM)} to ${D(dof.farM)}.`;
  } else {
    zone = `At ${D(focusM)}, sharp from ${D(dof.nearM)} to ${D(dof.farM)} (${dof.totalM < 1 ? `${Math.round(dof.totalM * 100)} cm` : D(dof.totalM)} deep).`;
  }
  const focus = {
    distanceM: focusM,
    display: D(focusM),
    method: cam.medium === 'film' ? subj.focus.film : subj.focus.digital,
    dof,
    zone,
  };

  // ---------------- Warnings that always apply ----------------
  if (flash.on && cam.id === 'ae1p')
    warnings.unshift({ level: 'caution', text: 'Set the shutter dial yourself (1/60 or slower) and use Manual. The AE-1 will not set sync speed for the iT32.' });
  if (flash.on && input.gnSource === 'rated' && !(cam.ttl && flash.ttlFec !== undefined))
    warnings.push({
      level: 'caution',
      text: `Power assumes Godox's rated GN ${fmtGnShort(GODOX_IT32.ratedGnM, units)}. One independent test measured ≈${fmtGnShort(GODOX_IT32.measuredGnM!.value, units)} (≈1.3 stops less). Bracket, or set your own GN under Adjust.`,
    });
  if (flash.on && input.gnSource === 'custom')
    assumptions.push(`Guide number ${fmtGnShort(gnRefM, units)} at ISO 100 is your value (user-supplied).`);
  if (flash.on && input.gnSource === 'measured')
    assumptions.push(
      `Guide number ${fmtGnShort(GODOX_IT32.measuredGnM!.value, units)} is an independent measurement (Ken Rockwell), not Godox's rating of ${fmtGnShort(GODOX_IT32.ratedGnM, units)}.`,
    );
  if (flash.on && film?.balance === 'tungsten')
    warnings.push({ level: 'info', text: `${film.name} is tungsten-balanced; flash (≈daylight) will render the subject blue. Add a CTO gel to the flash, or accept the cool look.` });
  if (flash.on && (film?.polarity === 'positive'))
    warnings.push({ level: 'info', text: 'Slide film: bracket the flash power ±⅓ stop. There is very little latitude.' });
  if (flash.on && cam.id === 'xt5' && flash.technique === 'offcamera')
    assumptions.push('Off-camera on the X-T5: mount the X5-F module on the camera as a transmitter for the iT32 (requires current Godox firmware).');
  if (flash.on && cam.id === 'ae1p' && flash.technique === 'offcamera')
    assumptions.push(
      'Off-camera on the AE-1: put a Godox Canon-protocol transmitter (e.g. the X5 module) in the hot shoe and set the iT32 to manual. Centre-pin triggering from a film body is common with Godox Canon triggers but Godox does not document it for the X5 module. Test with a few blank frames first.',
    );
  if (t > (cam.id === 'ae1p' ? 1 / 30 : 1 / 8) && !useTripod && technique === 'none')
    warnings.push({ level: 'info', text: `${fmtShutter(t)} handheld: brace yourself against something and exhale before releasing.` });
  if (isoRaised) warnings.push({ level: 'info', text: `Auto ISO raised to ${isoUsed} to keep the shutter handholdable. Expect more noise above ISO 3200.` });
  if (tripodSuggested) warnings.push({ level: 'info', text: 'Tripod recommended: exposure calculated for a stable camera.' });

  // ---------------- Film notes ----------------
  if (cam.medium === 'film' && film) {
    if (film.polarity === 'positive') filmNotes.push(`${film.name} is slide film: meter carefully (highlights matter most) and keep exposure within about ±⅓ stop.`);
    if (film.colour === 'color' && film.polarity === 'negative') filmNotes.push(`${film.name}: colour negative holds overexposure better than underexposure; underexposed frames turn grainy and muddy.`);
    if (film.colour === 'bw' && film.process === 'B&W') filmNotes.push(`${film.name}: expose for the shadows; B&W negative recovers highlights in printing or scanning.`);
    if (film.process === 'ECN-2') filmNotes.push(`${film.name} needs ECN-2 processing (rem-jet). Use a lab that offers it.`);
    if (film.orthochromatic) filmNotes.push(`${film.name} is orthochromatic: red renders very dark; under tungsten light its speed drops.`);
    if (film.push) filmNotes.push(film.push);
    for (const n of film.notes ?? []) if (!filmNotes.includes(n)) filmNotes.push(n);
    if (isFiniteNumber(input.ei) && input.ei !== film.iso) {
      const stops = log2(input.ei / film.iso);
      filmNotes.push(
        `Rated at EI ${input.ei}: that is ${stops > 0 ? 'push' : 'pull'} ${Math.abs(stops).toFixed(1)} stop(s). Set the AE-1's film-speed dial to ${input.ei} and tell the lab to ${stops > 0 ? 'push' : 'pull'} the whole roll. Changing the dial alone without changing development just under- or overexposes the film.`,
      );
    }
  }
  if (cam.medium === 'digital') {
    filmNotes.push(`Digital: ISO ${isoUsed}. Raising ISO amplifies the signal; it does not make the sensor more sensitive, so noise rises and dynamic range shrinks.`);
    filmNotes.push(`For a film-like result try the "${style.fujiSimulation}" film simulation.`);
  }

  // ---------------- Narrative text ----------------
  const title = `${light.label} ${subj.label.toLowerCase()}`;
  const N_ = fmtAperture(N);
  const T_ = fmtShutterBulb(t, cam.longestTimedS);
  const shutterNote =
    flash.on && cam.id === 'ae1p'
      ? t >= tSync - 1e-9
        ? 'At or below the 1/60 sync limit'
        : 'Above sync limit!'
      : flash.on
        ? `Sync limit ${fmtShutter(tSync)}`
        : undefined;

  const instruction = buildInstruction({ flash, N_, T_, distanceDisplay: D(distanceM), subj: subj.noun, cam: cam.id, bulb, tripod: useTripod, focusDisplay: focus.display });
  const why = buildWhy({ input, N, t, iso: isoUsed, flash, exposure, cam: cam.id, style: style.label, focal, crop: cam.cropFactor, lensMax: maxAp.value });
  if (tradeoff) why.push(tradeoff);
  const technique_ = buildTechnique(flash, input, D, cam.id);
  const example = buildExample({ cam: cam.id, film, iso: isoUsed, N_, T_, focal, flash, focus: focus.display, bulb, tripod: useTripod, subject: subj.noun });
  // Fixed-focal-length lens: the subject's ideal focal length may not be available, so say how to work with it.
  let primeNote: string | null = null;
  if (lens.focalMin === lens.focalMax) {
    const eq = Math.round(focal * cam.cropFactor);
    const lensLabel = `Your ${focal}mm${cam.cropFactor !== 1 ? ` (≈${eq}mm equivalent)` : ''}`;
    if (input.subject === 'portrait' || input.subject === 'fashion')
      primeNote = `${lensLabel} is wide for faces. Stay at least ${D(1.5)} away and frame head-and-shoulders or wider; closer than that stretches noses and foreheads. Use it for environmental portraits that show the place.`;
    else if (['product', 'food', 'macro'].includes(input.subject))
      primeNote = `${lensLabel} focuses down to ${D(lens.closeFocusM)} (${lens.maxMagnification ?? '?'}×). Get physically close rather than cropping, and keep the camera parallel to flat subjects to avoid wide-angle distortion.`;
    else if (subj.focalFF >= 50)
      primeNote = `This kind of shot usually suits ≈${subj.focalFF}mm equivalent; ${lensLabel.toLowerCase()} shows more of the surroundings. Step closer, or include the context on purpose.`;
    else primeNote = `${lensLabel} is a natural fit here. Frame by moving your feet.`;
    const i = why.findIndex((w) => w.startsWith(`${focal}mm`));
    if (i >= 0) why[i] = primeNote;
  }
  const combo = COMBO_NOTES[`${input.subject}:${input.lighting}`];
  const mistakes = [...subj.mistakes.slice(0, 3), ...light.mistakes.slice(0, 2)];
  if (flash.on && flash.technique === 'direct' && subj.bgDistanceM < 1.5)
    mistakes.push(`With direct flash and the background only ${D(input.bgDistanceM ?? subj.bgDistanceM)} behind, a hard shadow lands right behind the subject.`);
  const creative = [
    ...(combo ? [combo] : []),
    `Aperture: ${style.how.aperture}`,
    `Shutter: ${style.how.shutter}`,
    `Flash: ${style.how.flash}`,
    `Ambient: ${style.how.ambient}`,
    `Colour: ${style.how.colour}`,
    `Shadows: ${style.how.shadows}`,
    style.how.extra,
    `Light direction: ${subj.lightDirection}`,
    `Separation: ${subj.separation}`,
    `Composition: ${primeNote ?? subj.composition}`,
  ];

  // Background separation from flash falloff
  if (flash.on && flash.technique !== 'bounce') {
    const bgD = input.bgDistanceM ?? subj.bgDistanceM;
    const fall = -2 * log2((flash.distance!.value + bgD) / flash.distance!.value);
    creative.unshift(
      `Background ${D(bgD)} behind the subject gets ${Math.abs(fall).toFixed(1)} stops less flash (inverse-square law), plus ${fmtStops(exposure.backgroundStops)} of ambient.`,
    );
  }

  if (decision && flash.on && flash.maxDistanceM !== null && flash.maxDistanceM < subj.distanceM * 0.75)
    decision += ` Note: at ${N_} the flash only reaches about ${D(flash.maxDistanceM)} for this, so a reflector or turning your subject may be easier.`;

  const filmSuggestions = cam.medium === 'film' ? suggestFilms(input) : [];

  const rec: Recommendation = {
    title,
    cameraName: cam.name,
    lensName: lens.name,
    medium: cam.medium,
    film,
    needsFilm,
    iso: { value: isoUsed, display: cam.medium === 'film' ? isoLabel : `ISO ${isoUsed}${isoAuto ? ' (auto)' : ''}`, provenance: isoProv },
    aperture: {
      value: N,
      display: N_,
      provenance: isFiniteNumber(input.aperture) ? 'user' : 'calculated',
      note: N <= maxAp.value + 0.01 ? `Wide open at ${focal}mm` : undefined,
    },
    shutter: { value: t, display: T_, provenance: isFiniteNumber(input.shutter) ? 'user' : 'calculated', note: shutterNote },
    focal: {
      value: focal,
      display: `${focal}mm`,
      provenance: focalProv,
      note: cam.cropFactor !== 1 ? `≈${Math.round(focal * cam.cropFactor)}mm equivalent` : undefined,
    },
    focus,
    flash,
    exposure,
    instruction,
    decision,
    warnings: dedupeWarnings(warnings),
    assumptions,
    why,
    technique: technique_,
    example,
    mistakes,
    creative,
    filmNotes,
    calc,
    filmSuggestions,
    copyText: '',
    bulb,
  };
  // Prose from the data files uses metres; rewrite distances for the chosen units.
  if (units === 'ft') {
    const L = (s: string) => localizeText(s, units);
    rec.instruction = L(rec.instruction);
    rec.decision = rec.decision ? L(rec.decision) : null;
    rec.warnings = rec.warnings.map((w) => ({ ...w, text: L(w.text) }));
    rec.assumptions = rec.assumptions.map(L);
    rec.why = rec.why.map(L);
    rec.technique = rec.technique.map(L);
    rec.example = rec.example.map(L);
    rec.mistakes = rec.mistakes.map(L);
    rec.creative = rec.creative.map(L);
    rec.filmNotes = rec.filmNotes.map(L);
    rec.focus.method = L(rec.focus.method);
    rec.focus.zone = L(rec.focus.zone);
  }
  rec.copyText = buildCopyText(rec, units);
  return rec;
}

// ---------------------------------------------------------------------------
// Builders
// ---------------------------------------------------------------------------

function dedupeWarnings(ws: Warning[]): Warning[] {
  const seen = new Set<string>();
  const order: Record<WarningLevel, number> = { critical: 0, caution: 1, info: 2 };
  return ws.filter((w) => (seen.has(w.text) ? false : (seen.add(w.text), true))).sort((a, b) => order[a.level] - order[b.level]);
}

function buildExposure(
  subjectEv: number,
  bgEv: number,
  aS: number,
  bS: number,
  total: number,
  ambientShare: number,
  bias: number,
  role: 'key' | 'fill' | null,
): ExposurePlan {
  const describe = (s: number) =>
    Math.abs(s) < 0.35 ? 'correctly exposed' : s > 0 ? `${s.toFixed(1)} stops brighter than "correct"` : `${Math.abs(s).toFixed(1)} stops darker than "correct"`;
  const bgLook =
    bS < -3.5 ? 'near-black' : bS < -2 ? 'dark, low detail' : bS < -0.7 ? 'darker than the subject, still visible' : bS < 0.7 ? 'about as bright as it looks' : 'brighter than normal';
  const subjectLine =
    role === 'key'
      ? `Subject: lit mainly by flash (${Math.round((1 - ambientShare) * 100)}% flash), ${describe(total)}.`
      : role === 'fill'
        ? `Subject: ambient light with flash fill (${Math.round((1 - ambientShare) * 100)}% flash), ${describe(total)}.`
        : `Subject: ${describe(total)} by ambient light.`;
  const backgroundLine = `Background: ${describe(bS)} → ${bgLook}.`;
  const expected =
    role === 'key'
      ? bS < -2.5
        ? 'A bright, crisp subject against a dark background: the classic direct-flash look.'
        : 'A flash-lit subject with the surroundings still visible; colour of the ambient light shows in the background.'
      : role === 'fill'
        ? 'A natural-looking frame where flash just opens the shadows.'
        : Math.abs(total) < 0.5
          ? 'A normally exposed natural-light frame.'
          : total < 0
            ? 'An underexposed frame. See warnings.'
            : 'A deliberately bright frame.';
  return {
    subjectEv,
    backgroundEv: bgEv,
    ambientSubjectStops: aS,
    backgroundStops: bS,
    totalSubjectStops: total,
    ambientShareOfSubject: ambientShare,
    biasStops: bias,
    expected,
    subjectLine,
    backgroundLine,
  };
}

function buildInstruction(o: {
  flash: FlashPlan;
  N_: string;
  T_: string;
  distanceDisplay: string;
  subj: string;
  cam: CameraId;
  bulb: boolean;
  tripod: boolean;
  focusDisplay: string;
}): string {
  const { flash } = o;
  if (!flash.on) {
    if (o.bulb) return `Tripod and cable release: set ${o.N_}, open the shutter on B for the time shown, focus at ${o.focusDisplay}.`;
    if (o.tripod) return `Put the camera on a tripod, set ${o.N_} at ${o.T_}, focus at ${o.focusDisplay}, and release gently.`;
    return `Set ${o.N_} at ${o.T_}, focus at ${o.focusDisplay}, and position yourself so the light falls on your subject from the side.`;
  }
  const power = flash.ttlFec !== undefined ? `TTL with FEC ${flash.ttlFec}` : `manual ${flash.power!.label}`;
  const sync = o.cam === 'ae1p' ? ' Keep the shutter at 1/60 or slower.' : '';
  switch (flash.technique) {
    case 'bounce':
      return `Stand ${o.distanceDisplay} from your ${o.subj}, tilt the flash head up ≈${flash.tiltDeg ?? 45}° to the ceiling, set ${power}.${sync}`;
    case 'offcamera':
      return `Place the flash ${flash.distance!.display} from your ${o.subj}, ${DIRECTION_LABEL[flash.direction].toLowerCase()}, set ${power}.${sync}`;
    default:
      return `Stand ${flash.distance!.display} from your ${o.subj}, point the flash straight at them, set ${power}.${sync}`;
  }
}

function buildWhy(o: {
  input: ShotInput;
  N: number;
  t: number;
  iso: number;
  flash: FlashPlan;
  exposure: ExposurePlan;
  cam: CameraId;
  style: string;
  focal: number;
  crop: number;
  lensMax: number;
}): string[] {
  const subj = SUBJECTS[o.input.subject];
  const light = LIGHTING[o.input.lighting];
  const out: string[] = [];
  out.push(`${fmtAperture(o.N)}: ${subj.dofIntent}${o.N <= o.lensMax + 0.01 ? ' The lens is wide open here.' : ''}`);
  if (o.flash.on) {
    out.push(
      `${fmtShutter(o.t)}: with normal sync the flash pulse is far shorter than the shutter, so shutter speed only changes the ambient part, here the background at ${fmtStops(o.exposure.backgroundStops)}.`,
    );
    out.push(
      o.flash.role === 'key'
        ? `Flash is the main light because ambient on the subject is ${fmtStops(o.exposure.ambientSubjectStops)}. Power is set by aperture, ISO and distance only.`
        : `Flash is fill because ambient already exposes the subject (${fmtStops(o.exposure.ambientSubjectStops)}); the ${o.style} look sets the fill level.`,
    );
    if (o.flash.technique === 'bounce') out.push('Bouncing turns the ceiling into a large light source: softer shadows, but much more power needed.');
    if (o.flash.technique === 'offcamera') out.push('Off-camera light from an angle gives shape and texture that on-camera flash cannot.');
  } else {
    out.push(`${fmtShutter(o.t)}: matches the scene brightness (${light.label}, ≈EV ${o.exposure.subjectEv}) at ${fmtAperture(o.N)} and ISO ${o.iso}.`);
  }
  out.push(`${o.focal}mm${o.crop !== 1 ? ` (≈${Math.round(o.focal * o.crop)}mm equivalent)` : ''}: ${subj.composition}`);
  out.push(light.meaning);
  return out;
}

function buildTechnique(flash: FlashPlan, input: ShotInput, D: (m: number) => string, cam: CameraId): string[] {
  const subj = SUBJECTS[input.subject];
  if (!flash.on) return [subj.lightDirection, subj.separation, 'Meter from a mid-tone (grass, jeans, skin in shade). Avoid metering the sky or bright windows.'];
  const out: string[] = [];
  if (flash.technique === 'direct') {
    out.push(`Keep the iT32 on the camera, head level and pointed at the subject (${flash.angle}).`);
    out.push(`Work at ${flash.distance!.display}. Every time the distance doubles, add 2 stops of power (e.g. 1/16 → 1/4).`);
  }
  if (flash.technique === 'bounce') {
    out.push(`${flash.angle}. Aim for the ceiling about halfway between you and the subject.`);
    out.push(`The light path is ≈${D(flash.pathM ?? 0)}. If the ceiling is not white, switch to direct.`);
    out.push('Check that no direct light spills onto the subject; that gives a double shadow.');
  }
  if (flash.technique === 'offcamera') {
    out.push(`Put the flash on a stand or have someone hold it ${flash.distance!.display} from the subject, ${DIRECTION_LABEL[flash.direction].toLowerCase()}.`);
    out.push('Aim the centre of the beam at the face (or product), then feather it slightly forward for a smoother falloff.');
    out.push(
      cam === 'ae1p'
        ? 'Distance here is flash-to-subject. Your camera position does not change flash exposure.'
        : 'Distance is flash-to-subject. With TTL the camera measures it; with Manual use the power shown.',
    );
  }
  if (flash.role === 'fill') out.push('As fill, the flash should be barely noticeable. If you see a hard shadow, reduce power one step.');
  out.push(subj.separation);
  return out;
}

function buildExample(o: {
  cam: CameraId;
  film: FilmStock | null;
  iso: number;
  N_: string;
  T_: string;
  focal: number;
  flash: FlashPlan;
  focus: string;
  bulb: boolean;
  tripod: boolean;
  subject: string;
}): string[] {
  const s: string[] = [];
  if (o.cam === 'ae1p') {
    s.push(`Load ${o.film ? o.film.name : 'your film'} and set the film-speed (ASA) dial to ${o.iso}.`);
    s.push(`Turn the aperture ring off "A" to ${o.N_} (Manual mode).`);
    s.push(`Set the shutter dial to ${o.bulb ? 'B and use a cable release' : o.T_}.`);
    s.push(`Zoom to ${o.focal}mm.`);
  } else {
    s.push(`Set the X-T5 to M (or A with ${o.N_}). Mechanical shutter (MS)${o.flash.on ? ' — required for flash' : ''}.`);
    s.push(`Aperture ${o.N_}, shutter ${o.T_}, ISO ${o.iso}.`);
    s.push(`Zoom to ${o.focal}mm (≈${Math.round(o.focal * 1.5)}mm equivalent).`);
  }
  if (o.flash.on) {
    if (o.flash.ttlFec !== undefined) s.push(`iT32 with X5-F module: TTL, flash compensation ${o.flash.ttlFec}. Manual backup: ${o.flash.power!.label}.`);
    else s.push(`iT32: Manual mode, power ${o.flash.power!.label}${o.flash.power!.label !== o.flash.power!.fullStopLabel ? ` (nearest full stop ${o.flash.power!.fullStopLabel})` : ''}.`);
    if (o.flash.technique === 'bounce') s.push(`Tilt the head ≈${o.flash.tiltDeg ?? 45}° toward the ceiling.`);
    if (o.flash.technique === 'offcamera') s.push(`Place the flash ${o.flash.distance!.display} from the ${o.subject}, ${DIRECTION_LABEL[o.flash.direction].toLowerCase()}.`);
    s.push(`Stand ${o.flash.technique === 'offcamera' ? 'where the framing works' : o.flash.distance!.display + ' away'} and focus at ${o.focus}.`);
    s.push('Take the frame. Then take one more at one power step up and one down; that bracket covers flash and GN uncertainty.');
  } else {
    if (o.tripod) s.push('Mount on a tripod and use a cable release or the self-timer.');
    s.push(`Focus at ${o.focus}.`);
    s.push(o.cam === 'ae1p' ? 'Check the viewfinder: in Manual the camera shows the aperture it would choose. Compare it to yours.' : 'Check the histogram after the first frame.');
  }
  return s;
}

function buildCopyText(r: Recommendation, units: Units): string {
  const lines = [
    `${r.title} — ${r.cameraName}`,
    `Aperture: ${r.aperture.display}   Shutter: ${r.shutter.display}   ${r.medium === 'film' ? 'Film' : 'ISO'}: ${r.iso.display}`,
    `Focal: ${r.focal.display}${r.focal.note ? ` (${r.focal.note})` : ''}   Focus: ${r.focus.display}`,
    r.flash.on
      ? `Flash: ${r.flash.techniqueLabel}, ${r.flash.mode}, ${r.flash.powerDisplay}${r.flash.ttlFec ? ` (manual ${r.flash.power!.label})` : ''}, ${r.flash.distance!.display}${
          r.flash.tiltDeg ? `, tilt ${r.flash.tiltDeg}°` : ''
        }, GN ${fmtGnShort(r.flash.gnRefM, units)} @ISO100 (${r.flash.gnSource})`
      : 'Flash: off',
    `Do this: ${r.instruction}`,
    ...r.warnings.filter((w) => w.level === 'critical').map((w) => `! ${w.text}`),
  ];
  void units;
  return lines.join('\n');
}
