import { localCalendarDaysBetween } from '@/store/character-store';

import { DAY_NAMES, STREAK } from './streak-celebration.constants';

export interface StreakDay {
  name: string;
  isCompleted: boolean;
  isToday: boolean;
  /** Today, and today's quest is not done yet. */
  isPending: boolean;
}

/**
 * Seven days ending today. The lit run is `min(streak, 7)` days ending on the
 * local date of the last completed quest, so opening the screen before
 * today's quest does not light today.
 */
export function generateStreakVisualization(
  dailyQuestStreak: number,
  lastCompletedQuestTimestamp: number | null,
  now: number = Date.now()
): StreakDay[] {
  const days = STREAK.DAYS_TO_SHOW;
  const todayIndex = days - 1;
  const daysSinceLast =
    lastCompletedQuestTimestamp === null
      ? Number.POSITIVE_INFINITY
      : Math.max(0, localCalendarDaysBetween(lastCompletedQuestTimestamp, now));
  const lastLitIndex = todayIndex - daysSinceLast; // may be negative
  const litCount = Math.max(0, Math.min(dailyQuestStreak, days));
  const firstLitIndex = lastLitIndex - litCount + 1;

  const todayDow = new Date(now).getDay();
  const streakDays: StreakDay[] = [];
  for (let i = 0; i < days; i++) {
    const offsetFromToday = todayIndex - i;
    const dayIndex =
      (((todayDow - offsetFromToday) % DAY_NAMES.length) + DAY_NAMES.length) %
      DAY_NAMES.length;
    const isCompleted = litCount > 0 && i >= firstLitIndex && i <= lastLitIndex;
    streakDays.push({
      name: DAY_NAMES[dayIndex],
      isCompleted,
      isToday: i === todayIndex,
      isPending: i === todayIndex && daysSinceLast > 0,
    });
  }
  return streakDays;
}
