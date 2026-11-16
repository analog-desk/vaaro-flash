import type { ManufacturerId } from './manufacturers';

// ---------------------------------------------------------------------------
// Film-stock catalogue
//
// Data-driven: add a stock by adding one entry below; the library, picker, filters and recommendation engine all
// read from this array. Qualitative fields (grain, contrast, saturation, latitude) follow the manufacturer's own
// description where one exists; otherwise they are marked 'undocumented'.
// Availability is a snapshot as of 2026 and changes often. Treat it as a guide, not a stock check.
// ---------------------------------------------------------------------------

export type FilmCategory =
  | 'color-negative'
  | 'bw-negative'
  | 'color-reversal'
  | 'bw-reversal'
  | 'motion-picture'
  | 'creative'
  | 'infrared'
  | 'instant';

export type Process = 'C-41' | 'E-6' | 'B&W' | 'B&W reversal' | 'ECN-2' | 'K-14' | 'Instant (integral)' | 'Instant (peel-apart)';
export type FilmFormat = '135' | '120' | '220' | 'sheet' | '110' | 'instant';
export type Level4 = 'low' | 'moderate' | 'high' | 'very high' | 'undocumented';
export type Grain = 'extremely fine' | 'very fine' | 'fine' | 'medium' | 'pronounced' | 'heavy' | 'undocumented';
export type Saturation = 'low' | 'natural' | 'high' | 'very high' | 'n/a' | 'undocumented';
export type Latitude = 'wide' | 'moderate' | 'narrow' | 'undocumented';
export type Availability = 'current' | 'limited' | 'discontinued' | 'historical' | 'unverified';
export type UseTag =
  | 'everyday'
  | 'portrait'
  | 'night'
  | 'flash'
  | 'landscape'
  | 'street'
  | 'travel'
  | 'studio'
  | 'product'
  | 'documentary'
  | 'experimental'
  | 'fine-art';

export type Reciprocity =
  | { kind: 'schwarzschild'; p: number } // Tc = Tm^p for Tm > 1 s (Ilford / Harman published method)
  | { kind: 'table'; points: { t: number; stops: number }[] } // add stops at metered time t
  | { kind: 'none-until'; seconds: number };

export interface FilmStock {
  id: string;
  maker: ManufacturerId;
  name: string;
  /** Box speed (ISO). */
  iso: number;
  /** Optional exposure-index range the maker or seller describes (e.g. multi-speed films). */
  eiRange?: [number, number];
  category: FilmCategory;
  colour: 'color' | 'bw';
  polarity: 'negative' | 'positive' | 'instant';
  process: Process;
  formats: FilmFormat[];
  balance: 'daylight' | 'tungsten' | 'n/a';
  grain: Grain;
  contrast: Level4;
  saturation: Saturation;
  latitude: Latitude;
  uses: UseTag[];
  flash: 'excellent' | 'good' | 'fair' | 'poor' | 'n/a';
  status: Availability;
  discontinued?: string;
  basedOn?: { emulsion: string; confidence: 'confirmed' | 'widely reported' };
  reference: 'manufacturer datasheet' | 'manufacturer / seller listing' | 'community-documented';
  character: string;
  notes?: string[];
  push?: string;
  reciprocity?: Reciprocity;
  orthochromatic?: boolean;
  extendedRed?: boolean;
  remjet?: boolean;
}

type Opt = Partial<Omit<FilmStock, 'id' | 'maker' | 'name' | 'iso' | 'category' | 'process' | 'formats'>>;

function slug(s: string) {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function film(maker: ManufacturerId, name: string, iso: number, category: FilmCategory, process: Process, formats: FilmFormat[], o: Opt): FilmStock {
  const colour = o.colour ?? (category === 'bw-negative' || category === 'bw-reversal' || category === 'infrared' ? 'bw' : 'color');
  const polarity =
    o.polarity ?? (category === 'instant' ? 'instant' : category === 'color-reversal' || category === 'bw-reversal' ? 'positive' : 'negative');
  return {
    id: slug(`${maker}-${name}`),
    maker,
    name,
    iso,
    category,
    process,
    formats,
    colour,
    polarity,
    balance: o.balance ?? (colour === 'bw' ? 'n/a' : 'daylight'),
    grain: o.grain ?? 'undocumented',
    contrast: o.contrast ?? 'undocumented',
    saturation: o.saturation ?? (colour === 'bw' ? 'n/a' : 'undocumented'),
    latitude: o.latitude ?? 'undocumented',
    uses: o.uses ?? [],
    flash: o.flash ?? 'good',
    status: o.status ?? 'current',
    reference: o.reference ?? 'manufacturer datasheet',
    character: o.character ?? '',
    ...o,
  } as FilmStock;
}

const MP_135 = 'Sold by Kodak as motion-picture film; available in 35mm still cassettes through respoolers (e.g. Reflx Lab, Flic Film).';
const REMJET = 'Has a rem-jet anti-halation backing: needs ECN-2 processing (or rem-jet removal). Do not send it to a normal C-41 lab unannounced.';

export const FILMS: FilmStock[] = [
  // ---------------- Kodak ----------------
  film('kodak', 'Gold 200', 200, 'color-negative', 'C-41', ['135', '120'], {
    grain: 'fine', contrast: 'moderate', saturation: 'high', latitude: 'wide', uses: ['everyday', 'travel', 'portrait', 'flash'], flash: 'excellent',
    character: 'Warm, saturated consumer film with a golden cast in sunlight. Forgiving and inexpensive.',
  }),
  film('kodak', 'ColorPlus 200', 200, 'color-negative', 'C-41', ['135'], {
    grain: 'medium', contrast: 'moderate', saturation: 'high', latitude: 'wide', uses: ['everyday', 'travel'], flash: 'good',
    character: 'Budget consumer film: warm, slightly grainier and less refined than Gold 200.',
  }),
  film('kodak', 'UltraMax 400', 400, 'color-negative', 'C-41', ['135'], {
    grain: 'fine', contrast: 'moderate', saturation: 'high', latitude: 'wide', uses: ['everyday', 'street', 'flash', 'night', 'travel'], flash: 'excellent',
    character: 'Saturated, warm, versatile 400. A strong all-round choice for flash snapshots and changing light.',
  }),
  film('kodak', 'Pro Image 100', 100, 'color-negative', 'C-41', ['135'], {
    grain: 'fine', contrast: 'moderate', saturation: 'natural', latitude: 'wide', uses: ['portrait', 'everyday'], status: 'limited',
    character: 'Professional-leaning 100-speed film originally made for hot, humid markets; natural skin tones, slightly warm.',
    notes: ['Distribution is regional; easier to find in some countries than others.'],
  }),
  film('kodak', 'Portra 160', 160, 'color-negative', 'C-41', ['135', '120', 'sheet'], {
    grain: 'very fine', contrast: 'low', saturation: 'natural', latitude: 'wide', uses: ['portrait', 'studio', 'product', 'fine-art'], flash: 'excellent',
    character: 'Fine grain, gentle contrast, accurate skin. Excellent with flash and in studio light.',
    reciprocity: { kind: 'none-until', seconds: 1 },
  }),
  film('kodak', 'Portra 400', 400, 'color-negative', 'C-41', ['135', '120', 'sheet'], {
    grain: 'fine', contrast: 'moderate', saturation: 'natural', latitude: 'wide', uses: ['portrait', 'everyday', 'travel', 'flash', 'street'], flash: 'excellent',
    character: 'Natural skin tones, very wide latitude and fine grain for a 400. Holds highlights well when given generous exposure.',
    push: 'Commonly pushed 1–2 stops by labs; expect more contrast and grain.',
    reciprocity: { kind: 'none-until', seconds: 1 },
  }),
  film('kodak', 'Portra 800', 800, 'color-negative', 'C-41', ['135', '120'], {
    grain: 'medium', contrast: 'moderate', saturation: 'natural', latitude: 'wide', uses: ['portrait', 'night', 'flash', 'street'], flash: 'excellent',
    character: 'Fast portrait film for dim light; warmer and grainier than Portra 400 but still natural.',
    push: 'Kodak documents push processing; often shot at EI 800–1600.',
  }),
  film('kodak', 'Ektar 100', 100, 'color-negative', 'C-41', ['135', '120', 'sheet'], {
    grain: 'extremely fine', contrast: 'high', saturation: 'very high', latitude: 'moderate', uses: ['landscape', 'product', 'travel'], flash: 'good',
    character: 'Kodak markets it as the finest-grain colour negative. Vivid, punchy colour; skin can turn red-pink.',
    notes: ['Less forgiving of underexposure than Portra; meter carefully.'],
    reciprocity: { kind: 'none-until', seconds: 1 },
  }),
  film('kodak', 'Ektachrome E100', 100, 'color-reversal', 'E-6', ['135', '120', 'sheet'], {
    grain: 'very fine', contrast: 'moderate', saturation: 'high', latitude: 'narrow', uses: ['landscape', 'product', 'travel', 'fine-art'], flash: 'good',
    character: 'Clean, neutral-to-cool slide film with very fine grain. Exposure must be within about ±1/3 stop.',
  }),
  film('kodak', 'Tri-X 400', 400, 'bw-negative', 'B&W', ['135', '120'], {
    grain: 'medium', contrast: 'high', latitude: 'wide', uses: ['street', 'documentary', 'portrait', 'night', 'flash'], flash: 'excellent',
    character: 'Classic gritty B&W with strong mid-tone separation. Pushes very well.',
    push: 'Kodak documents push to EI 1600 (and 3200 with less shadow detail).',
    reciprocity: { kind: 'table', points: [{ t: 1, stops: 1 }, { t: 10, stops: 2 }, { t: 100, stops: 3 }] },
    notes: ['In sheet film the equivalent is Tri-X 320 (TXP).'],
  }),
  film('kodak', 'T-Max 100', 100, 'bw-negative', 'B&W', ['135', '120', 'sheet'], {
    grain: 'extremely fine', contrast: 'moderate', latitude: 'moderate', uses: ['landscape', 'product', 'portrait', 'fine-art'], flash: 'good',
    character: 'Tabular-grain B&W with very fine grain and high sharpness. Sensitive to development accuracy.',
    reciprocity: { kind: 'table', points: [{ t: 1, stops: 1 / 3 }, { t: 10, stops: 0.5 }, { t: 100, stops: 1 }] },
  }),
  film('kodak', 'T-Max 400', 400, 'bw-negative', 'B&W', ['135', '120', 'sheet'], {
    grain: 'fine', contrast: 'moderate', latitude: 'wide', uses: ['everyday', 'night', 'street', 'landscape'], flash: 'excellent',
    character: 'Very fine grain for a 400 film; clean tones, pushes well.',
    reciprocity: { kind: 'table', points: [{ t: 1, stops: 1 / 3 }, { t: 10, stops: 0.5 }, { t: 100, stops: 1 }] },
  }),
  film('kodak', 'T-Max P3200', 3200, 'bw-negative', 'B&W', ['135'], {
    eiRange: [800, 6400], grain: 'pronounced', contrast: 'moderate', latitude: 'wide', uses: ['night', 'documentary', 'street'], flash: 'good',
    character: 'Multi-speed B&W. Its base sensitivity is lower than 3200; the "P" means it is designed to be push-processed.',
    push: 'Designed to be exposed at EI 3200 with push development; tell your lab the EI you used.',
  }),
  film('kodak', 'Vision3 50D (5203)', 50, 'motion-picture', 'ECN-2', ['135'], {
    grain: 'extremely fine', contrast: 'low', saturation: 'natural', latitude: 'wide', uses: ['landscape', 'portrait', 'fine-art'], remjet: true, reference: 'manufacturer datasheet',
    character: 'Daylight motion-picture negative with extremely fine grain and very wide dynamic range.',
    notes: [MP_135, REMJET],
  }),
  film('kodak', 'Vision3 250D (5207)', 250, 'motion-picture', 'ECN-2', ['135'], {
    grain: 'fine', contrast: 'low', saturation: 'natural', latitude: 'wide', uses: ['everyday', 'portrait', 'street'], remjet: true,
    character: 'Daylight cine negative with soft, filmic contrast.',
    notes: [MP_135, REMJET],
  }),
  film('kodak', 'Vision3 200T (5213)', 200, 'motion-picture', 'ECN-2', ['135'], {
    balance: 'tungsten', grain: 'fine', contrast: 'low', saturation: 'natural', latitude: 'wide', uses: ['night', 'portrait'], remjet: true,
    character: 'Tungsten-balanced (3200 K) cine negative. In daylight it renders blue unless filtered (85 filter) or corrected.',
    notes: [MP_135, REMJET],
  }),
  film('kodak', 'Vision3 500T (5219)', 500, 'motion-picture', 'ECN-2', ['135'], {
    balance: 'tungsten', grain: 'medium', contrast: 'low', saturation: 'natural', latitude: 'wide', uses: ['night', 'street', 'portrait'], flash: 'fair', remjet: true,
    character: 'Fast tungsten cine negative: the classic night-city film look with warm practicals and teal shadows.',
    notes: [MP_135, REMJET, 'Flash is daylight-coloured: subjects lit by flash render blue-ish on tungsten film unless you gel the flash (CTO).'],
  }),
  film('kodak', 'Eastman Double-X (5222)', 250, 'motion-picture', 'B&W', ['135'], {
    colour: 'bw', balance: 'n/a', saturation: 'n/a', grain: 'medium', contrast: 'high', latitude: 'wide', uses: ['street', 'documentary', 'night'],
    character: 'B&W cine negative used in film production; ISO 250 daylight / 200 tungsten. Classic cinematic grain.',
    notes: ['No rem-jet; develops in normal B&W chemistry.', MP_135],
  }),
  film('kodak', 'Kodachrome 64', 64, 'color-reversal', 'K-14', ['135', '120'], {
    grain: 'very fine', contrast: 'high', saturation: 'high', latitude: 'narrow', uses: ['travel', 'landscape'], status: 'historical', discontinued: '2009',
    character: 'Legendary slide film. K-14 processing ended in 2010, so unexposed rolls can only be developed as B&W negatives.',
  }),
  film('kodak', 'Plus-X 125', 125, 'bw-negative', 'B&W', ['135', '120'], {
    grain: 'fine', contrast: 'moderate', latitude: 'wide', uses: ['everyday', 'portrait'], status: 'discontinued', discontinued: '2011',
    character: 'Classic medium-speed Kodak B&W.',
  }),
  film('kodak', 'BW400CN', 400, 'bw-negative', 'C-41', ['135'], {
    grain: 'fine', contrast: 'moderate', latitude: 'wide', uses: ['everyday'], status: 'discontinued', discontinued: '2014',
    character: 'Chromogenic B&W processed in C-41.',
  }),
  film('kodak', 'Portra 160VC', 160, 'color-negative', 'C-41', ['135', '120', 'sheet'], {
    grain: 'very fine', contrast: 'moderate', saturation: 'high', latitude: 'wide', uses: ['portrait', 'landscape'], status: 'discontinued', discontinued: '2010',
    character: 'Vivid-colour Portra, replaced by the current Portra 160.',
  }),
  film('kodak', 'Ektachrome E100VS', 100, 'color-reversal', 'E-6', ['135', '120', 'sheet'], {
    grain: 'very fine', contrast: 'high', saturation: 'very high', latitude: 'narrow', uses: ['landscape'], status: 'discontinued', discontinued: '2012',
    character: 'Very saturated Ektachrome.',
  }),
  film('kodak', 'Elite Chrome 100', 100, 'color-reversal', 'E-6', ['135'], {
    grain: 'very fine', contrast: 'moderate', saturation: 'high', latitude: 'narrow', uses: ['travel'], status: 'discontinued', discontinued: '2012',
    character: 'Consumer-branded Kodak slide film.',
  }),
  film('kodak', 'High-Speed Infrared (HIE)', 400, 'infrared', 'B&W', ['135'], {
    grain: 'pronounced', contrast: 'high', latitude: 'narrow', uses: ['experimental', 'landscape'], status: 'historical', discontinued: '2007', flash: 'n/a',
    character: 'True infrared B&W with glowing foliage and halation. Had to be loaded in total darkness.',
    notes: ['ISO is nominal; infrared exposure depends on filter and scene.'],
  }),
  film('kodak', 'Aerochrome III (1443)', 400, 'infrared', 'E-6', ['135'], {
    colour: 'color', polarity: 'positive', grain: 'fine', contrast: 'high', saturation: 'very high', latitude: 'narrow', uses: ['experimental'], status: 'historical', discontinued: '2009', flash: 'n/a',
    character: 'Colour infrared aerial film: foliage turns red or magenta. Only expired or hand-rolled stock remains.',
    notes: ['ISO is nominal and depends on filtration (typically a yellow filter).'],
  }),

  // ---------------- Fujifilm ----------------
  film('fujifilm', 'Fujicolor 200', 200, 'color-negative', 'C-41', ['135'], {
    grain: 'fine', contrast: 'moderate', saturation: 'high', latitude: 'wide', uses: ['everyday', 'travel', 'flash'], flash: 'excellent',
    basedOn: { emulsion: 'a Kodak-made emulsion (Fujifilm has not confirmed which)', confidence: 'widely reported' },
    character: 'Current Fujifilm-branded consumer 200 introduced in 2023; renders warmer than the old Fujicolor C200.',
  }),
  film('fujifilm', 'Fujicolor 400', 400, 'color-negative', 'C-41', ['135'], {
    grain: 'fine', contrast: 'moderate', saturation: 'high', latitude: 'wide', uses: ['everyday', 'flash', 'street'], flash: 'excellent', status: 'unverified',
    basedOn: { emulsion: 'a Kodak-made emulsion', confidence: 'widely reported' },
    character: 'Newer Fujifilm-branded 400 consumer film sold in some markets in place of Superia X-TRA 400.',
    notes: ['Name and availability vary by region; check the box.'],
  }),
  film('fujifilm', 'Superia X-TRA 400', 400, 'color-negative', 'C-41', ['135'], {
    grain: 'fine', contrast: 'moderate', saturation: 'high', latitude: 'wide', uses: ['everyday', 'flash', 'street', 'night'], flash: 'excellent', status: 'unverified',
    character: 'Fujifilm-made 400 with cooler, greener rendering than Kodak consumer films and a fourth colour layer for mixed light.',
    notes: ['Reported as being phased out in several markets; buy only from fresh stock.'],
  }),
  film('fujifilm', 'Superia Premium 400', 400, 'color-negative', 'C-41', ['135'], {
    grain: 'fine', contrast: 'moderate', saturation: 'high', latitude: 'wide', uses: ['everyday', 'portrait'], status: 'unverified',
    character: 'Japan-market 400 with smoother skin tones than X-TRA 400.',
  }),
  film('fujifilm', 'Fujicolor C200', 200, 'color-negative', 'C-41', ['135'], {
    grain: 'medium', contrast: 'moderate', saturation: 'natural', latitude: 'wide', uses: ['everyday'], status: 'discontinued', discontinued: 'c. 2021',
    character: 'Cool, green-leaning budget film; distinct from the current Fujicolor 200.',
  }),
  film('fujifilm', 'Pro 400H', 400, 'color-negative', 'C-41', ['135', '120'], {
    grain: 'fine', contrast: 'low', saturation: 'natural', latitude: 'wide', uses: ['portrait'], status: 'discontinued', discontinued: '2021',
    character: 'Pastel, airy wedding film with a fourth colour layer. Discontinued; only expired stock remains.',
  }),
  film('fujifilm', 'Pro 160NS', 160, 'color-negative', 'C-41', ['120', 'sheet'], {
    grain: 'very fine', contrast: 'low', saturation: 'natural', latitude: 'wide', uses: ['portrait', 'studio'], status: 'discontinued', discontinued: 'c. 2021',
    character: 'Soft portrait film; last sold in 120 in Japan.',
  }),
  film('fujifilm', 'Natura 1600', 1600, 'color-negative', 'C-41', ['135'], {
    grain: 'pronounced', contrast: 'moderate', saturation: 'natural', latitude: 'wide', uses: ['night'], status: 'historical', discontinued: '2010',
    character: 'Fast Japan-market film designed for available-light shooting.',
  }),
  film('fujifilm', 'Superia 800', 800, 'color-negative', 'C-41', ['135'], {
    grain: 'medium', contrast: 'moderate', saturation: 'high', latitude: 'wide', uses: ['night', 'flash'], status: 'discontinued', discontinued: 'c. 2016',
    character: 'Fast consumer colour film.',
  }),
  film('fujifilm', 'Superia 1600', 1600, 'color-negative', 'C-41', ['135'], {
    grain: 'pronounced', contrast: 'moderate', saturation: 'high', latitude: 'wide', uses: ['night'], status: 'discontinued', discontinued: 'c. 2016',
    character: 'Fast consumer colour film for low light.',
  }),
  film('fujifilm', 'Velvia 50', 50, 'color-reversal', 'E-6', ['135', '120', 'sheet'], {
    grain: 'extremely fine', contrast: 'high', saturation: 'very high', latitude: 'narrow', uses: ['landscape', 'fine-art'], flash: 'fair',
    character: 'Intensely saturated landscape slide film. Unflattering for skin. Exposure tolerance about ±1/3 stop.',
    notes: ['Fujifilm publishes reciprocity corrections for exposures longer than about 4 s. Check the datasheet for long exposures.'],
  }),
  film('fujifilm', 'Velvia 100', 100, 'color-reversal', 'E-6', ['135', 'sheet'], {
    grain: 'extremely fine', contrast: 'high', saturation: 'very high', latitude: 'narrow', uses: ['landscape', 'travel'], flash: 'fair',
    character: 'Saturated slide film, a stop faster than Velvia 50.',
  }),
  film('fujifilm', 'Provia 100F', 100, 'color-reversal', 'E-6', ['135', '120', 'sheet'], {
    grain: 'extremely fine', contrast: 'moderate', saturation: 'natural', latitude: 'narrow', uses: ['landscape', 'product', 'travel', 'portrait'], flash: 'good',
    character: 'Neutral, accurate slide film; the most versatile E-6 stock. Excellent long-exposure behaviour.',
    reciprocity: { kind: 'none-until', seconds: 128 },
  }),
  film('fujifilm', 'Acros II 100', 100, 'bw-negative', 'B&W', ['135', '120'], {
    grain: 'extremely fine', contrast: 'moderate', latitude: 'moderate', uses: ['landscape', 'fine-art', 'night', 'product'], flash: 'good',
    character: 'Ultra-fine-grain B&W with outstanding long-exposure behaviour.',
    reciprocity: { kind: 'none-until', seconds: 120 },
  }),
  film('fujifilm', 'Neopan 400', 400, 'bw-negative', 'B&W', ['135', '120'], {
    grain: 'fine', contrast: 'moderate', latitude: 'wide', uses: ['street', 'documentary'], status: 'historical', discontinued: '2010',
    character: 'Clean-grained Fujifilm 400 B&W.',
  }),
  film('fujifilm', 'Neopan Acros 100 (original)', 100, 'bw-negative', 'B&W', ['135', '120', 'sheet'], {
    grain: 'extremely fine', contrast: 'moderate', latitude: 'moderate', uses: ['landscape'], status: 'discontinued', discontinued: '2018',
    character: 'The original Acros, replaced by Acros II.',
  }),
  film('fujifilm', 'Astia 100F', 100, 'color-reversal', 'E-6', ['135', '120', 'sheet'], {
    grain: 'extremely fine', contrast: 'low', saturation: 'natural', latitude: 'narrow', uses: ['portrait', 'studio'], status: 'discontinued',
    character: 'Soft-contrast slide film for skin tones.',
  }),
  film('fujifilm', 'Instax Mini', 800, 'instant', 'Instant (integral)', ['instant'], {
    grain: 'fine', contrast: 'moderate', saturation: 'high', latitude: 'narrow', uses: ['everyday'], flash: 'good', reference: 'manufacturer / seller listing',
    character: 'Credit-card-sized instant film for Instax cameras. Not usable in 35mm cameras.',
  }),
  film('fujifilm', 'Instax Wide', 800, 'instant', 'Instant (integral)', ['instant'], {
    grain: 'fine', contrast: 'moderate', saturation: 'high', latitude: 'narrow', uses: ['everyday'], flash: 'good', reference: 'manufacturer / seller listing',
    character: 'Wide-format Instax instant film. Not usable in 35mm cameras.',
  }),
  film('fujifilm', 'FP-100C', 100, 'instant', 'Instant (peel-apart)', ['instant'], {
    grain: 'fine', contrast: 'moderate', saturation: 'high', latitude: 'narrow', uses: ['portrait'], status: 'historical', discontinued: '2016',
    character: 'The last peel-apart colour instant film.',
  }),

  // ---------------- Ilford ----------------
  film('ilford', 'HP5 Plus 400', 400, 'bw-negative', 'B&W', ['135', '120', 'sheet'], {
    grain: 'medium', contrast: 'moderate', latitude: 'wide', uses: ['street', 'documentary', 'everyday', 'night', 'flash'], flash: 'excellent',
    character: 'Versatile, forgiving B&W with moderate contrast. A standard choice for pushing.',
    push: 'Ilford documents push processing to EI 3200.',
    reciprocity: { kind: 'schwarzschild', p: 1.31 },
  }),
  film('ilford', 'FP4 Plus 125', 125, 'bw-negative', 'B&W', ['135', '120', 'sheet'], {
    grain: 'fine', contrast: 'moderate', latitude: 'wide', uses: ['portrait', 'landscape', 'everyday', 'product'], flash: 'good',
    character: 'Classic medium-speed B&W with fine grain and smooth tones.',
    reciprocity: { kind: 'schwarzschild', p: 1.26 },
  }),
  film('ilford', 'Delta 100', 100, 'bw-negative', 'B&W', ['135', '120', 'sheet'], {
    grain: 'very fine', contrast: 'moderate', latitude: 'moderate', uses: ['landscape', 'portrait', 'product', 'fine-art'], flash: 'good',
    character: 'Tabular-grain B&W with very fine grain and high sharpness.',
    reciprocity: { kind: 'schwarzschild', p: 1.26 },
  }),
  film('ilford', 'Delta 400', 400, 'bw-negative', 'B&W', ['135', '120'], {
    grain: 'fine', contrast: 'moderate', latitude: 'wide', uses: ['everyday', 'street', 'portrait'], flash: 'excellent',
    character: 'Finer-grained alternative to HP5 at the same speed.',
    reciprocity: { kind: 'schwarzschild', p: 1.41 },
  }),
  film('ilford', 'Delta 3200', 3200, 'bw-negative', 'B&W', ['135', '120'], {
    eiRange: [400, 6400], grain: 'pronounced', contrast: 'moderate', latitude: 'wide', uses: ['night', 'documentary'], flash: 'good',
    character: 'Very fast B&W for low light. Ilford gives its ISO speed as 1000; EI 3200 relies on extended development.',
    push: 'Tell the lab the EI you used (e.g. 3200) so they develop accordingly.',
    reciprocity: { kind: 'schwarzschild', p: 1.33 },
  }),
  film('ilford', 'Pan F Plus 50', 50, 'bw-negative', 'B&W', ['135', '120'], {
    grain: 'extremely fine', contrast: 'high', latitude: 'narrow', uses: ['landscape', 'fine-art', 'product'], flash: 'good',
    character: 'Slow, extremely fine grain, high sharpness and crisp contrast.',
    reciprocity: { kind: 'schwarzschild', p: 1.33 },
  }),
  film('ilford', 'Ortho Plus 80', 80, 'bw-negative', 'B&W', ['135', '120', 'sheet'], {
    grain: 'fine', contrast: 'high', latitude: 'moderate', uses: ['fine-art', 'landscape', 'experimental'], orthochromatic: true,
    character: 'Orthochromatic: blind to red, so lips and skin blemishes render dark and blue skies light. ISO 80 in daylight, 40 under tungsten.',
  }),
  film('ilford', 'SFX 200', 200, 'infrared', 'B&W', ['135', '120'], {
    grain: 'medium', contrast: 'high', latitude: 'moderate', uses: ['experimental', 'landscape'], extendedRed: true, flash: 'n/a',
    character: 'Extended red sensitivity (to about 740 nm). With a deep red filter it gives a near-infrared look.',
    reciprocity: { kind: 'schwarzschild', p: 1.43 },
    notes: ['Not true infrared film. Exposure through a deep-red filter needs several stops of extra exposure.'],
  }),
  film('ilford', 'XP2 Super 400', 400, 'bw-negative', 'C-41', ['135', '120'], {
    eiRange: [50, 800], grain: 'fine', contrast: 'low', latitude: 'wide', uses: ['everyday', 'portrait', 'street', 'flash'], flash: 'excellent',
    character: 'Chromogenic B&W processed at any C-41 lab. Very forgiving of overexposure; fine grain at EI 200–400.',
    reciprocity: { kind: 'schwarzschild', p: 1.31 },
  }),
  film('ilford', 'Ilford Pan 400', 400, 'bw-negative', 'B&W', ['135'], {
    grain: 'medium', contrast: 'moderate', latitude: 'wide', uses: ['everyday'], status: 'limited',
    character: 'Budget Ilford B&W sold in selected markets.',
  }),

  // ---------------- Harman ----------------
  film('harman', 'Phoenix 200', 200, 'creative', 'C-41', ['135', '120'], {
    grain: 'pronounced', contrast: 'high', saturation: 'high', latitude: 'narrow', uses: ['experimental'], status: 'discontinued', discontinued: '2025',
    character: 'Harman\'s first, experimental colour negative (Dec 2023). High contrast, strong halation, unpredictable colour. Replaced by Phoenix II.',
  }),
  film('harman', 'Phoenix II 200', 200, 'color-negative', 'C-41', ['135', '120'], {
    eiRange: [100, 200], grain: 'fine', contrast: 'moderate', saturation: 'natural', latitude: 'moderate', uses: ['everyday', 'experimental'], flash: 'good',
    character: 'Second-generation Harman colour film (2025): cleaner contrast, more neutral colour and finer grain than Phoenix.',
    notes: ['Harman recommends EI 100–200 and advises against push processing.'],
  }),

  // ---------------- Kentmere ----------------
  film('kentmere', 'Kentmere Pan 100', 100, 'bw-negative', 'B&W', ['135', '120'], {
    grain: 'fine', contrast: 'moderate', latitude: 'moderate', uses: ['everyday', 'landscape'], flash: 'good',
    character: 'Affordable general-purpose B&W made by Harman.',
  }),
  film('kentmere', 'Kentmere Pan 200', 200, 'bw-negative', 'B&W', ['135'], {
    grain: 'fine', contrast: 'moderate', latitude: 'moderate', uses: ['everyday', 'street'],
    character: 'Mid-speed Kentmere B&W added in 2024.',
  }),
  film('kentmere', 'Kentmere Pan 400', 400, 'bw-negative', 'B&W', ['135', '120'], {
    grain: 'medium', contrast: 'moderate', latitude: 'wide', uses: ['everyday', 'street', 'flash'], flash: 'excellent',
    character: 'Affordable 400 B&W; a little grainier than HP5.',
  }),

  // ---------------- CineStill ----------------
  film('cinestill', 'CineStill 50D', 50, 'motion-picture', 'C-41', ['135', '120', 'sheet'], {
    grain: 'extremely fine', contrast: 'low', saturation: 'natural', latitude: 'wide', uses: ['landscape', 'portrait'], remjet: false,
    basedOn: { emulsion: 'Kodak Vision3 50D with rem-jet removed', confidence: 'widely reported' },
    character: 'Daylight cine film prepared for C-41; extremely fine grain and red halation around bright highlights.',
  }),
  film('cinestill', 'CineStill 400D', 400, 'motion-picture', 'C-41', ['135', '120'], {
    grain: 'fine', contrast: 'moderate', saturation: 'natural', latitude: 'wide', uses: ['everyday', 'street', 'travel'],
    character: 'Daylight 400 from motion-picture film, prepared for C-41. Shows halation around bright points.',
  }),
  film('cinestill', 'CineStill 800T', 800, 'motion-picture', 'C-41', ['135', '120'], {
    balance: 'tungsten', grain: 'medium', contrast: 'moderate', saturation: 'natural', latitude: 'moderate', uses: ['night', 'street'], flash: 'fair',
    basedOn: { emulsion: 'Kodak Vision3 500T with rem-jet removed', confidence: 'widely reported' },
    character: 'Night-city tungsten film with red halation glows around lights. Rated 800 for C-41.',
    notes: ['Flash and daylight render blue on tungsten film; consider a CTO gel on the flash.', 'Halation is strongest around point lights at night.'],
  }),
  film('cinestill', 'CineStill BwXX', 250, 'motion-picture', 'B&W', ['135'], {
    colour: 'bw', balance: 'n/a', saturation: 'n/a', grain: 'medium', contrast: 'high', latitude: 'wide', uses: ['street', 'documentary'],
    basedOn: { emulsion: 'Eastman Double-X 5222', confidence: 'confirmed' },
    character: 'Classic cine B&W; ISO 250 daylight / 200 tungsten.',
  }),

  // ---------------- Lomography ----------------
  film('lomography', 'Color Negative 100', 100, 'color-negative', 'C-41', ['135', '120'], {
    grain: 'fine', contrast: 'moderate', saturation: 'high', latitude: 'wide', uses: ['everyday', 'travel'], reference: 'manufacturer / seller listing',
    character: 'Saturated daylight film.',
  }),
  film('lomography', 'Color Negative 400', 400, 'color-negative', 'C-41', ['135', '120', '110'], {
    grain: 'medium', contrast: 'moderate', saturation: 'high', latitude: 'wide', uses: ['everyday', 'flash'], flash: 'good', reference: 'manufacturer / seller listing',
    character: 'Saturated all-rounder.',
  }),
  film('lomography', 'Color Negative 800', 800, 'color-negative', 'C-41', ['135', '120'], {
    grain: 'medium', contrast: 'moderate', saturation: 'high', latitude: 'wide', uses: ['night', 'flash'], flash: 'good', reference: 'manufacturer / seller listing',
    character: 'One of the few fast colour negative films available new.',
  }),
  film('lomography', 'Metropolis', 400, 'creative', 'C-41', ['135', '120', '110'], {
    eiRange: [100, 400], grain: 'medium', contrast: 'high', saturation: 'low', latitude: 'moderate', uses: ['street', 'experimental'], status: 'limited', reference: 'manufacturer / seller listing',
    character: 'Desaturated, contrasty urban look. Rate between ISO 100 and 400.',
  }),
  film('lomography', 'LomoChrome Purple', 400, 'creative', 'C-41', ['135', '120'], {
    eiRange: [100, 400], grain: 'medium', contrast: 'moderate', saturation: 'high', latitude: 'moderate', uses: ['experimental'], status: 'limited', reference: 'manufacturer / seller listing',
    character: 'Colour-shifting film: greens turn purple, blues turn green.',
  }),
  film('lomography', 'LomoChrome Turquoise', 400, 'creative', 'C-41', ['135', '120'], {
    eiRange: [100, 400], grain: 'medium', contrast: 'moderate', saturation: 'high', latitude: 'moderate', uses: ['experimental'], status: 'limited', reference: 'manufacturer / seller listing',
    character: 'Colour-shifting film: blue skies turn golden, warm tones turn turquoise.',
  }),
  film('lomography', 'LomoChrome Color \'92', 400, 'creative', 'C-41', ['135', '120'], {
    grain: 'medium', contrast: 'moderate', saturation: 'high', latitude: 'wide', uses: ['everyday', 'experimental'], status: 'limited', reference: 'manufacturer / seller listing',
    character: 'Warm, nostalgic 1990s consumer-film rendering.',
  }),
  film('lomography', 'Redscale XR 50–200', 100, 'creative', 'C-41', ['135', '120'], {
    eiRange: [50, 200], grain: 'medium', contrast: 'moderate', saturation: 'high', latitude: 'wide', uses: ['experimental'], reference: 'manufacturer / seller listing',
    character: 'Film exposed through the base: red, orange and yellow tones. More exposure gives less red.',
  }),
  film('lomography', 'Earl Grey 100', 100, 'bw-negative', 'B&W', ['135', '120', '110'], {
    grain: 'medium', contrast: 'moderate', latitude: 'moderate', uses: ['everyday'], reference: 'manufacturer / seller listing',
    basedOn: { emulsion: 'Fomapan 100', confidence: 'widely reported' },
    character: 'Classic-looking general purpose B&W.',
  }),
  film('lomography', 'Lady Grey 400', 400, 'bw-negative', 'B&W', ['135', '120'], {
    grain: 'medium', contrast: 'moderate', latitude: 'moderate', uses: ['everyday', 'street'], reference: 'manufacturer / seller listing',
    basedOn: { emulsion: 'Fomapan 400', confidence: 'widely reported' },
    character: 'General purpose 400 B&W.',
  }),
  film('lomography', 'Potsdam Kino 100', 100, 'bw-negative', 'B&W', ['135'], {
    grain: 'fine', contrast: 'moderate', latitude: 'moderate', uses: ['everyday', 'portrait'], reference: 'manufacturer / seller listing',
    basedOn: { emulsion: 'ORWO UN54', confidence: 'widely reported' },
    character: 'Cine-derived B&W with a classic look.',
  }),
  film('lomography', 'Berlin Kino 400', 400, 'bw-negative', 'B&W', ['135', '120'], {
    grain: 'medium', contrast: 'moderate', latitude: 'moderate', uses: ['street', 'night'], reference: 'manufacturer / seller listing',
    basedOn: { emulsion: 'ORWO N74 Plus', confidence: 'widely reported' },
    character: 'Cine-derived 400 B&W with soft, low-key tones.',
  }),
  film('lomography', 'Fantôme Kino 8', 8, 'bw-negative', 'B&W', ['135'], {
    grain: 'fine', contrast: 'very high', latitude: 'narrow', uses: ['experimental', 'fine-art'], status: 'limited', reference: 'manufacturer / seller listing',
    character: 'Extremely slow, very high contrast B&W. Needs bright light or a tripod.',
    notes: ['ISO 8 is below the AE-1 Program\'s ASA dial (minimum 12): set exposure manually from the app.'],
  }),

  // ---------------- Foma ----------------
  film('foma', 'Fomapan 100 Classic', 100, 'bw-negative', 'B&W', ['135', '120', 'sheet'], {
    grain: 'fine', contrast: 'moderate', latitude: 'moderate', uses: ['everyday', 'landscape'], flash: 'good',
    character: 'Inexpensive classic cubic-grain B&W.',
    notes: ['Foma films show pronounced reciprocity failure; check Foma\'s datasheet for any exposure over 1 s.'],
  }),
  film('foma', 'Fomapan 200 Creative', 200, 'bw-negative', 'B&W', ['135', '120', 'sheet'], {
    grain: 'fine', contrast: 'moderate', latitude: 'moderate', uses: ['everyday', 'portrait'],
    character: 'Mid-speed B&W with a slightly more modern tonality.',
    notes: ['Pronounced reciprocity failure beyond 1 s.'],
  }),
  film('foma', 'Fomapan 400 Action', 400, 'bw-negative', 'B&W', ['135', '120', 'sheet'], {
    grain: 'pronounced', contrast: 'moderate', latitude: 'moderate', uses: ['street', 'documentary'],
    character: 'Grainy, vintage-looking 400 B&W. Many users rate it at EI 200–320 for better shadows.',
    notes: ['Pronounced reciprocity failure beyond 1 s.'],
  }),
  film('foma', 'Retropan 320 Soft', 320, 'bw-negative', 'B&W', ['135', '120', 'sheet'], {
    grain: 'medium', contrast: 'low', latitude: 'moderate', uses: ['portrait', 'fine-art'],
    character: 'Soft, vintage tonality designed for Foma\'s Retro Special developer.',
  }),
  film('foma', 'Fomapan R100', 100, 'bw-reversal', 'B&W reversal', ['135'], {
    grain: 'fine', contrast: 'high', latitude: 'narrow', uses: ['fine-art', 'experimental'],
    character: 'B&W reversal film for black-and-white slides; needs a reversal process.',
  }),

  // ---------------- Rollei ----------------
  film('rollei', 'RPX 25', 25, 'bw-negative', 'B&W', ['135', '120'], {
    grain: 'extremely fine', contrast: 'high', latitude: 'narrow', uses: ['landscape', 'fine-art'], status: 'unverified', reference: 'manufacturer / seller listing',
    character: 'Very slow, very fine grain B&W.',
  }),
  film('rollei', 'RPX 100', 100, 'bw-negative', 'B&W', ['135', '120', 'sheet'], {
    grain: 'fine', contrast: 'moderate', latitude: 'moderate', uses: ['everyday', 'landscape'], reference: 'manufacturer / seller listing',
    character: 'General purpose fine-grain B&W.',
  }),
  film('rollei', 'RPX 400', 400, 'bw-negative', 'B&W', ['135', '120', 'sheet'], {
    grain: 'medium', contrast: 'moderate', latitude: 'wide', uses: ['street', 'everyday'], reference: 'manufacturer / seller listing',
    character: 'General purpose 400 B&W.',
  }),
  film('rollei', 'Retro 80S', 80, 'bw-negative', 'B&W', ['135', '120'], {
    grain: 'very fine', contrast: 'high', latitude: 'narrow', uses: ['landscape', 'experimental'], extendedRed: true, reference: 'manufacturer / seller listing',
    basedOn: { emulsion: 'Agfa-Gevaert Aviphot Pan 80 aerial film', confidence: 'widely reported' },
    character: 'Aerial-derived film on a clear base with extended red sensitivity.',
  }),
  film('rollei', 'Retro 400S', 400, 'bw-negative', 'B&W', ['135', '120'], {
    grain: 'medium', contrast: 'high', latitude: 'moderate', uses: ['landscape', 'experimental'], extendedRed: true, reference: 'manufacturer / seller listing',
    basedOn: { emulsion: 'Agfa-Gevaert aerial film', confidence: 'widely reported' },
    character: 'Extended-red B&W; gives infrared-like effects with a deep red filter.',
  }),
  film('rollei', 'Ortho 25 Plus', 25, 'bw-negative', 'B&W', ['135', '120', 'sheet'], {
    grain: 'extremely fine', contrast: 'high', latitude: 'narrow', uses: ['fine-art', 'product'], orthochromatic: true, reference: 'manufacturer / seller listing',
    character: 'Slow orthochromatic film; can be handled under red safelight.',
  }),
  film('rollei', 'Infrared 400', 400, 'infrared', 'B&W', ['135', '120', 'sheet'], {
    grain: 'medium', contrast: 'high', latitude: 'narrow', uses: ['experimental', 'landscape'], extendedRed: true, flash: 'n/a', reference: 'manufacturer / seller listing',
    character: 'Extended-red film (to roughly 820 nm). With a 720 nm filter, foliage glows white and skies turn black.',
    notes: ['With an IR filter, effective speed drops to roughly EI 3–25 depending on the filter and light. Bracket.'],
  }),
  film('rollei', 'Superpan 200', 200, 'bw-negative', 'B&W', ['135', '120'], {
    grain: 'fine', contrast: 'high', latitude: 'moderate', uses: ['everyday', 'experimental'], extendedRed: true, reference: 'manufacturer / seller listing',
    character: 'Extended-red B&W on a clear base.',
  }),

  // ---------------- ADOX ----------------
  film('adox', 'CMS 20 II', 20, 'bw-negative', 'B&W', ['135', '120', 'sheet'], {
    grain: 'extremely fine', contrast: 'very high', latitude: 'narrow', uses: ['fine-art', 'product', 'landscape'],
    character: 'Microfilm-derived document film with extraordinary resolution. Needs ADOX Adotech developer for pictorial contrast.',
    notes: ['Exposure speed depends on the developer (ADOX gives EI 12–20 range).'],
  }),
  film('adox', 'HR-50', 50, 'bw-negative', 'B&W', ['135', '120'], {
    grain: 'very fine', contrast: 'high', latitude: 'moderate', uses: ['landscape', 'fine-art'], extendedRed: true,
    character: 'Slow, sharp B&W with extended red sensitivity for darker skies.',
  }),
  film('adox', 'CHS 100 II', 100, 'bw-negative', 'B&W', ['135', '120', 'sheet'], {
    grain: 'fine', contrast: 'moderate', latitude: 'wide', uses: ['everyday', 'portrait'],
    character: 'Classic orthopanchromatic B&W revived by ADOX.',
  }),
  film('adox', 'Scala 50', 50, 'bw-reversal', 'B&W reversal', ['135'], {
    grain: 'fine', contrast: 'high', latitude: 'narrow', uses: ['fine-art'], status: 'unverified', reference: 'manufacturer / seller listing',
    character: 'B&W slide film designed for reversal processing.',
  }),
  film('adox', 'Color Mission 200', 200, 'color-negative', 'C-41', ['135'], {
    grain: 'fine', contrast: 'moderate', saturation: 'high', latitude: 'wide', uses: ['everyday'], status: 'unverified', reference: 'manufacturer / seller listing',
    character: 'Limited-run ADOX colour negative.',
  }),

  // ---------------- Agfa / AgfaPhoto ----------------
  film('agfa', 'AgfaPhoto APX 100', 100, 'bw-negative', 'B&W', ['135', '120'], {
    grain: 'fine', contrast: 'moderate', latitude: 'moderate', uses: ['everyday'], reference: 'manufacturer / seller listing',
    basedOn: { emulsion: 'Kentmere Pan 100 (Harman)', confidence: 'widely reported' },
    character: 'Current APX 100 is not the original Agfa emulsion.',
  }),
  film('agfa', 'AgfaPhoto APX 400', 400, 'bw-negative', 'B&W', ['135', '120'], {
    grain: 'medium', contrast: 'moderate', latitude: 'wide', uses: ['everyday', 'street'], reference: 'manufacturer / seller listing',
    basedOn: { emulsion: 'Kentmere Pan 400 (Harman)', confidence: 'widely reported' },
    character: 'Current APX 400 is not the original Agfa emulsion.',
  }),
  film('agfa', 'Agfa APX 100 (original)', 100, 'bw-negative', 'B&W', ['135', '120', 'sheet'], {
    grain: 'fine', contrast: 'moderate', latitude: 'moderate', uses: ['everyday'], status: 'historical', discontinued: '2005',
    character: 'The original Agfa-made APX, discontinued after Agfa\'s consumer business closed.',
  }),
  film('agfa', 'AgfaPhoto Vista Plus 200', 200, 'color-negative', 'C-41', ['135'], {
    grain: 'fine', contrast: 'moderate', saturation: 'high', latitude: 'wide', uses: ['everyday'], status: 'discontinued', discontinued: 'c. 2018',
    basedOn: { emulsion: 'Fujicolor C200', confidence: 'widely reported' },
    character: 'Budget consumer film; only expired stock remains.',
  }),
  film('agfa', 'AgfaPhoto CT Precisa 100', 100, 'color-reversal', 'E-6', ['135'], {
    grain: 'very fine', contrast: 'moderate', saturation: 'high', latitude: 'narrow', uses: ['travel', 'experimental'], status: 'discontinued',
    basedOn: { emulsion: 'a Fujifilm E-6 emulsion', confidence: 'widely reported' },
    character: 'Slide film popular for cross-processing.',
  }),
  film('agfa', 'Agfa Scala 200x', 200, 'bw-reversal', 'B&W reversal', ['135', '120'], {
    grain: 'fine', contrast: 'high', latitude: 'narrow', uses: ['fine-art'], status: 'historical',
    character: 'Famous B&W slide film; its dedicated process is gone.',
  }),

  // ---------------- ORWO / Wolfen ----------------
  film('orwo', 'Wolfen NC500', 400, 'color-negative', 'C-41', ['135'], {
    grain: 'medium', contrast: 'moderate', saturation: 'natural', latitude: 'moderate', uses: ['everyday', 'experimental'], reference: 'manufacturer / seller listing',
    character: 'Wolfen\'s first colour negative (2023). Despite the name, Wolfen specifies ISO 400. Muted, slightly vintage colour.',
    notes: ['Can be developed in standard C-41.'],
  }),
  film('orwo', 'Wolfen NC400', 400, 'color-negative', 'C-41', ['135'], {
    grain: 'fine', contrast: 'moderate', saturation: 'high', latitude: 'moderate', uses: ['everyday'], reference: 'manufacturer / seller listing',
    character: 'More saturated, finer-grained and cooler than NC500.',
  }),
  film('orwo', 'Wolfen NP100', 100, 'bw-negative', 'B&W', ['135'], {
    grain: 'fine', contrast: 'moderate', latitude: 'moderate', uses: ['everyday'], reference: 'manufacturer / seller listing',
    character: 'Fine-grained 100-speed B&W.',
  }),
  film('orwo', 'UN54', 100, 'bw-negative', 'B&W', ['135'], {
    grain: 'fine', contrast: 'moderate', latitude: 'moderate', uses: ['everyday', 'portrait'],
    character: 'Universal cine negative for outdoor and indoor use. Some users rate it at EI 80 for more shadow detail.',
  }),
  film('orwo', 'N74 Plus', 400, 'bw-negative', 'B&W', ['135'], {
    grain: 'medium', contrast: 'moderate', latitude: 'moderate', uses: ['street', 'night'],
    character: 'Fast cine B&W negative.',
  }),

  // ---------------- Ferrania ----------------
  film('ferrania', 'P30', 80, 'bw-negative', 'B&W', ['135', '120'], {
    grain: 'very fine', contrast: 'high', latitude: 'narrow', uses: ['fine-art', 'portrait', 'landscape'],
    character: 'High-silver cinematic B&W with deep blacks and strong contrast.',
  }),
  film('ferrania', 'Orto', 50, 'bw-negative', 'B&W', ['135'], {
    grain: 'very fine', contrast: 'high', latitude: 'narrow', uses: ['fine-art', 'experimental'], orthochromatic: true,
    character: 'Orthochromatic B&W: insensitive to red, dramatic skin and sky rendering.',
  }),
  film('ferrania', 'Solaris FG Plus 200', 200, 'color-negative', 'C-41', ['135'], {
    grain: 'fine', contrast: 'moderate', saturation: 'high', latitude: 'wide', uses: ['everyday'], status: 'historical',
    character: 'Old Ferrania consumer colour film from before the factory closed.',
  }),

  // ---------------- Bergger ----------------
  film('bergger', 'Pancro 400', 400, 'bw-negative', 'B&W', ['135', '120', 'sheet'], {
    grain: 'medium', contrast: 'low', latitude: 'wide', uses: ['portrait', 'fine-art'],
    character: 'Dual-emulsion B&W with soft, classic tonality and wide latitude.',
  }),

  // ---------------- Film Washi ----------------
  film('washi', 'Film Washi "S"', 50, 'bw-negative', 'B&W', ['135'], {
    grain: 'fine', contrast: 'very high', latitude: 'narrow', uses: ['experimental', 'fine-art'], status: 'unverified', reference: 'manufacturer / seller listing',
    character: 'Repurposed technical film with very high contrast.',
  }),
  film('washi', 'Film Washi "Z"', 400, 'bw-negative', 'B&W', ['135'], {
    status: 'unverified', reference: 'manufacturer / seller listing', uses: ['experimental'],
    character: 'Repurposed specialty B&W film sold at ISO 400.',
  }),
  film('washi', 'Film Washi Color "X"', 100, 'creative', 'C-41', ['135'], {
    status: 'unverified', reference: 'manufacturer / seller listing', uses: ['experimental'],
    character: 'Repurposed specialty colour film sold at ISO 100. Processing: check the box before sending to a lab.',
  }),

  // ---------------- Film Photography Project ----------------
  film('fpp', 'RetroChrome 400', 400, 'color-reversal', 'E-6', ['135'], {
    status: 'limited', reference: 'manufacturer / seller listing', uses: ['experimental'], latitude: 'narrow',
    character: 'FPP-branded slide film with a vintage look.',
  }),
  film('fpp', 'Dracula 64', 64, 'bw-negative', 'B&W', ['135', '120'], {
    status: 'limited', reference: 'manufacturer / seller listing', uses: ['experimental'],
    character: 'Part of FPP\'s "Monster" line of repurposed B&W films.',
  }),
  film('fpp', 'Frankenstein 200', 200, 'bw-negative', 'B&W', ['135', '120'], {
    status: 'limited', reference: 'manufacturer / seller listing', uses: ['experimental'],
    character: 'Part of FPP\'s "Monster" line of repurposed B&W films.',
  }),
  film('fpp', 'The Mummy 400', 400, 'bw-negative', 'B&W', ['135', '120'], {
    status: 'limited', reference: 'manufacturer / seller listing', uses: ['experimental'],
    character: 'Part of FPP\'s "Monster" line of repurposed B&W films.',
  }),
  film('fpp', 'Wolfman 100', 100, 'bw-negative', 'B&W', ['135', '120'], {
    status: 'limited', reference: 'manufacturer / seller listing', uses: ['experimental'],
    character: 'Part of FPP\'s "Monster" line of repurposed B&W films.',
  }),
  film('fpp', 'Derev Pan 100', 100, 'bw-negative', 'B&W', ['135'], {
    status: 'unverified', reference: 'manufacturer / seller listing', uses: ['everyday'],
    character: 'FPP-branded B&W.',
  }),
  film('fpp', 'Derev Pan 400', 400, 'bw-negative', 'B&W', ['135'], {
    status: 'unverified', reference: 'manufacturer / seller listing', uses: ['everyday'],
    character: 'FPP-branded B&W.',
  }),

  // ---------------- Flic Film ----------------
  film('flic', 'Elektra 100', 100, 'color-negative', 'C-41', ['135'], {
    grain: 'fine', saturation: 'high', status: 'unverified', reference: 'manufacturer / seller listing', uses: ['everyday', 'landscape'],
    character: 'Flic Film colour negative sold at ISO 100.',
  }),
  film('flic', 'Cine Colour 50D', 50, 'motion-picture', 'ECN-2', ['135'], {
    grain: 'extremely fine', contrast: 'low', saturation: 'natural', latitude: 'wide', uses: ['landscape', 'portrait'], remjet: true, reference: 'manufacturer / seller listing',
    basedOn: { emulsion: 'Kodak Vision3 50D (5203)', confidence: 'confirmed' },
    character: 'Respooled Vision3 50D.',
    notes: [REMJET],
  }),

  // ---------------- Street Candy ----------------
  film('streetcandy', 'MTN100', 100, 'bw-negative', 'B&W', ['135'], {
    grain: 'fine', contrast: 'high', latitude: 'moderate', uses: ['street', 'everyday'], reference: 'manufacturer / seller listing',
    character: 'Panchromatic B&W repurposed from technical stock; no DX code, so set the speed manually.',
  }),
  film('streetcandy', 'ATM400', 400, 'bw-negative', 'B&W', ['135'], {
    grain: 'medium', contrast: 'high', latitude: 'moderate', uses: ['street'], reference: 'manufacturer / seller listing',
    character: 'Repurposed bank-surveillance B&W film; contrasty, clear base.',
  }),

  // ---------------- Dubblefilm ----------------
  film('dubblefilm', 'Cinema 800', 800, 'motion-picture', 'C-41', ['135'], {
    balance: 'tungsten', status: 'unverified', reference: 'manufacturer / seller listing', uses: ['night'],
    character: 'Tungsten-balanced cine-derived colour film. Confirm the processing on the box before sending it to a lab.',
  }),
  film('dubblefilm', 'Pacific 200', 200, 'creative', 'C-41', ['135'], {
    status: 'unverified', reference: 'manufacturer / seller listing', uses: ['experimental'],
    character: 'Pre-exposed effects film with a blue/cyan shift.',
  }),
  film('dubblefilm', 'Jelly 200', 200, 'creative', 'C-41', ['135'], {
    status: 'unverified', reference: 'manufacturer / seller listing', uses: ['experimental'],
    character: 'Pre-exposed effects film with multicoloured light-leak tints.',
  }),
  film('dubblefilm', 'Bubblegum 200', 200, 'creative', 'C-41', ['135'], {
    status: 'unverified', reference: 'manufacturer / seller listing', uses: ['experimental'],
    character: 'Pre-exposed effects film with pink tints.',
  }),
  film('dubblefilm', 'Sunstroke 200', 200, 'creative', 'C-41', ['135'], {
    status: 'unverified', reference: 'manufacturer / seller listing', uses: ['experimental'],
    character: 'Pre-exposed effects film with warm leaks.',
  }),

  // ---------------- Revolog ----------------
  film('revolog', 'Kolor', 200, 'creative', 'C-41', ['135'], {
    status: 'unverified', reference: 'manufacturer / seller listing', uses: ['experimental'],
    character: 'Effects film with random colour shifts across the frame.',
  }),
  film('revolog', 'Tesla I', 200, 'creative', 'C-41', ['135'], {
    status: 'unverified', reference: 'manufacturer / seller listing', uses: ['experimental'],
    character: 'Effects film with lightning-like electric discharge streaks.',
  }),
  film('revolog', 'Lazer', 200, 'creative', 'C-41', ['135'], {
    status: 'unverified', reference: 'manufacturer / seller listing', uses: ['experimental'],
    character: 'Effects film with thin coloured lines.',
  }),
  film('revolog', '460nm', 200, 'creative', 'C-41', ['135', '120'], {
    status: 'unverified', reference: 'manufacturer / seller listing', uses: ['experimental'],
    character: 'Effects film tinted toward blue (460 nm).',
  }),
  film('revolog', '600nm', 200, 'creative', 'C-41', ['135', '120'], {
    status: 'unverified', reference: 'manufacturer / seller listing', uses: ['experimental'],
    character: 'Effects film tinted toward orange-red (600 nm).',
  }),

  // ---------------- Lucky ----------------
  film('lucky', 'SHD 100', 100, 'bw-negative', 'B&W', ['135', '120'], {
    grain: 'fine', contrast: 'moderate', latitude: 'moderate', uses: ['everyday'], status: 'unverified', reference: 'manufacturer / seller listing',
    character: 'Chinese-made B&W; DX-coded. Sellers disagree on whether it is currently available.',
  }),
  film('lucky', 'C200', 200, 'color-negative', 'C-41', ['135'], {
    status: 'unverified', reference: 'manufacturer / seller listing', uses: ['everyday'],
    character: 'Lucky\'s recent colour negative film; specifications not yet well documented.',
  }),

  // ---------------- Shanghai ----------------
  film('shanghai', 'GP3 100', 100, 'bw-negative', 'B&W', ['135', '120', '220', 'sheet'], {
    grain: 'fine', contrast: 'moderate', latitude: 'moderate', uses: ['everyday', 'portrait', 'landscape'],
    character: 'Classic panchromatic B&W still made by Shanghai Jiancheng Film; one of the few 220 films.',
  }),

  // ---------------- Kosmo Foto ----------------
  film('kosmo', 'Mono 100', 100, 'bw-negative', 'B&W', ['135', '120'], {
    grain: 'fine', contrast: 'moderate', latitude: 'moderate', uses: ['everyday'], reference: 'manufacturer / seller listing',
    basedOn: { emulsion: 'Fomapan 100', confidence: 'widely reported' },
    character: 'Classic-looking B&W; Kosmo Foto describes it only as a "classic emulsion".',
  }),
  film('kosmo', 'Agent Shadow 400', 400, 'bw-negative', 'B&W', ['135'], {
    eiRange: [400, 6400], grain: 'medium', contrast: 'moderate', latitude: 'wide', uses: ['night', 'street'], status: 'limited', reference: 'manufacturer / seller listing',
    character: 'Panchromatic B&W that the seller says can be pushed to EI 6400. Source emulsion not confirmed.',
  }),

  // ---------------- JCH ----------------
  film('jch', 'StreetPan 400', 400, 'bw-negative', 'B&W', ['135', '120'], {
    grain: 'medium', contrast: 'high', latitude: 'moderate', uses: ['street', 'documentary'], status: 'limited',
    basedOn: { emulsion: 'Agfa-Gevaert surveillance film', confidence: 'confirmed' },
    character: 'Contrasty, sharp B&W on a clear base with extended red sensitivity.',
  }),

  // ---------------- CatLABS ----------------
  film('catlabs', 'X Film 80', 80, 'bw-negative', 'B&W', ['120', 'sheet'], {
    grain: 'fine', contrast: 'moderate', latitude: 'moderate', uses: ['fine-art', 'landscape'], reference: 'manufacturer / seller listing',
    character: 'Fine-grain B&W in medium and large format (now sold as MKII). Not available in 35mm.',
  }),

  // ---------------- Reflx Lab ----------------
  film('reflx', 'Reflx Lab 500T', 500, 'motion-picture', 'ECN-2', ['135', '120'], {
    balance: 'tungsten', grain: 'medium', contrast: 'low', saturation: 'natural', latitude: 'wide', uses: ['night', 'street'], remjet: true, reference: 'manufacturer / seller listing',
    basedOn: { emulsion: 'Kodak Vision3 500T (5219)', confidence: 'confirmed' },
    character: 'Respooled Vision3 500T for ECN-2 labs.',
    notes: [REMJET],
  }),
  film('reflx', 'Reflx Lab 800', 800, 'motion-picture', 'C-41', ['135', '120'], {
    balance: 'tungsten', grain: 'medium', contrast: 'moderate', saturation: 'natural', latitude: 'moderate', uses: ['night', 'street'], reference: 'manufacturer / seller listing',
    basedOn: { emulsion: 'Kodak Vision3 500T with rem-jet removed', confidence: 'widely reported' },
    character: 'Tungsten cine film prepared for C-41, with halation. Previously sold as "800T".',
  }),

  // ---------------- SantaColor ----------------
  film('santacolor', 'SantaColor 100', 100, 'color-negative', 'C-41', ['135'], {
    grain: 'fine', saturation: 'high', contrast: 'moderate', uses: ['landscape', 'everyday'], reference: 'manufacturer / seller listing',
    basedOn: { emulsion: 'Kodak Aerocolor IV aerial film', confidence: 'widely reported' },
    character: 'Respooled aerial colour negative on a clear base (no orange mask), so scans need different handling.',
  }),

  // ---------------- Silberra ----------------
  film('silberra', 'PAN100', 100, 'bw-negative', 'B&W', ['135', '120'], {
    grain: 'very fine', contrast: 'moderate', latitude: 'wide', uses: ['everyday', 'landscape'], status: 'unverified', reference: 'manufacturer / seller listing',
    character: 'Extra-fine-grain panchromatic B&W with moderate contrast.',
  }),
  film('silberra', 'ULTIMA 100', 100, 'bw-negative', 'B&W', ['135'], {
    grain: 'very fine', contrast: 'moderate', latitude: 'wide', uses: ['everyday'], status: 'unverified', reference: 'manufacturer / seller listing',
    character: 'The PAN100 emulsion on a thinner base (more frames per roll).',
  }),
  film('silberra', 'PAN200', 200, 'bw-negative', 'B&W', ['135'], {
    contrast: 'moderate', extendedRed: true, uses: ['everyday'], status: 'discontinued', discontinued: '2018',
    character: 'Limited-edition extended-red B&W; out of distribution since autumn 2018 per Silberra.',
  }),

  // ---------------- KONO! ----------------
  film('kono', 'Rotwild 400', 400, 'creative', 'C-41', ['135'], {
    uses: ['experimental'], status: 'unverified', reference: 'manufacturer / seller listing',
    character: 'Creative colour film with intense yellow-to-red tints, made from re-purposed motion-picture stock.',
  }),

  // ---------------- Oriental ----------------
  film('oriental', 'Seagull 100', 100, 'bw-negative', 'B&W', ['135', '120'], {
    status: 'unverified', reference: 'manufacturer / seller listing', uses: ['everyday'],
    character: 'Japanese B&W film; current supply not confirmed.',
  }),
  film('oriental', 'Seagull 400', 400, 'bw-negative', 'B&W', ['135', '120'], {
    status: 'unverified', reference: 'manufacturer / seller listing', uses: ['everyday', 'street'],
    character: 'Japanese B&W film; current supply not confirmed.',
  }),

  // ---------------- Argenti ----------------
  film('argenti', 'Scale-X 100', 100, 'bw-negative', 'B&W', ['135'], {
    eiRange: [100, 800], status: 'unverified', reference: 'manufacturer / seller listing', uses: ['everyday', 'street'],
    character: 'Converted bulk B&W the seller describes as usable from EI 100 to 800.',
  }),
  film('argenti', 'ARF+ Reporter Film Plus 400', 400, 'bw-negative', 'B&W', ['135'], {
    status: 'unverified', reference: 'manufacturer / seller listing', uses: ['street', 'documentary'],
    character: '400-speed reportage B&W converted from bulk.',
  }),

  // ---------------- Polaroid ----------------
  film('polaroid', 'i-Type Color', 640, 'instant', 'Instant (integral)', ['instant'], {
    grain: 'fine', contrast: 'moderate', saturation: 'natural', latitude: 'narrow', uses: ['everyday', 'portrait'], reference: 'manufacturer / seller listing',
    character: 'Integral instant film for i-Type cameras. The ISO is nominal (about 640). Not usable in 35mm cameras.',
  }),
  film('polaroid', '600 Color', 640, 'instant', 'Instant (integral)', ['instant'], {
    grain: 'fine', contrast: 'moderate', saturation: 'natural', latitude: 'narrow', uses: ['everyday'], reference: 'manufacturer / seller listing',
    character: 'Instant film with a battery in the pack, for 600 cameras. Nominal ISO ≈ 640.',
  }),
  film('polaroid', 'SX-70 Color', 160, 'instant', 'Instant (integral)', ['instant'], {
    grain: 'fine', contrast: 'moderate', saturation: 'natural', latitude: 'narrow', uses: ['fine-art'], reference: 'manufacturer / seller listing',
    character: 'Slower instant film for SX-70 cameras. Nominal ISO ≈ 160.',
  }),
  film('polaroid', 'Go Color', 640, 'instant', 'Instant (integral)', ['instant'], {
    grain: 'fine', contrast: 'moderate', saturation: 'natural', latitude: 'narrow', uses: ['everyday'], reference: 'manufacturer / seller listing',
    character: 'Small-format instant film for the Polaroid Go.',
  }),
];

export const FILM_BY_ID: Record<string, FilmStock> = Object.fromEntries(FILMS.map((f) => [f.id, f]));

export const CATEGORY_LABEL: Record<FilmCategory, string> = {
  'color-negative': 'Colour negative',
  'bw-negative': 'B&W negative',
  'color-reversal': 'Colour slide',
  'bw-reversal': 'B&W reversal',
  'motion-picture': 'Motion picture',
  creative: 'Creative / specialty',
  infrared: 'Infrared / extended red',
  instant: 'Instant',
};

export const STATUS_LABEL: Record<Availability, string> = {
  current: 'Currently produced',
  limited: 'Limited / specialty',
  discontinued: 'Discontinued',
  historical: 'Historical',
  unverified: 'Availability unverified',
};

/** Common box speeds the database and pickers can handle; custom values are also allowed. */
export const ISO_SCALE = [3, 6, 8, 12, 20, 25, 32, 40, 50, 64, 80, 100, 125, 160, 200, 250, 320, 400, 500, 640, 800, 1000, 1250, 1600, 3200];

export function isAe1Compatible(f: FilmStock) {
  return f.formats.includes('135');
}
