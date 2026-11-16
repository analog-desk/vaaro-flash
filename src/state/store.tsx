import { createContext, useContext, useEffect, useMemo, useReducer, type ReactNode } from 'react';
import type { GnSource } from '../data/flash';
import type {
  BounceSurface,
  CameraId,
  FlashChoice,
  FlashDirection,
  LightingId,
  Modifier,
  StyleId,
  SubjectId,
  Units,
} from '../data/types';
import { FILM_BY_ID } from '../data/films';
import { recommend, type Recommendation, type ShotInput } from '../lib/recommend';
import { CAMERAS } from '../data/cameras';

export type Tab = 'shoot' | 'films' | 'flash' | 'learn';
export type Step = 'subject' | 'lighting' | 'flash' | 'film' | 'result';

/** Advanced overrides. Undefined means "let the app decide". */
export interface Overrides {
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
  ei?: number;
  digitalIso?: number;
  useTtl?: boolean;
}

export interface AppState {
  tab: Tab;
  step: Step;
  camera: CameraId;
  lensId: Record<CameraId, string>;
  units: Units;
  advanced: boolean;
  subject?: SubjectId;
  lighting?: LightingId;
  flash?: FlashChoice;
  style: StyleId;
  filmId?: string;
  customIso?: number;
  overrides: Overrides;
  gnSource: GnSource;
  customGnM?: number;
  favorites: string[];
  recentFilms: string[];
  compare: string[];
}

const SESSION_KEY = 'ffa.session.v2';
const LOCAL_KEY = 'ffa.local.v1';

const initial: AppState = {
  tab: 'shoot',
  step: 'subject',
  camera: 'ae1p',
  lensId: { ae1p: CAMERAS.ae1p.lenses[0]!.id, xt5: CAMERAS.xt5.lenses[0]!.id },
  units: 'ft',
  advanced: false,
  style: 'natural',
  overrides: {},
  gnSource: 'rated',
  favorites: [],
  recentFilms: [],
  compare: [],
};

function safeRead<T>(storage: () => Storage, key: string): Partial<T> {
  try {
    const raw = storage().getItem(key);
    return raw ? (JSON.parse(raw) as Partial<T>) : {};
  } catch {
    return {};
  }
}
function safeWrite(storage: () => Storage, key: string, value: unknown) {
  try {
    storage().setItem(key, JSON.stringify(value));
  } catch {
    /* storage unavailable: run without persistence */
  }
}

function load(): AppState {
  const s = safeRead<AppState>(() => sessionStorage, SESSION_KEY);
  const l = safeRead<AppState>(() => localStorage, LOCAL_KEY);
  const merged: AppState = { ...initial, ...s, ...l, overrides: { ...(s.overrides ?? {}) } };
  // Validate stored values so a stale or corrupted entry can never produce an impossible state.
  if (!(merged.camera in CAMERAS)) merged.camera = 'ae1p';
  for (const id of Object.keys(CAMERAS) as CameraId[])
    if (!CAMERAS[id].lenses.some((l) => l.id === merged.lensId?.[id])) merged.lensId = { ...initial.lensId, ...merged.lensId, [id]: CAMERAS[id].lenses[0]!.id };
  if (merged.filmId && !FILM_BY_ID[merged.filmId]) merged.filmId = undefined;
  merged.favorites = (merged.favorites ?? []).filter((id) => FILM_BY_ID[id]);
  merged.recentFilms = (merged.recentFilms ?? []).filter((id) => FILM_BY_ID[id]);
  merged.compare = (merged.compare ?? []).filter((id) => FILM_BY_ID[id]).slice(0, 3);
  if (merged.customGnM !== undefined && !(merged.customGnM > 0 && merged.customGnM < 100)) merged.customGnM = undefined;
  // Units are stored as `unitsPref` (feet by default). An older stored `units` value is deliberately ignored,
  // so everyone moves to feet once; switching back to metres with the header button is then remembered.
  const pref = (l as { unitsPref?: unknown }).unitsPref;
  merged.units = pref === 'm' || pref === 'ft' ? pref : 'ft';
  return merged;
}

export type Action =
  | { type: 'tab'; tab: Tab }
  | { type: 'step'; step: Step }
  | { type: 'camera'; camera: CameraId }
  | { type: 'lens'; camera: CameraId; lensId: string }
  | { type: 'units'; units: Units }
  | { type: 'advanced'; on: boolean }
  | { type: 'subject'; subject: SubjectId; advance?: boolean }
  | { type: 'lighting'; lighting: LightingId; advance?: boolean }
  | { type: 'flash'; flash: FlashChoice; advance?: boolean }
  | { type: 'style'; style: StyleId }
  | { type: 'film'; filmId?: string; customIso?: number; advance?: boolean }
  | { type: 'override'; patch: Partial<Overrides> }
  | { type: 'clearOverrides' }
  | { type: 'gn'; source: GnSource; customGnM?: number }
  | { type: 'favorite'; filmId: string }
  | { type: 'compare'; filmId: string }
  | { type: 'clearCompare' }
  | { type: 'reset' }
  | { type: 'back' };

function needsFilmStep(s: AppState) {
  return CAMERAS[s.camera].medium === 'film' && !s.filmId && s.customIso === undefined;
}

function nextAfter(step: Step, s: AppState): Step {
  if (step === 'subject') return s.lighting ? (s.flash ? (needsFilmStep(s) ? 'film' : 'result') : 'flash') : 'lighting';
  if (step === 'lighting') return s.flash ? (needsFilmStep(s) ? 'film' : 'result') : 'flash';
  if (step === 'flash') return needsFilmStep(s) ? 'film' : 'result';
  return 'result';
}

function reducer(s: AppState, a: Action): AppState {
  switch (a.type) {
    case 'tab':
      return { ...s, tab: a.tab };
    case 'step':
      return { ...s, step: a.step, tab: 'shoot' };
    case 'camera': {
      const clearDigital = a.camera === 'ae1p' ? { digitalIso: undefined, useTtl: undefined } : { ei: undefined };
      return { ...s, camera: a.camera, overrides: { ...s.overrides, ...clearDigital, focal: undefined, aperture: undefined, shutter: undefined } };
    }
    case 'lens':
      return { ...s, lensId: { ...s.lensId, [a.camera]: a.lensId }, overrides: { ...s.overrides, focal: undefined, aperture: undefined } };
    case 'units':
      return { ...s, units: a.units };
    case 'advanced':
      return { ...s, advanced: a.on };
    case 'subject': {
      const n = { ...s, subject: a.subject, overrides: { ...s.overrides, focal: undefined, aperture: undefined, distanceM: undefined, bgDistanceM: undefined } };
      return a.advance ? { ...n, step: nextAfter('subject', n) } : n;
    }
    case 'lighting': {
      const n = { ...s, lighting: a.lighting, overrides: { ...s.overrides, subjectEv: undefined, backgroundEv: undefined, shutter: undefined } };
      return a.advance ? { ...n, step: nextAfter('lighting', n) } : n;
    }
    case 'flash': {
      const n = { ...s, flash: a.flash, overrides: { ...s.overrides, powerStops: undefined } };
      return a.advance ? { ...n, step: nextAfter('flash', n) } : n;
    }
    case 'style':
      return { ...s, style: a.style };
    case 'film': {
      const recent = a.filmId ? [a.filmId, ...s.recentFilms.filter((x) => x !== a.filmId)].slice(0, 6) : s.recentFilms;
      const n: AppState = { ...s, filmId: a.filmId, customIso: a.filmId ? undefined : a.customIso, recentFilms: recent, overrides: { ...s.overrides, ei: undefined } };
      return a.advance ? { ...n, step: 'result', tab: 'shoot' } : n;
    }
    case 'override':
      return { ...s, overrides: { ...s.overrides, ...a.patch } };
    case 'clearOverrides':
      return { ...s, overrides: {} };
    case 'gn':
      return { ...s, gnSource: a.source, customGnM: a.customGnM ?? s.customGnM };
    case 'favorite':
      return { ...s, favorites: s.favorites.includes(a.filmId) ? s.favorites.filter((x) => x !== a.filmId) : [...s.favorites, a.filmId] };
    case 'compare':
      return {
        ...s,
        compare: s.compare.includes(a.filmId) ? s.compare.filter((x) => x !== a.filmId) : [...s.compare, a.filmId].slice(-3),
      };
    case 'clearCompare':
      return { ...s, compare: [] };
    case 'reset':
      // Keep camera, film, units, favourites and GN calibration; clear the shot.
      return { ...s, step: 'subject', tab: 'shoot', subject: undefined, lighting: undefined, flash: undefined, style: 'natural', overrides: {} };
    case 'back': {
      const order: Step[] = ['subject', 'lighting', 'flash', 'film', 'result'];
      if (s.step === 'result') return { ...s, step: needsFilmStep(s) ? 'film' : 'flash' };
      const i = order.indexOf(s.step);
      return { ...s, step: order[Math.max(0, i - 1)]! };
    }
  }
}

interface Ctx {
  state: AppState;
  dispatch: (a: Action) => void;
  rec: Recommendation | null;
  input: ShotInput | null;
}

const StoreCtx = createContext<Ctx | null>(null);

export function buildInput(s: AppState): ShotInput | null {
  if (!s.subject || !s.lighting || !s.flash) return null;
  const o = s.overrides;
  return {
    camera: s.camera,
    lensId: s.lensId[s.camera],
    subject: s.subject,
    lighting: s.lighting,
    flash: s.flash,
    style: s.style,
    units: s.units,
    filmId: CAMERAS[s.camera].medium === 'film' ? s.filmId : undefined,
    customIso: CAMERAS[s.camera].medium === 'film' ? s.customIso : undefined,
    ei: o.ei,
    digitalIso: o.digitalIso,
    focal: o.focal,
    aperture: o.aperture,
    shutter: o.shutter,
    powerStops: o.powerStops,
    distanceM: o.distanceM,
    role: o.role,
    modifier: o.modifier,
    direction: o.direction,
    bounceSurface: o.bounceSurface,
    ceilingM: o.ceilingM,
    wallM: o.wallM,
    bgDistanceM: o.bgDistanceM,
    tripod: o.tripod,
    subjectEv: o.subjectEv,
    backgroundEv: o.backgroundEv,
    gnSource: s.gnSource,
    customGnM: s.customGnM,
    useTtl: o.useTtl,
  };
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, load);

  useEffect(() => {
    const { favorites, recentFilms, gnSource, customGnM, units, compare, ...session } = state;
    safeWrite(() => sessionStorage, SESSION_KEY, session);
    safeWrite(() => localStorage, LOCAL_KEY, { favorites, recentFilms, gnSource, customGnM, unitsPref: units, compare, filmId: state.filmId, customIso: state.customIso });
  }, [state]);

  const input = useMemo(() => buildInput(state), [state]);
  const rec = useMemo(() => (input ? recommend(input) : null), [input]);
  const value = useMemo(() => ({ state, dispatch, rec, input }), [state, rec, input]);
  return <StoreCtx.Provider value={value}>{children}</StoreCtx.Provider>;
}

export function useStore() {
  const c = useContext(StoreCtx);
  if (!c) throw new Error('useStore outside provider');
  return c;
}
