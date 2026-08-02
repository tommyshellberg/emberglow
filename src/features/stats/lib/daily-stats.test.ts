import {
  aggregateDailyMinutes,
  formatMinutes,
  getWeeklySummary,
} from './daily-stats';

// Fixed reference: 2026-08-02 (Sunday) 12:00:00 LOCAL time. Constructed via
// Date parts (not an ISO string) so the test is timezone-independent.
const NOW = new Date(2026, 7, 2, 12, 0, 0).getTime();
const DAY_MS = 24 * 60 * 60 * 1000;

const quest = (stopTime: number | undefined, durationMinutes: number) => ({
  stopTime,
  durationMinutes,
});

describe('aggregateDailyMinutes', () => {
  it('returns exactly `days` zero-filled entries ending today', () => {
    const result = aggregateDailyMinutes([], 7, NOW);
    expect(result).toHaveLength(7);
    expect(result.every((d) => d.minutes === 0)).toBe(true);
    expect(result[6].isToday).toBe(true);
    expect(result[6].date).toBe('2026-08-02');
    expect(result[0].date).toBe('2026-07-27');
    // 2026-08-02 is a Sunday
    expect(result[6].dayInitial).toBe('S');
    expect(result[6].dayShort).toBe('Sun');
  });

  it('sums multiple quests on the same local day', () => {
    const todayMorning = new Date(2026, 7, 2, 9, 0).getTime();
    const todayEvening = new Date(2026, 7, 2, 20, 0).getTime();
    const result = aggregateDailyMinutes(
      [quest(todayMorning, 30), quest(todayEvening, 15)],
      7,
      NOW
    );
    expect(result[6].minutes).toBe(45);
  });

  it('buckets by LOCAL calendar day across midnight', () => {
    const justBeforeMidnight = new Date(2026, 7, 1, 23, 58).getTime();
    const justAfterMidnight = new Date(2026, 7, 2, 0, 2).getTime();
    const result = aggregateDailyMinutes(
      [quest(justBeforeMidnight, 20), quest(justAfterMidnight, 10)],
      7,
      NOW
    );
    expect(result[5].minutes).toBe(20); // Aug 1
    expect(result[6].minutes).toBe(10); // Aug 2
  });

  it('excludes quests outside the window and quests without stopTime', () => {
    const eightDaysAgo = NOW - 8 * DAY_MS;
    const result = aggregateDailyMinutes(
      [quest(eightDaysAgo, 60), quest(undefined, 60)],
      7,
      NOW
    );
    expect(result.every((d) => d.minutes === 0)).toBe(true);
  });
});

describe('getWeeklySummary', () => {
  it('totals minutes and finds the best day', () => {
    const stats = aggregateDailyMinutes(
      [
        quest(new Date(2026, 7, 1, 10, 0).getTime(), 50),
        quest(new Date(2026, 7, 2, 10, 0).getTime(), 20),
      ],
      7,
      NOW
    );
    const summary = getWeeklySummary(stats);
    expect(summary.totalMinutes).toBe(70);
    expect(summary.bestDay?.date).toBe('2026-08-01');
  });

  it('returns bestDay null for an all-zero week', () => {
    const summary = getWeeklySummary(aggregateDailyMinutes([], 7, NOW));
    expect(summary.totalMinutes).toBe(0);
    expect(summary.bestDay).toBeNull();
  });
});

describe('formatMinutes', () => {
  it('formats sub-hour, exact-hour, and mixed values', () => {
    expect(formatMinutes(45)).toBe('45m');
    expect(formatMinutes(120)).toBe('2h');
    expect(formatMinutes(125)).toBe('2h 5m');
    expect(formatMinutes(0)).toBe('0m');
  });
});
