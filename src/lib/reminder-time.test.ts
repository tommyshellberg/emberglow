import { getDefaultReminderTime } from './reminder-time';

const at = (h: number, m: number) => new Date(2026, 7, 1, h, m, 0, 0);

describe('getDefaultReminderTime', () => {
  it('rounds down to the nearest 15 minutes', () => {
    expect(getDefaultReminderTime(at(14, 7))).toEqual({ hour: 14, minute: 0 });
  });

  it('rounds up to the nearest 15 minutes', () => {
    expect(getDefaultReminderTime(at(14, 8))).toEqual({ hour: 14, minute: 15 });
  });

  it('carries the hour when rounding past :53', () => {
    expect(getDefaultReminderTime(at(14, 55))).toEqual({ hour: 15, minute: 0 });
  });

  it('keeps the earliest boundary 07:00', () => {
    expect(getDefaultReminderTime(at(7, 0))).toEqual({ hour: 7, minute: 0 });
  });

  it('keeps the latest boundary 21:30', () => {
    expect(getDefaultReminderTime(at(21, 30))).toEqual({
      hour: 21,
      minute: 30,
    });
  });

  it('falls back for late night (rounds past 21:30)', () => {
    // 21:38 rounds to 21:45 — outside the window
    expect(getDefaultReminderTime(at(21, 38))).toEqual({
      hour: 19,
      minute: 30,
    });
  });

  it('falls back for early morning', () => {
    expect(getDefaultReminderTime(at(2, 12))).toEqual({ hour: 19, minute: 30 });
  });

  it('falls back for pre-7am after rounding', () => {
    // 06:50 rounds to 06:45 — still outside
    expect(getDefaultReminderTime(at(6, 50))).toEqual({ hour: 19, minute: 30 });
  });

  it('handles the midnight carry without producing hour 24', () => {
    expect(getDefaultReminderTime(at(23, 59))).toEqual({
      hour: 19,
      minute: 30,
    });
  });
});
