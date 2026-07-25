import { DAY_NAMES, STREAK } from './streak-celebration.constants';

export interface StreakDay {
  name: string;
  isCompleted: boolean;
  isToday: boolean;
}

/**
 * Generates a full-week (7-day) streak visualization ending today.
 *
 * The 7 days shown are always the current calendar week ending today,
 * regardless of streak length. Days are lit right-to-left from today,
 * i.e. the rightmost `min(streak, 7)` days are lit — equivalently,
 * ignition proceeds left-to-right starting from `firstLit`:
 *
 *   firstLit = DAYS_TO_SHOW - min(streak, DAYS_TO_SHOW)
 *
 * @param dailyQuestStreak - Current streak count
 * @returns Array of 7 StreakDay objects representing the visualization
 */
export function generateStreakVisualization(
  dailyQuestStreak: number
): StreakDay[] {
  const today = new Date().getDay();
  const litCount = Math.max(0, Math.min(dailyQuestStreak, STREAK.DAYS_TO_SHOW));
  const firstLit = STREAK.DAYS_TO_SHOW - litCount;

  const streakDays: StreakDay[] = [];
  for (let i = 0; i < STREAK.DAYS_TO_SHOW; i++) {
    const offsetFromToday = STREAK.DAYS_TO_SHOW - 1 - i;
    const dayIndex =
      (((today - offsetFromToday) % DAY_NAMES.length) + DAY_NAMES.length) %
      DAY_NAMES.length;

    streakDays.push({
      name: DAY_NAMES[dayIndex],
      isCompleted: i >= firstLit,
      isToday: i === STREAK.DAYS_TO_SHOW - 1,
    });
  }

  return streakDays;
}

/**
 * Calculates if a streak is still active based on last completion timestamp.
 *
 * @param lastCompletedQuestTimestamp - Timestamp of last completed quest
 * @returns true if streak is still active (within 24 hours), false otherwise
 */
export function isStreakActive(
  lastCompletedQuestTimestamp: number | null
): boolean {
  if (!lastCompletedQuestTimestamp) {
    return false;
  }

  return Date.now() - lastCompletedQuestTimestamp < STREAK.MILLISECONDS_IN_DAY;
}
