import { useMemo, useState } from 'react';
import { GitCompare, Search, SlidersHorizontal, Star, X } from 'lucide-react';
import { CATEGORY_LABEL, FILM_BY_ID, ISO_SCALE, STATUS_LABEL, isAe1Compatible, type Availability, type FilmStock, type UseTag } from '../data/films';
import { MANUFACTURERS, type ManufacturerId } from '../data/manufacturers';
import { DEFAULT_FILTERS, QUICK_FILTERS, filmEducation, filmTitle, filterFilms, statusLabel, type FilmFilters } from '../lib/films';
import { useStore } from '../state/store';
import { Chip, ChipRow, FieldLabel, Segmented, Sheet, cx } from '../components/ui';
import { FilmRow } from '../components/FilmPicker';
import { CAMERAS } from '../data/cameras';

const USES: UseTag[] = ['everyday', 'portrait', 'street', 'night', 'flash', 'landscape', 'travel', 'studio', 'product', 'documentary', 'fine-art', 'experimental'];

export function FilmLibrary() {
  const { state, dispatch } = useStore();
  const [filters, setFilters] = useState<FilmFilters>({ ...DEFAULT_FILTERS, only135: state.camera === 'ae1p' });
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [detail, setDetail] = useState<FilmStock | null>(null);
  const [compareOpen, setCompareOpen] = useState(false);
  const results = useMemo(() => filterFilms(filters, state.favorites), [filters, state.favorites]);
  const set = (p: Partial<FilmFilters>) => setFilters((f) => ({ ...f, ...p }));
  const activeCount =
    filters.makers.length +
    (filters.isoMin !== undefined || filters.isoMax !== undefined ? 1 : 0) +
    (filters.colour ? 1 : 0) +
    (filters.polarity ? 1 : 0) +
    (filters.use ? 1 : 0) +
    filters.availability.length +
    (filters.favoritesOnly ? 1 : 0) +
    (filters.only135 ? 0 : 1);

  return (
    <div className="safe-x flex flex-col gap-3 py-4">
      <div className="flex items-baseline justify-between">
        <h1 className="font-display text-[30px] font-semibold leading-none tracking-wide">Film Library</h1>
        <span className="text-sm text-muted tnum">{results.length} stocks</span>
      </div>

      <div className="flex gap-2">
        <label className="flex min-h-12 min-w-0 flex-1 items-center gap-2 rounded-xl border border-line bg-surface px-3 focus-within:border-accent">
          <Search size={18} className="text-muted" aria-hidden />
          <input
            id="film-search"
            value={filters.query}
            onChange={(e) => set({ query: e.target.value })}
            placeholder="Name, brand, ISO, process…"
            className="min-h-11 min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-dim"
            aria-label="Search film stocks"
          />
          {filters.query && (
            <button type="button" onClick={() => set({ query: '' })} aria-label="Clear search" className="text-muted">
              <X size={16} />
            </button>
          )}
        </label>
        <button
          type="button"
          onClick={() => setFiltersOpen(true)}
          className={cx('flex min-h-12 shrink-0 items-center gap-1.5 rounded-xl border px-3 text-sm font-semibold', activeCount ? 'border-accent text-accent' : 'border-line bg-surface')}
        >
          <SlidersHorizontal size={16} aria-hidden /> Filters{activeCount ? ` · ${activeCount}` : ''}
        </button>
      </div>

      <ChipRow>
        <Chip active={filters.favoritesOnly} onClick={() => set({ favoritesOnly: !filters.favoritesOnly })}>
          <span className="flex items-center gap-1">
            <Star size={13} aria-hidden /> Favourites
          </span>
        </Chip>
        {QUICK_FILTERS.map((q) => (
          <Chip
            key={q.id}
            active={filters.quick.includes(q.id)}
            onClick={() => set({ quick: filters.quick.includes(q.id) ? filters.quick.filter((x) => x !== q.id) : [...filters.quick, q.id] })}
          >
            {q.label}
          </Chip>
        ))}
      </ChipRow>

      <p className="text-xs text-muted">
        {filters.only135 ? 'Showing 35mm (135) stocks only, the ones that fit the AE-1 Program. ' : 'Showing all formats. '}
        Availability is a 2026 snapshot; check with your shop.
      </p>

      <div className="flex flex-col gap-2">
        {results.map((f) => (
          <FilmRow key={f.id} f={f} onPick={() => setDetail(f)} active={state.filmId === f.id} />
        ))}
        {results.length === 0 && (
          <div className="rounded-xl border border-line p-6 text-center text-sm text-muted">
            No stocks match these filters.{' '}
            <button type="button" className="font-semibold text-accent" onClick={() => setFilters({ ...DEFAULT_FILTERS, only135: filters.only135 })}>
              Clear filters
            </button>
          </div>
        )}
      </div>

      {state.compare.length > 0 && (
        <div className="fixed inset-x-0 bottom-[calc(68px+env(safe-area-inset-bottom,0px))] z-20">
          <div className="safe-x mx-auto max-w-xl pb-2">
            <div className="flex items-center gap-2 rounded-full border border-accent bg-raise py-1.5 pr-1.5 pl-4 shadow-lg shadow-black/50">
              <GitCompare size={16} className="text-accent" aria-hidden />
              <span className="flex-1 truncate text-sm">
                Compare: {state.compare.map((id) => FILM_BY_ID[id]!.name).join(', ')}
              </span>
              <button type="button" onClick={() => dispatch({ type: 'clearCompare' })} className="min-h-9 px-2 text-sm text-muted">
                Clear
              </button>
              <button type="button" onClick={() => setCompareOpen(true)} className="min-h-9 rounded-full bg-accent px-4 text-sm font-semibold text-accent-ink">
                Open
              </button>
            </div>
          </div>
        </div>
      )}

      <Sheet open={filtersOpen} onClose={() => setFiltersOpen(false)} title="Filters">
        <FilterPanel filters={filters} set={set} reset={() => setFilters({ ...DEFAULT_FILTERS })} />
        <button type="button" onClick={() => setFiltersOpen(false)} className="mt-4 min-h-12 w-full rounded-full bg-accent font-semibold text-accent-ink">
          Show {results.length} stocks
        </button>
      </Sheet>

      <Sheet open={!!detail} onClose={() => setDetail(null)} title={detail ? filmTitle(detail) : ''}>
        {detail && <FilmDetail f={detail} onUse={() => setDetail(null)} />}
      </Sheet>

      <Sheet open={compareOpen} onClose={() => setCompareOpen(false)} title="Compare films">
        <Compare />
      </Sheet>
    </div>
  );
}

function FilterPanel({ filters, set, reset }: { filters: FilmFilters; set: (p: Partial<FilmFilters>) => void; reset: () => void }) {
  const makers = Object.values(MANUFACTURERS);
  const isoChoices: [string, number | undefined, number | undefined][] = [
    ['Any', undefined, undefined],
    ['≤ 50', undefined, 50],
    ['64–160', 64, 160],
    ['200–400', 200, 400],
    ['500–800', 500, 800],
    ['1000+', 1000, undefined],
  ];
  const toggleAvail = (a: Availability) =>
    set({ availability: filters.availability.includes(a) ? filters.availability.filter((x) => x !== a) : [...filters.availability, a] });
  return (
    <div className="flex flex-col gap-5">
      <div>
        <FieldLabel>Format</FieldLabel>
        <Segmented
          label="Format"
          value={filters.only135 ? '135' : 'all'}
          onChange={(v) => set({ only135: v === '135' })}
          options={[
            { value: '135', label: '35mm only (AE-1)' },
            { value: 'all', label: 'All formats' },
          ]}
        />
      </div>
      <div>
        <FieldLabel>Colour</FieldLabel>
        <Segmented
          label="Colour"
          value={filters.colour ?? 'any'}
          onChange={(v) => set({ colour: v === 'any' ? undefined : v })}
          options={[
            { value: 'any', label: 'Any' },
            { value: 'color', label: 'Colour' },
            { value: 'bw', label: 'B&W' },
          ]}
        />
      </div>
      <div>
        <FieldLabel>Negative or slide</FieldLabel>
        <Segmented
          label="Polarity"
          value={filters.polarity ?? 'any'}
          onChange={(v) => set({ polarity: v === 'any' ? undefined : v })}
          options={[
            { value: 'any', label: 'Any' },
            { value: 'negative', label: 'Negative' },
            { value: 'positive', label: 'Slide' },
          ]}
        />
      </div>
      <div>
        <FieldLabel>ISO</FieldLabel>
        <div className="flex flex-wrap gap-2">
          {isoChoices.map(([label, lo, hi]) => (
            <Chip key={label} active={filters.isoMin === lo && filters.isoMax === hi} onClick={() => set({ isoMin: lo, isoMax: hi })}>
              {label}
            </Chip>
          ))}
        </div>
        <p className="mt-2 text-xs text-muted">Catalogue handles {ISO_SCALE[0]}–{ISO_SCALE[ISO_SCALE.length - 1]} and custom speeds.</p>
      </div>
      <div>
        <FieldLabel>Intended use</FieldLabel>
        <div className="flex flex-wrap gap-2">
          <Chip active={!filters.use} onClick={() => set({ use: undefined })}>
            Any
          </Chip>
          {USES.map((u) => (
            <Chip key={u} active={filters.use === u} onClick={() => set({ use: u })}>
              {u}
            </Chip>
          ))}
        </div>
      </div>
      <div>
        <FieldLabel>Availability</FieldLabel>
        <div className="flex flex-wrap gap-2">
          {(Object.keys(STATUS_LABEL) as Availability[]).map((a) => (
            <Chip key={a} active={filters.availability.includes(a)} onClick={() => toggleAvail(a)}>
              {STATUS_LABEL[a]}
            </Chip>
          ))}
        </div>
      </div>
      <div>
        <FieldLabel>Manufacturer</FieldLabel>
        <div className="flex flex-wrap gap-2">
          {makers.map((m) => (
            <Chip
              key={m.id}
              active={filters.makers.includes(m.id)}
              onClick={() => set({ makers: filters.makers.includes(m.id) ? filters.makers.filter((x) => x !== m.id) : [...filters.makers, m.id as ManufacturerId] })}
            >
              {m.name}
            </Chip>
          ))}
        </div>
      </div>
      <button type="button" onClick={reset} className="min-h-11 self-start text-sm font-semibold text-accent">
        Reset all filters
      </button>
    </div>
  );
}

function FilmDetail({ f, onUse }: { f: FilmStock; onUse: () => void }) {
  const { state, dispatch } = useStore();
  const compat = isAe1Compatible(f);
  const fav = state.favorites.includes(f.id);
  const inCompare = state.compare.includes(f.id);
  const isFilmCam = CAMERAS[state.camera].medium === 'film';
  const stale = f.status === 'discontinued' || f.status === 'historical';
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-1.5 text-xs">
        <span className="rounded-full border border-line-strong px-2.5 py-1 font-semibold tnum">ISO {f.iso}{f.eiRange ? ` (EI ${f.eiRange[0]}–${f.eiRange[1]})` : ''}</span>
        <span className="rounded-full border border-line px-2.5 py-1">{CATEGORY_LABEL[f.category]}</span>
        <span className="rounded-full border border-line px-2.5 py-1">{f.process}</span>
        <span className="rounded-full border border-line px-2.5 py-1">{f.formats.join(' · ')}</span>
        <span className={cx('rounded-full border px-2.5 py-1', stale ? 'border-caution/50 text-caution' : f.status === 'current' ? 'border-ok/40 text-ok' : 'border-line text-muted')}>
          {statusLabel(f)}
        </span>
        <span className={cx('rounded-full border px-2.5 py-1', compat ? 'border-ok/40 text-ok' : 'border-critical/50 text-critical')}>
          {compat ? 'Fits AE-1 Program (35mm)' : 'Not 35mm: will not fit the AE-1'}
        </span>
      </div>
      <dl className="flex flex-col gap-3 text-[15px] leading-relaxed">
        {filmEducation(f).map((e, i) => (
          <div key={e.label + i}>
            <dt className="text-xs font-semibold uppercase tracking-[0.08em] text-muted">{e.label}</dt>
            <dd>{e.text}</dd>
          </div>
        ))}
        {f.notes?.map((n) => (
          <div key={n}>
            <dt className="text-xs font-semibold uppercase tracking-[0.08em] text-muted">Note</dt>
            <dd>{n}</dd>
          </div>
        ))}
        <div>
          <dt className="text-xs font-semibold uppercase tracking-[0.08em] text-muted">Source</dt>
          <dd className="text-muted">
            {f.reference === 'manufacturer datasheet'
              ? `${MANUFACTURERS[f.maker].name} technical datasheet.`
              : f.reference === 'manufacturer / seller listing'
                ? 'Manufacturer or seller product listing (limited technical data).'
                : 'Community documentation.'}{' '}
            {MANUFACTURERS[f.maker].note}
          </dd>
        </div>
      </dl>
      <div className="grid grid-cols-3 gap-2">
        <button type="button" onClick={() => dispatch({ type: 'favorite', filmId: f.id })} className={cx('min-h-12 rounded-full border text-sm font-semibold', fav ? 'border-accent text-accent' : 'border-line')}>
          {fav ? '★ Saved' : '☆ Favourite'}
        </button>
        <button type="button" onClick={() => dispatch({ type: 'compare', filmId: f.id })} className={cx('min-h-12 rounded-full border text-sm font-semibold', inCompare ? 'border-accent text-accent' : 'border-line')}>
          {inCompare ? 'In compare' : 'Compare'}
        </button>
        <button
          type="button"
          disabled={!isFilmCam || !compat || f.category === 'instant'}
          onClick={() => {
            dispatch({ type: 'film', filmId: f.id });
            if (state.subject && state.lighting && state.flash) dispatch({ type: 'step', step: 'result' });
            else dispatch({ type: 'tab', tab: 'shoot' });
            onUse();
          }}
          className="min-h-12 rounded-full bg-accent text-sm font-semibold text-accent-ink disabled:opacity-40"
        >
          Load this film
        </button>
      </div>
      {!isFilmCam && <p className="text-xs text-muted">Switch the camera to the AE-1 Program to load film.</p>}
    </div>
  );
}

function Compare() {
  const { state } = useStore();
  const films = state.compare.map((id) => FILM_BY_ID[id]!);
  if (!films.length) return <p className="text-sm text-muted">Add films with "Compare" in a film's details.</p>;
  const rows: [string, (f: FilmStock) => string][] = [
    ['Maker', (f) => MANUFACTURERS[f.maker].name],
    ['ISO', (f) => String(f.iso)],
    ['Type', (f) => CATEGORY_LABEL[f.category]],
    ['Process', (f) => f.process],
    ['Formats', (f) => f.formats.join(', ')],
    ['Grain', (f) => f.grain],
    ['Contrast', (f) => f.contrast],
    ['Saturation', (f) => f.saturation],
    ['Latitude', (f) => f.latitude],
    ['Flash', (f) => f.flash],
    ['Balance', (f) => f.balance],
    ['Status', (f) => statusLabel(f)],
  ];
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[420px] border-collapse text-sm">
        <thead>
          <tr>
            <th className="sticky left-0 bg-surface" />
            {films.map((f) => (
              <th key={f.id} className="px-2 pb-2 text-left font-display text-base font-semibold">
                {f.name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map(([label, get]) => (
            <tr key={label} className="border-t border-line">
              <th className="sticky left-0 bg-surface py-2 pr-3 text-left text-xs font-semibold uppercase tracking-[0.06em] text-muted">{label}</th>
              {films.map((f) => (
                <td key={f.id} className="px-2 py-2 capitalize tnum">
                  {get(f)}
                </td>
              ))}
            </tr>
          ))}
          <tr className="border-t border-line">
            <th className="sticky left-0 bg-surface py-2 pr-3 text-left text-xs font-semibold uppercase tracking-[0.06em] text-muted">Character</th>
            {films.map((f) => (
              <td key={f.id} className="px-2 py-2 align-top text-xs leading-snug text-fg/85">
                {f.character}
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  );
}
