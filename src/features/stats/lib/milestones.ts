export const MILESTONE_HOURS: readonly number[] = [
  1, 3, 6, 12, 24, 48, 100, 250, 500, 1000,
];

// Endowed-progress floor (Kivetz et al. 2006): once the user has any minutes,
// the bar must show a visible sliver — never 0%.
export const MIN_FILL_FRACTION = 0.04;

export type MilestoneProgress = {
  prevMinutes: number;
  nextMinutes: number | null;
  fraction: number;
  label: string;
};

function hoursLabel(hours: number): string {
  return hours === 1 ? '1 hour' : `${hours.toLocaleString('en-US')} hours`;
}

export function getMilestoneProgress(totalMinutes: number): MilestoneProgress {
  const next = MILESTONE_HOURS.find((h) => h * 60 > totalMinutes);

  if (next === undefined) {
    const totalHours = Math.floor(totalMinutes / 60);
    return {
      prevMinutes: MILESTONE_HOURS[MILESTONE_HOURS.length - 1] * 60,
      nextMinutes: null,
      fraction: 1,
      label: `${hoursLabel(totalHours)} reclaimed`,
    };
  }

  const nextIndex = MILESTONE_HOURS.indexOf(next);
  const prevMinutes = nextIndex === 0 ? 0 : MILESTONE_HOURS[nextIndex - 1] * 60;
  const nextMinutes = next * 60;
  const rawFraction = (totalMinutes - prevMinutes) / (nextMinutes - prevMinutes);
  const fraction =
    totalMinutes > 0 ? Math.max(rawFraction, MIN_FILL_FRACTION) : 0;

  return {
    prevMinutes,
    nextMinutes,
    fraction,
    label: `Next: ${hoursLabel(next)} reclaimed`,
  };
}
