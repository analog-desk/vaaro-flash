# Vaaro Flash

A mobile-first photography assistant for a **Canon AE-1 Program + Canon FD 35–70mm f/3.5–4.5** and a **Fujifilm X-T5**,
both with a **Godox iT32** flash. Pick what you're shooting, the light and whether you want flash, and you get
aperture, shutter, ISO/film, focal length, flash power and distance, plus one instruction.

React 19 · TypeScript (strict) · Tailwind CSS 4 · Lucide icons · Vite · Vitest.

## Run

```bash
npm install
npm run dev          # local dev server
npm test             # calculation + engine tests
npm run build        # production build → dist/
npm run build:single # one self-contained HTML file → dist-single/index.html
```

## On your phone

The app is published with GitHub Pages at **https://analog-desk.github.io/vaaro-flash/** and installs like an app
(home-screen icon, full screen, works offline after the first visit).

* **iPhone (Safari):** open the link → Share button → *Add to Home Screen* → Add.
* **Android (Chrome):** open the link → ⋮ menu → *Add to Home screen* / *Install app*.

To publish a new version: `npm run deploy` (builds the single-file app and pushes it to the `gh-pages` branch).
One-time setup on GitHub: *Settings → Pages → Build and deployment → Source: Deploy from a branch → `gh-pages` / root*.

## Structure

| Module | What it holds |
| --- | --- |
| `src/data/cameras.ts` | Camera specs (sync, shutter/aperture scales, ISO, crop, CoC) and lens specs |
| `src/data/flash.ts` | Godox iT32 spec (GN, power steps, tilt/rotate, sources), modifier loss estimates |
| `src/data/films.ts` | Film-stock catalogue (~150 stocks): type, process, formats, status, emulsion source, reciprocity |
| `src/data/manufacturers.ts` | 32 manufacturers / brands |
| `src/data/scenarios.ts` | Subject profiles, lighting profiles (EV estimates), subject×lighting combo notes |
| `src/data/styles.ts` | 14 creative directions as exposure parameters (bias, background offset, fill ratio…) |
| `src/data/lessons.ts` | Lessons, glossary, exercises, quiz |
| `src/lib/exposure.ts` | EV / aperture / shutter maths |
| `src/lib/flashcalc.ts` | Guide number, power, distance, ⅓-stop snapping, bounce geometry |
| `src/lib/dof.ts`, `reciprocity.ts` | Depth of field / hyperfocal, reciprocity correction |
| `src/lib/recommend.ts` | The recommendation engine (pure functions, no UI) |
| `src/lib/films.ts` | Film search / filter / derived education text |
| `src/state/store.tsx` | App state; session memory (camera, shot) + local memory (favourites, last film, GN) |
| `src/components`, `src/screens` | UI |

Add a film by adding one `film(...)` entry in `src/data/films.ts`; the library, picker, filters and suggestions pick it up.

## How the engine decides

1. **Scene brightness**: each lighting option has an estimated subject and background EV (ISO 100), shown as an
   assumption. You can override it with a slider or by entering your meter reading.
2. **Flash or not** ("Help me decide"): the app checks whether natural light gives a handholdable exposure at a
   sensible aperture. Backlit subjects get flash; dim scenes get flash for people, but a tripod for
   landscape/architecture/automotive, because a GN 18 flash only reaches a few metres.
3. **Ambient-led (fill)** in daylight: aperture and shutter expose the scene, with the shutter never faster than sync.
   The flash adds fill at the style's ratio.
   **Flash-led (key)** in dim light: aperture from the subject, shutter from how dark the style wants the background,
   clamped to sync and to what can be handheld while ambient on the subject stays ≥1.5 stops under the flash.
4. **Power** = (N × d / GN_iso)² × 2^loss × target, snapped to the iT32's ⅓-stop settings (1/1 … 1/128). The remaining
   error is reported. If full power can't reach, the distance is shortened, or a critical warning explains why.
5. **Limits enforced**: AE-1 sync 1/60 (faster overrides are rejected with a warning), X-T5 sync 1/250, the lens's
   maximum aperture per focal length, close focus, the shutter range, the ASA dial range, and film-type exposure bias caps.

## Specifications and their status

* **Godox iT32 GN 18** (m, ISO 100, full power) is from the Godox manual and retailer listings. The head does not zoom,
  and Godox does not publish its coverage angle. Ken Rockwell measured **≈GN 11.5**. Both are selectable, plus your own
  calibrated value, and every flash result warns that the rating is unconfirmed until you calibrate.
* **Canon FD 35–70**: f/3.5 at 35mm, f/4.5 at 70mm. In-between maximum apertures are not published, so the app uses f/4.5.
* **AE-1 Program**: 2 s–1/1000 s + B, X-sync 1/60, ASA 12–3200. **X-T5**: sync 1/250 (mechanical), ISO 125–12800.
* Light-loss figures for bounce (≈1.3 stops beyond path length), diffusers (≈1) and softboxes (≈1.7) are
  **estimates**, labelled as such.
* Film availability is a 2026 snapshot. Stocks whose specs or availability could not be confirmed are labelled
  "Availability unverified", and emulsion sources are marked "confirmed" or "widely reported".
