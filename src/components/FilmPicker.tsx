import { useMemo, useState } from 'react';
import { Search, Star } from 'lucide-react';
import { FILM_BY_ID, ISO_SCALE, type FilmStock } from '../data/films';
import { DEFAULT_FILTERS, filmTitle, filterFilms, statusLabel, typeLine } from '../lib/films';
import { suggestFilms } from '../lib/recommend';
import { useStore } from '../state/store';
import { Chip, ChipRow, FieldLabel, NumberInput, cx } from './ui';

export function FilmRow({ f, onPick, active }: { f: FilmStock; onPick: () => void; active?: boolean }) {
  const { state, dispatch } = useStore();
  const fav = state.favorites.includes(f.id);
  const stale = f.status === 'discontinued' || f.status === 'historical';
  return (
    <div className={cx('flex items-stretch rounded-xl border', active ? 'border-accent bg-accent/10' : 'border-line bg-surface')}>
      <button type="button" onClick={onPick} className="flex min-h-14 min-w-0 flex-1 items-center gap-3 px-3 py-2 text-left">
        <span className="flex w-12 shrink-0 flex-col items-center rounded-md border border-line-strong py-1">
          <span className="font-display text-lg font-semibold leading-none tnum">{f.iso}</span>
          <span className="text-[9px] font-semibold uppercase tracking-wider text-muted">ISO</span>
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[15px] font-semibold">{filmTitle(f)}</span>
          <span className="block truncate text-xs text-muted">
            {typeLine(f)}
            {f.status !== 'current' && <span className={stale ? 'text-caution' : ''}> · {statusLabel(f)}</span>}
          </span>
        </span>
      </button>
      <button
        type="button"
        onClick={() => dispatch({ type: 'favorite', filmId: f.id })}
        aria-label={fav ? `Remove ${f.name} from favourites` : `Add ${f.name} to favourites`}
        aria-pressed={fav}
        className="flex w-12 items-center justify-center text-muted"
      >
        <Star size={18} className={fav ? 'fill-accent text-accent' : ''} />
      </button>
    </div>
  );
}

/** Fast film picker for the shooting flow. Only shows 35mm films for the AE-1 Program. */
export function FilmPicker({ onPicked }: { onPicked: () => void }) {
  const { state, dispatch } = useStore();
  const [q, setQ] = useState('');
  const [customIso, setCustomIso] = useState<number | undefined>(state.customIso);
  const results = useMemo(() => (q.trim() ? filterFilms({ ...DEFAULT_FILTERS, query: q }, state.favorites).slice(0, 30) : []), [q, state.favorites]);
  const suggested = useMemo(
    () => (state.subject && state.lighting ? suggestFilms({ subject: state.subject, lighting: state.lighting, style: state.style, flash: state.flash ?? 'auto' }) : []),
    [state.subject, state.lighting, state.style, state.flash],
  );
  const favorites = state.favorites.map((id) => FILM_BY_ID[id]!).filter((f) => f.formats.includes('135'));
  const recent = state.recentFilms
    .map((id) => FILM_BY_ID[id]!)
    .filter((f) => f.formats.includes('135') && !state.favorites.includes(f.id))
    .slice(0, 4);
  const pick = (id: string) => {
    dispatch({ type: 'film', filmId: id, advance: true });
    onPicked();
  };

  return (
    <div className="flex flex-col gap-5">
      <label className="flex min-h-12 items-center gap-2 rounded-xl border border-line bg-bg px-3 focus-within:border-accent">
        <Search size={18} className="text-muted" aria-hidden />
        <input
          id="film-quick-search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search films: portra, hp5, 800…"
          className="min-h-11 flex-1 bg-transparent text-base outline-none placeholder:text-dim"
          aria-label="Search films"
        />
      </label>

      {q.trim() ? (
        <div className="flex flex-col gap-2">
          {results.length === 0 && <p className="text-sm text-muted">No 35mm film matches "{q}". Try a brand or ISO, or enter the ISO below.</p>}
          {results.map((f) => (
            <FilmRow key={f.id} f={f} onPick={() => pick(f.id)} active={state.filmId === f.id} />
          ))}
        </div>
      ) : (
        <>
          {(favorites.length > 0 || recent.length > 0) && (
            <div>
              <FieldLabel>Your films</FieldLabel>
              <div className="flex flex-col gap-2">
                {[...favorites, ...recent].map((f) => (
                  <FilmRow key={f.id} f={f} onPick={() => pick(f.id)} active={state.filmId === f.id} />
                ))}
              </div>
            </div>
          )}
          {suggested.length > 0 && (
            <div>
              <FieldLabel hint="for this shot">Suggested</FieldLabel>
              <div className="flex flex-col gap-2">
                {suggested.map((f) => (
                  <FilmRow key={f.id} f={f} onPick={() => pick(f.id)} active={state.filmId === f.id} />
                ))}
              </div>
            </div>
          )}
        </>
      )}

      <div>
        <FieldLabel hint="no stock needed">Or just set the box speed</FieldLabel>
        <ChipRow>
          {[100, 200, 400, 800, 1600, 3200, ...ISO_SCALE.filter((i) => ![100, 200, 400, 800, 1600, 3200].includes(i))].map((iso) => (
            <Chip
              key={iso}
              active={!state.filmId && state.customIso === iso}
              onClick={() => {
                dispatch({ type: 'film', filmId: undefined, customIso: iso, advance: true });
                onPicked();
              }}
            >
              {iso}
            </Chip>
          ))}
        </ChipRow>
        <div className="mt-3 flex items-end gap-3">
          <NumberInput id="custom-iso" label="Custom ISO" value={customIso} onChange={setCustomIso} min={1} max={6400} placeholder="e.g. 3" suffix="ISO" />
          <button
            type="button"
            disabled={customIso === undefined}
            onClick={() => {
              if (customIso === undefined) return;
              dispatch({ type: 'film', filmId: undefined, customIso, advance: true });
              onPicked();
            }}
            className="min-h-11 rounded-full border border-line px-4 text-sm font-semibold disabled:opacity-40"
          >
            Use ISO
          </button>
        </div>
      </div>
    </div>
  );
}
