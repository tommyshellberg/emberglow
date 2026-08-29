import { DAY_NAMES, STREAK } from './streak-celebration.constants';
import {
  generateStreakVisualization,
  isStreakActive,
} from './streak-visualization.util';

// Pin "today" to Wednesday (day index 3) so all tests are deterministic.
const WEDNESDAY = 3;

beforeEach(() => {
  jest.useFakeTimers();
  // Set the clock to a Wednesday at noon UTC.
  jest.setSystemTime(new Date('2024-01-17T12:00:00Z')); // 2024-01-17 is a Wednesday
});

afterEach(() => {
  jest.useRealTimers();
});

describe('generateStreakVisualization', () => {
  describe('0-day streak', () => {
    it('returns 5 days starting from today with none completed', () => {
      const result = generateStreakVisualization(0);

      expect(result).toHaveLength(STREAK.DAYS_TO_SHOW);
      expect(result.every((d) => !d.isCompleted)).toBe(true);
    });

    it('marks only the first entry as today', () => {
      const result = generateStreakVisualization(0);

      expect(result[0].isToday).toBe(true);
      expect(result.slice(1).every((d) => !d.isToday)).toBe(true);
    });

    it('starts from the actual current day', () => {
      const result = generateStreakVisualization(0);
      const todayIndex = new Date().getDay();

      expect(result[0].name).toBe(DAY_NAMES[todayIndex]);
    });

    it('wraps day names correctly past Saturday', () => {
      // Set today to Saturday (day 6) so day 4 of the 5-day window wraps to Monday (1).
      jest.setSystemTime(new Date('2024-01-20T12:00:00Z')); // Saturday
      const result = generateStreakVisualization(0);

      expect(result[0].name).toBe('Sa');
      expect(result[1].name).toBe('Su');
      expect(result[2].name).toBe('Mo');
      expect(result[3].name).toBe('Tu');
      expect(result[4].name).toBe('We');
    });
  });

  describe('1-4 day streak (partial view)', () => {
    it('marks the correct number of leading days as completed', () => {
      for (let streak = 1; streak <= 4; streak++) {
        const result = generateStreakVisualization(streak);

        const completedCount = result.filter((d) => d.isCompleted).length;
        expect(completedCount).toBe(streak);
      }
    });

    it('marks today correctly within the partial streak window', () => {
      // 2-day streak on a Wednesday: Tu(completed), We(today+completed), Th, Fr, Sa
      const result = generateStreakVisualization(2);
      const todayEntry = result.find((d) => d.isToday);

      expect(todayEntry).toBeDefined();
      expect(todayEntry!.isCompleted).toBe(true);
      expect(todayEntry!.name).toBe('We');
    });

    it('places completed days before today and empty days after', () => {
      const streak = 3;
      const result = generateStreakVisualization(streak);

      // First <streak> entries are completed; the rest are not.
      result.slice(0, streak).forEach((d) => expect(d.isCompleted).toBe(true));
      result.slice(streak).forEach((d) => expect(d.isCompleted).toBe(false));
    });

    it('always returns exactly 5 entries', () => {
      [1, 2, 3, 4].forEach((streak) => {
        expect(generateStreakVisualization(streak)).toHaveLength(
          STREAK.DAYS_TO_SHOW
        );
      });
    });
  });

  describe('5+ day streak (full view)', () => {
    it('marks all 5 days as completed', () => {
      [5, 6, 10, 30].forEach((streak) => {
        const result = generateStreakVisualization(streak);
        expect(result.every((d) => d.isCompleted)).toBe(true);
      });
    });

    it('marks only the last entry as today', () => {
      const result = generateStreakVisualization(5);

      expect(result[result.length - 1].isToday).toBe(true);
      expect(result.slice(0, -1).every((d) => !d.isToday)).toBe(true);
    });

    it('ends on the current day of the week', () => {
      const result = generateStreakVisualization(7);
      const todayIndex = new Date().getDay();

      expect(result[result.length - 1].name).toBe(DAY_NAMES[todayIndex]);
    });

    it('wraps backwards correctly when streak window crosses Sunday→Saturday boundary', () => {
      // Set today to Tuesday (day 2): window should be Fr, Sa, Su, Mo, Tu — all completed.
      jest.setSystemTime(new Date('2024-01-16T12:00:00Z')); // Tuesday
      const result = generateStreakVisualization(5);

      expect(result.map((d) => d.name)).toEqual(['Fr', 'Sa', 'Su', 'Mo', 'Tu']);
      expect(result.every((d) => d.isCompleted)).toBe(true);
    });
  });
});

describe('isStreakActive', () => {
  it('returns false when timestamp is null', () => {
    expect(isStreakActive(null)).toBe(false);
  });

  it('returns false when timestamp is 0 (falsy)', () => {
    expect(isStreakActive(0)).toBe(false);
  });

  it('returns true when last completion was less than 24 hours ago', () => {
    const oneHourAgo = Date.now() - 60 * 60 * 1000;
    expect(isStreakActive(oneHourAgo)).toBe(true);
  });

  it('returns true when last completion was exactly 23h59m59s ago', () => {
    const justUnder24h = Date.now() - (STREAK.MILLISECONDS_IN_DAY - 1000);
    expect(isStreakActive(justUnder24h)).toBe(true);
  });

  it('returns false when last completion was exactly 24 hours ago', () => {
    const exactly24h = Date.now() - STREAK.MILLISECONDS_IN_DAY;
    expect(isStreakActive(exactly24h)).toBe(false);
  });

  it('returns false when last completion was more than 24 hours ago', () => {
    const twoDaysAgo = Date.now() - 2 * STREAK.MILLISECONDS_IN_DAY;
    expect(isStreakActive(twoDaysAgo)).toBe(false);
  });

  it('returns true when last completion was just now', () => {
    expect(isStreakActive(Date.now())).toBe(true);
  });
});
