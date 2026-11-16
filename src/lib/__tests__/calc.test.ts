import { describe, expect, it } from 'vitest';
import { apertureFor, exposureStops, settingsEv100, shutterFor } from '../exposure';
import { distanceFor, gnAtIso, gnAtPower, requiredPower, snapPower, ceilingBounce, powerLabel } from '../flashcalc';
import { depthOfField, hyperfocalM } from '../dof';
import { correctReciprocity } from '../reciprocity';
import { recommend, type ShotInput } from '../recommend';
import { fmtShutter } from '../format';
import { FILMS } from '../../data/films';

describe('exposure', () => {
  it('sunny 16: f/16 at 1/100 for ISO 100 is about EV 15', () => {
    expect(settingsEv100(16, 1 / 100, 100)).toBeCloseTo(14.64, 1);
    expect(shutterFor(16, 15, 100)).toBeCloseTo(1 / 128, 4);
    expect(apertureFor(1 / 125, 15, 100)).toBeCloseTo(16.19, 1);
  });
  it('ISO shifts EV by log2', () => {
    expect(settingsEv100(8, 1 / 125, 400)).toBeCloseTo(settingsEv100(8, 1 / 125, 100) - 2, 5);
    expect(exposureStops(12, 4, 1 / 60, 100)).toBeCloseTo(12 - Math.log2(16 * 60), 5);
  });
});

describe('flash', () => {
  it('GN scales with √ISO and √power', () => {
    expect(gnAtIso(18, 100, 400)).toBeCloseTo(36, 6);
    expect(gnAtPower(36, 1 / 4)).toBeCloseTo(18, 6);
  });
  it('GN = aperture × distance at full power', () => {
    expect(requiredPower(9, 2, 18)).toBeCloseTo(1, 6);
    expect(distanceFor(4.5, 18)).toBeCloseTo(4, 6);
  });
  it('required power at f/8, 2 m, ISO 400 = (16/36)² ≈ 0.198', () => {
    expect(requiredPower(8, 2, 36)).toBeCloseTo(0.1975, 3);
  });
  it('snaps to 1/3 steps and labels like the Godox display', () => {
    const p = snapPower(0.1975);
    expect(p.label).toBe('1/8 +0.7');
    expect(Math.abs(p.errorStops)).toBeLessThan(0.17);
    expect(powerLabel(-3 + 1 / 3)).toBe('1/8 +0.3');
    expect(powerLabel(-3 + 2 / 3)).toBe('1/8 +0.7');
    expect(snapPower(2).limit).toBe('under');
    expect(snapPower(1 / 400).limit).toBe('over');
  });
  it('one stop of loss needs twice the power', () => {
    expect(requiredPower(4, 2, 36, 1)).toBeCloseTo(2 * requiredPower(4, 2, 36), 6);
  });
  it('ceiling bounce path is longer than direct', () => {
    const g = ceilingBounce(2, 2.6);
    expect(g.pathM).toBeCloseTo(2 * Math.sqrt(1 + 1), 4);
    expect(g.tiltDeg).toBeCloseTo(45, 0);
  });
});

describe('depth of field', () => {
  it('hyperfocal 35mm f/8 CoC 0.03 ≈ 5.1 m', () => {
    expect(hyperfocalM(35, 8, 0.03)).toBeCloseTo(5.14, 1);
    const d = depthOfField(35, 8, 0.03, 5.14);
    expect(d.farM).toBe(Infinity);
    expect(d.nearM).toBeCloseTo(2.57, 1);
  });
});

describe('reciprocity', () => {
  it('Harman formula', () => {
    expect(correctReciprocity(10, { kind: 'schwarzschild', p: 1.31 }, 'HP5').correctedS).toBeCloseTo(20.4, 0);
  });
  it('no correction under 1 s', () => {
    expect(correctReciprocity(0.5, { kind: 'schwarzschild', p: 1.31 }, 'HP5').correctedS).toBe(0.5);
  });
});

const base: ShotInput = { camera: 'ae1p', subject: 'portrait', lighting: 'night', flash: 'direct', style: 'natural', units: 'm', gnSource: 'rated', filmId: 'kodak-portra-400' };

describe('recommendation engine', () => {
  it('never recommends faster than 1/60 with flash on the AE-1', () => {
    for (const lighting of ['sunny', 'overcast', 'golden', 'backlit', 'night', 'indoor', 'window'] as const)
      for (const flash of ['direct', 'bounce', 'offcamera'] as const) {
        const r = recommend({ ...base, lighting, flash });
        expect(r.shutter.value).toBeGreaterThanOrEqual(1 / 60 - 1e-9);
      }
  });
  it('overrides faster than sync are rejected with a critical warning', () => {
    const r = recommend({ ...base, shutter: 1 / 250 });
    expect(r.shutter.value).toBeCloseTo(1 / 60, 6);
    expect(r.warnings.some((w) => w.level === 'critical' && /sync/.test(w.text))).toBe(true);
  });
  it('respects maximum aperture at 70mm', () => {
    const r = recommend({ ...base, focal: 70, aperture: 3.5 });
    expect(r.aperture.value).toBeGreaterThanOrEqual(4.5);
  });
  it('X-T5 respects 1/250 sync', () => {
    const r = recommend({ ...base, camera: 'xt5', filmId: undefined, lighting: 'sunny', flash: 'direct' });
    expect(r.shutter.value).toBeGreaterThanOrEqual(1 / 250 - 1e-9);
  });
  it('auto decides no flash in open shade portrait', () => {
    const r = recommend({ ...base, lighting: 'overcast', flash: 'auto' });
    expect(r.flash.on).toBe(false);
  });
  it('auto decides flash for indoor portrait', () => {
    const r = recommend({ ...base, lighting: 'indoor', flash: 'auto' });
    expect(r.flash.on).toBe(true);
    expect(r.flash.technique).toBe('bounce');
  });
  it('different combos give different results', () => {
    const a = recommend({ ...base, lighting: 'golden', flash: 'direct', style: 'natural' });
    const b = recommend({ ...base, subject: 'street', lighting: 'night', flash: 'direct', style: 'direct90s', filmId: 'kodak-gold-200' });
    expect(a.copyText).not.toBe(b.copyText);
  });
  it('film ids are unique', () => {
    expect(new Set(FILMS.map((f) => f.id)).size).toBe(FILMS.length);
  });
  it('power is consistent with GN formula', () => {
    const r = recommend({ ...base, lighting: 'verydark', style: 'direct90s', aperture: 8, distanceM: 2 });
    // iso 400 -> GN 36; (8*2/36)^2 = 0.1975 × target(≈1) → 1/4 area
    expect(r.flash.power!.fraction).toBeGreaterThan(0.12);
    expect(r.flash.power!.fraction).toBeLessThan(0.3);
  });
});

describe('format', () => {
  it('formats shutter', () => {
    expect(fmtShutter(1 / 60)).toBe('1/60');
    expect(fmtShutter(2)).toBe('2 s');
    expect(fmtShutter(1 / 2.5)).toBe('1/2.5');
  });
});

describe('X-T5 with XF 23mm f/2.8', () => {
  const xt: ShotInput = { camera: 'xt5', lensId: 'xf23-2.8', subject: 'portrait', lighting: 'indoor', flash: 'bounce', style: 'natural', units: 'm', gnSource: 'rated' };
  it('uses 23mm and stays within f/2.8–f/16', () => {
    for (const lighting of ['sunny', 'indoor', 'night', 'blue', 'verydark'] as const)
      for (const flash of ['none', 'direct', 'bounce', 'auto'] as const) {
        const r = recommend({ ...xt, lighting, flash });
        expect(r.focal.value).toBe(23);
        expect(r.aperture.value).toBeGreaterThanOrEqual(2.8);
        expect(r.aperture.value).toBeLessThanOrEqual(16);
        if (r.flash.on) expect(r.shutter.value).toBeGreaterThanOrEqual(1 / 250 - 1e-9);
      }
  });
  it('explains the prime for portraits', () => {
    const r = recommend(xt);
    expect(r.focal.note).toContain('35mm');
    expect(r.why.some((w) => w.includes('wide for faces'))).toBe(true);
  });
});

describe('feet', () => {
  it('converts prose distances', async () => {
    const { localizeText, fmtDistance } = await import('../format');
    expect(localizeText('Stand 2 m away, 1.5–3 m is fine, 35mm lens', 'ft')).toBe('Stand 6.5 ft away, 5–10 ft is fine, 35mm lens');
    expect(localizeText('2 m', 'm')).toBe('2 m');
    expect(fmtDistance(2, 'ft')).toBe('6.6 ft');
    expect(fmtDistance(0.2, 'ft')).toBe('8 in');
  });
  it('engine output has no metre distances in feet mode', () => {
    const r = recommend({ ...base, units: 'ft', flash: 'bounce', lighting: 'indoor' });
    const all = [r.instruction, ...r.warnings.map((w) => w.text), ...r.why, ...r.technique, ...r.example, ...r.assumptions, ...r.creative, ...r.calc.map((c) => c.formula + c.result), r.copyText, r.focus.zone].join(' | ');
    expect(all).not.toMatch(/\d\s?m\b(?!m)/);
    expect(r.flash.distance!.display).toMatch(/ft$/);
  });
});
