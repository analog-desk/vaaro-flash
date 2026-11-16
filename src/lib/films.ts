// Film catalogue search, filtering and derived education text. UI-free.
import { CATEGORY_LABEL, FILMS, isAe1Compatible, STATUS_LABEL, type Availability, type FilmStock, type UseTag } from '../data/films';
import { MANUFACTURERS, type ManufacturerId } from '../data/manufacturers';

export type QuickFilter = 'everyday' | 'portrait' | 'night' | 'flash' | 'landscape' | 'fine' | 'contrast' | 'bw' | 'experimental';

export const QUICK_FILTERS: { id: QuickFilter; label: string }[] = [
  { id: 'everyday', label: 'Everyday' },
  { id: 'portrait', label: 'Portrait' },
  { id: 'night', label: 'Night' },
  { id: 'flash', label: 'Flash' },
  { id: 'landscape', label: 'Landscape' },
  { id: 'fine', label: 'Fine grain' },
  { id: 'contrast', label: 'High contrast' },
  { id: 'bw', label: 'Black & white' },
  { id: 'experimental', label: 'Experimental' },
];

export interface FilmFilters {
  query: string;
  quick: QuickFilter[];
  makers: ManufacturerId[];
  isoMin?: number;
  isoMax?: number;
  colour?: 'color' | 'bw';
  polarity?: 'negative' | 'positive';
  use?: UseTag;
  only135: boolean;
  availability: Availability[];
  favoritesOnly: boolean;
}

export const DEFAULT_FILTERS: FilmFilters = {
  query: '',
  quick: [],
  makers: [],
  only135: true,
  availability: [],
  favoritesOnly: false,
};

function matchesQuick(f: FilmStock, q: QuickFilter): boolean {
  switch (q) {
    case 'everyday':
      return f.uses.includes('everyday') || f.uses.includes('travel');
    case 'portrait':
      return f.uses.includes('portrait');
    case 'night':
      return f.uses.includes('night') || f.iso >= 800 || f.balance === 'tungsten';
    case 'flash':
      return f.flash === 'excellent' || f.uses.includes('flash');
    case 'landscape':
      return f.uses.includes('landscape');
    case 'fine':
      return ['extremely fine', 'very fine', 'fine'].includes(f.grain);
    case 'contrast':
      return f.contrast === 'high' || f.contrast === 'very high';
    case 'bw':
      return f.colour === 'bw';
    case 'experimental':
      return f.category === 'creative' || f.category === 'infrared' || f.uses.includes('experimental');
  }
}

/** Precomputed lowercase search text so typing stays fast. */
const SEARCH_INDEX = new Map(
  FILMS.map((f) => [
    f.id,
    `${MANUFACTURERS[f.maker].name} ${f.name} ${f.iso} ${CATEGORY_LABEL[f.category]} ${f.process} ${f.basedOn?.emulsion ?? ''}`.toLowerCase(),
  ]),
);

export function filterFilms(filters: FilmFilters, favorites: string[]): FilmStock[] {
  const terms = filters.query.toLowerCase().split(/\s+/).filter(Boolean);
  return FILMS.filter((f) => {
    if (filters.only135 && !isAe1Compatible(f)) return false;
    if (filters.favoritesOnly && !favorites.includes(f.id)) return false;
    if (filters.makers.length && !filters.makers.includes(f.maker)) return false;
    if (filters.isoMin !== undefined && f.iso < filters.isoMin) return false;
    if (filters.isoMax !== undefined && f.iso > filters.isoMax) return false;
    if (filters.colour && f.colour !== filters.colour) return false;
    if (filters.polarity && f.polarity !== filters.polarity) return false;
    if (filters.use && !f.uses.includes(filters.use)) return false;
    if (filters.availability.length && !filters.availability.includes(f.status)) return false;
    for (const q of filters.quick) if (!matchesQuick(f, q)) return false;
    if (terms.length) {
      const text = SEARCH_INDEX.get(f.id)!;
      for (const t of terms) if (!text.includes(t)) return false;
    }
    return true;
  }).sort((a, b) => statusRank(a.status) - statusRank(b.status) || MANUFACTURERS[a.maker].name.localeCompare(MANUFACTURERS[b.maker].name) || a.iso - b.iso);
}

function statusRank(s: Availability) {
  return { current: 0, limited: 1, unverified: 2, discontinued: 3, historical: 4 }[s];
}

/** "Kodak Portra 400", but "CineStill 800T" rather than "CineStill CineStill 800T". */
export function filmTitle(f: FilmStock) {
  const name = f.name.toLowerCase();
  const makerWords = MANUFACTURERS[f.maker].name.toLowerCase().split(/[\s/()!]+/).filter((w) => w.length > 2);
  return makerWords.some((w) => name.includes(w)) ? f.name : `${MANUFACTURERS[f.maker].name} ${f.name}`;
}

export function typeLine(f: FilmStock) {
  return `${CATEGORY_LABEL[f.category]} · ${f.process}`;
}

export function statusLabel(f: FilmStock) {
  return STATUS_LABEL[f.status] + (f.discontinued ? ` (${f.discontinued})` : '');
}

/** Education text derived from the stock's documented properties. */
export function filmEducation(f: FilmStock): { label: string; text: string }[] {
  const out: { label: string; text: string }[] = [];
  const negColour = f.colour === 'color' && f.polarity === 'negative';
  out.push({ label: 'Character', text: f.character || 'Not documented in this catalogue.' });
  if (f.colour === 'color')
    out.push({
      label: 'Colour rendering',
      text:
        f.saturation === 'undocumented'
          ? 'Not documented. Shoot a test roll.'
          : `${cap(f.saturation)} saturation, ${f.balance === 'tungsten' ? 'balanced for tungsten light (3200 K). Daylight and flash render blue' : 'balanced for daylight and flash'}.`,
    });
  out.push({ label: 'Grain', text: f.grain === 'undocumented' ? 'Not documented.' : `${cap(f.grain)} grain for ISO ${f.iso}.` });
  out.push({ label: 'Contrast', text: f.contrast === 'undocumented' ? 'Not documented.' : `${cap(f.contrast)} contrast.` });
  out.push({
    label: 'Highlights',
    text:
      f.polarity === 'positive'
        ? 'Slide film clips highlights abruptly. Meter for the brightest important area.'
        : f.polarity === 'instant'
          ? 'Instant film has little highlight range; avoid harsh light.'
          : negColour
            ? 'Colour negative holds a lot of overexposure before highlights block up; generous exposure usually looks good.'
            : 'B&W negative holds highlights well; development controls how dense they get.',
  });
  out.push({
    label: 'Shadows',
    text:
      f.polarity === 'positive'
        ? 'Underexposed slides go dark but keep saturation. Blocked shadows cannot be lifted much.'
        : negColour
          ? 'Underexposure is the main risk: shadows turn grainy and muddy, with colour shifts.'
          : 'Expose for the shadows. Detail that is not on the negative cannot be printed.',
  });
  out.push({
    label: 'Latitude',
    text:
      f.latitude === 'undocumented'
        ? 'Not documented. Bracket until you know it.'
        : `${cap(f.latitude)} (qualitative). ${f.latitude === 'wide' ? 'Forgiving of exposure mistakes, more so on the over side.' : f.latitude === 'narrow' ? 'Meter carefully; small errors show.' : 'Reasonably forgiving.'}`,
  });
  out.push({
    label: 'Flash',
    text: {
      excellent: 'Excellent with flash: wide latitude covers flash-distance errors.',
      good: 'Works well with flash.',
      fair: 'Usable with flash, but colour balance or latitude makes it less forgiving.',
      poor: 'Not a good match for flash.',
      'n/a': 'Flash is not the point of this film.',
    }[f.flash],
  });
  out.push({ label: 'Uses', text: f.uses.length ? f.uses.join(', ') : 'General.' });
  out.push({
    label: 'Processing',
    text:
      {
        'C-41': 'C-41: the standard colour negative process at any lab.',
        'E-6': 'E-6: slide process; fewer labs offer it.',
        'B&W': 'Traditional B&W development (home or lab).',
        'B&W reversal': 'B&W reversal process; few labs offer it.',
        'ECN-2': 'ECN-2 motion-picture process; the rem-jet backing must be removed. Only some labs offer it.',
        'K-14': 'K-14 (Kodachrome). No longer available in colour.',
        'Instant (integral)': 'Develops itself in the camera.',
        'Instant (peel-apart)': 'Peel-apart instant; develops in the pack.',
      }[f.process] + (f.push ? ` ${f.push}` : ''),
  });
  if (f.basedOn) out.push({ label: 'Emulsion', text: `${f.basedOn.confidence === 'confirmed' ? 'Confirmed' : 'Widely reported'}: ${f.basedOn.emulsion}.` });
  if (f.orthochromatic) out.push({ label: 'Spectral', text: 'Orthochromatic: not sensitive to red light.' });
  if (f.extendedRed) out.push({ label: 'Spectral', text: 'Extended red sensitivity: responds to deep-red filters for darker skies or IR-like effects.' });
  return out;
}

function cap(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
