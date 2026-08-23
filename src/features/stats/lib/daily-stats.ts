import type { Quest } from '@/store/types';

export type DailyStat = {
  date: string; // 'YYYY-MM-DD', device-local calendar day
  dayInitial: string;
  dayShort: string;
  minutes: number;
  isToday: boolean;
};

const DAY_INITIALS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const DAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function toLocalDateKey(timestamp: number): string {
  const d = new Date(timestamp);
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${month}-${day}`;
}

export function aggregateDailyMinutes(
  quests: Pick<Quest, 'stopTime' | 'durationMinutes'>[],
  days: number,
  now: number
): DailyStat[] {
  const minutesByDay = new Map<string, number>();
  for (const q of quests) {
    if (q.stopTime == null) continue;
    const key = toLocalDateKey(q.stopTime);
    minutesByDay.set(key, (minutesByDay.get(key) ?? 0) + q.durationMinutes);
  }

  const result: DailyStat[] = [];
  for (let i = days - 1; i >= 0; i--) {
    // Date arithmetic via setDate handles month boundaries and DST shifts;
    // subtracting i * 86400000 from a timestamp does not.
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const key = toLocalDateKey(d.getTime());
    result.push({
      date: key,
      dayInitial: DAY_INITIALS[d.getDay()],
      dayShort: DAY_SHORT[d.getDay()],
      minutes: minutesByDay.get(key) ?? 0,
      isToday: i === 0,
    });
  }
  return result;
}

export function getWeeklySummary(stats: DailyStat[]): {
  totalMinutes: number;
  bestDay: DailyStat | null;
} {
  const totalMinutes = stats.reduce((sum, s) => sum + s.minutes, 0);
  let bestDay: DailyStat | null = null;
  for (const s of stats) {
    if (s.minutes > 0 && (bestDay === null || s.minutes > bestDay.minutes)) {
      bestDay = s;
    }
  }
  return { totalMinutes, bestDay };
}

export function formatMinutes(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest === 0 ? `${hours}h` : `${hours}h ${rest}m`;
}

// Shared between WeeklyActivityChart (its own accessibilityLabel) and
// WeeklyActivityCard (the outer Pressable's accessibilityLabel) so the two
// stay worded identically — see weekly-activity-card.tsx for why the card
// needs its own copy of this string rather than relying on the chart's.
export function getWeeklyActivityLabel(stats: DailyStat[]): string {
  const { totalMinutes, bestDay } = getWeeklySummary(stats);
  if (totalMinutes === 0) return 'No quest time this week yet';
  const activeDays = stats.filter((s) => s.minutes > 0).length;
  const dayNoun = activeDays === 1 ? 'day' : 'days';
  return (
    `${formatMinutes(totalMinutes)} across ${activeDays} ${dayNoun} this week` +
    (bestDay ? `, best day ${bestDay.dayShort}` : '')
  );
}
