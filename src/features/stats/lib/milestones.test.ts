import { getMilestoneProgress, MIN_FILL_FRACTION } from './milestones';

describe('getMilestoneProgress', () => {
  it('starts in the first segment with singular hour label', () => {
    const p = getMilestoneProgress(30); // 30 min toward 1 hour
    expect(p.prevMinutes).toBe(0);
    expect(p.nextMinutes).toBe(60);
    expect(p.fraction).toBeCloseTo(0.5);
    expect(p.label).toBe('Next: 1 hour reclaimed');
  });

  it('reaching a milestone advances to the next segment', () => {
    const p = getMilestoneProgress(60); // exactly 1 hour
    expect(p.prevMinutes).toBe(60);
    expect(p.nextMinutes).toBe(180);
    expect(p.fraction).toBe(MIN_FILL_FRACTION); // 0 real progress into segment, endowed
    expect(p.label).toBe('Next: 3 hours reclaimed');
  });

  it('computes fraction within a mid-ladder segment', () => {
    // segment 12h (720) -> 24h (1440); 1080 min is halfway
    const p = getMilestoneProgress(1080);
    expect(p.prevMinutes).toBe(720);
    expect(p.nextMinutes).toBe(1440);
    expect(p.fraction).toBeCloseTo(0.5);
    expect(p.label).toBe('Next: 24 hours reclaimed');
  });

  it('endowed progress: fraction never below MIN_FILL_FRACTION when total > 0', () => {
    const p = getMilestoneProgress(1); // 1 minute of 60
    expect(p.fraction).toBe(MIN_FILL_FRACTION);
  });

  it('endowed progress does NOT apply at zero', () => {
    const p = getMilestoneProgress(0);
    expect(p.fraction).toBe(0);
  });

  it('fraction is not clamped when real progress exceeds the minimum', () => {
    const p = getMilestoneProgress(45); // 0.75 of first hour
    expect(p.fraction).toBeCloseTo(0.75);
  });

  it('past the final milestone: full bar, hour-count label, null next', () => {
    const p = getMilestoneProgress(63000); // 1050 hours, past 1000h
    expect(p.nextMinutes).toBeNull();
    expect(p.fraction).toBe(1);
    expect(p.label).toBe('1,050 hours reclaimed');
  });
});
