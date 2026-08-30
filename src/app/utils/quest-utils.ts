export const calculateRewardFromDuration = (duration: number) => {
  return duration * 3;
};

export const getQuestDuration = (questNumber: number): number => {
  if (questNumber < 1 || questNumber > 60) return 0;

  if (questNumber >= 1 && questNumber <= 5) {
    return Math.round(2 + questNumber); // 3–7 minutes
  }

  if (questNumber >= 6 && questNumber <= 56) {
    const start = 8; // duration at quest 6
    const end = 90; // duration at quest 56
    const steps = 51; // 56 - 6 + 1
    const slope = (end - start) / (steps - 1); // = 82 / 50 = 1.64
    return Math.round(start + (questNumber - 6) * slope);
  }

  if (questNumber >= 57 && questNumber <= 59) {
    return 90; // plateau before final boss
  }

  if (questNumber === 60) {
    return 120; // final quest
  }

  return 0;
};

/**
 * Hold Out mode reward curve - client-side mirror of the server's
 * `src/utils/holdout-curve.js`. Used only for optimistic local display and
 * local XP grant; the server computes the persisted reward from its own
 * timestamps. Keep the constants identical to the server file.
 * 3 XP/min for minutes 1-60, 1 XP/min for 61-240, nothing past 240
 * (max 360 XP - equal to the 120-minute story finale).
 */
export const HOLDOUT_MIN_MINUTES = 10;
export const HOLDOUT_FULL_RATE_MINUTES = 60;
export const HOLDOUT_CAP_MINUTES = 240;

export const clampHoldoutMinutes = (minutes: number): number =>
  Math.min(Math.max(Math.floor(minutes), 0), HOLDOUT_CAP_MINUTES);

export const calculateHoldoutXP = (minutes: number): number => {
  const counted = clampHoldoutMinutes(minutes);
  const fullRateMinutes = Math.min(counted, HOLDOUT_FULL_RATE_MINUTES);
  const reducedRateMinutes = Math.max(counted - HOLDOUT_FULL_RATE_MINUTES, 0);
  return fullRateMinutes * 3 + reducedRateMinutes * 1;
};
