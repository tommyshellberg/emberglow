export type ReminderTimeValue = { hour: number; minute: number };

const EARLIEST_MINUTES = 7 * 60; // 07:00
const LATEST_MINUTES = 21 * 60 + 30; // 21:30
const FALLBACK: ReminderTimeValue = { hour: 19, minute: 30 };

/**
 * Default reminder time for the opt-in prompt: the current time rounded to the
 * nearest 15 minutes, if it lands in the 07:00–21:30 window (the user just
 * proved they're free at this hour). Odd hours get a calm-evening fallback.
 */
export function getDefaultReminderTime(now: Date): ReminderTimeValue {
  const totalMinutes = now.getHours() * 60 + now.getMinutes();
  const rounded = Math.round(totalMinutes / 15) * 15;
  if (rounded < EARLIEST_MINUTES || rounded > LATEST_MINUTES) {
    return FALLBACK;
  }
  return { hour: Math.floor(rounded / 60), minute: rounded % 60 };
}
