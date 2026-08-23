import { forecastPresenceXP, liveMultiplier } from './presence-forecast';

describe('forecastPresenceXP', () => {
  it('watching now vs fully-locked ceiling (no perks)', () => {
    // base 62, multiplier 1.0 → current 62, max = ceil(62 * 1.5) = 93
    expect(forecastPresenceXP({ baseXP: 62, multiplier: 1 })).toEqual({
      current: 62,
      maxIfLocked: 93,
    });
  });

  it('stacks additively with a perk multiplier', () => {
    // base 100, multiplier 1.4 → current ceil(140)=140, max ceil(100*(1.4+0.5))=190
    expect(forecastPresenceXP({ baseXP: 100, multiplier: 1.4 })).toEqual({
      current: 140,
      maxIfLocked: 190,
    });
  });
});

describe('liveMultiplier', () => {
  it('is the plain multiplier at 0% locked', () => {
    expect(
      liveMultiplier({
        multiplier: 1,
        lockedMs: 0,
        totalDurationMs: 30 * 60_000,
      })
    ).toBeCloseTo(1);
  });
  it('adds 0.5 × lockedFraction, clamped to [0,1]', () => {
    // 12 of 30 min locked → fraction 0.4 → +0.2 → 1.2 (with multiplier 1.0)
    expect(
      liveMultiplier({
        multiplier: 1,
        lockedMs: 12 * 60_000,
        totalDurationMs: 30 * 60_000,
      })
    ).toBeCloseTo(1.2);
  });
  it('caps at multiplier + 0.5 when fully (or over) locked', () => {
    expect(
      liveMultiplier({
        multiplier: 1.4,
        lockedMs: 60 * 60_000,
        totalDurationMs: 30 * 60_000,
      })
    ).toBeCloseTo(1.9);
  });
});
