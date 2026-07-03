import {
  idleDaysBetween,
  spiritFromIdleDays,
  deriveDisplaySpirit,
  isSpiritFadingEnabled,
} from './spirit';

describe('spirit formula (server parity)', () => {
  it('spiritFromIdleDays matches 100 − 20·days floored at 0', () => {
    expect(spiritFromIdleDays(0)).toBe(100);
    expect(spiritFromIdleDays(1)).toBe(80);
    expect(spiritFromIdleDays(4)).toBe(20);
    expect(spiritFromIdleDays(5)).toBe(0);
    expect(spiritFromIdleDays(9)).toBe(0);
  });

  it('idleDaysBetween counts local calendar days (0 same day)', () => {
    const d = (s: string) => new Date(s).getTime();
    expect(
      idleDaysBetween(d('2026-06-01T08:00:00'), d('2026-06-01T23:00:00'))
    ).toBe(0);
    expect(
      idleDaysBetween(d('2026-06-01T23:00:00'), d('2026-06-02T00:30:00'))
    ).toBe(1);
    expect(
      idleDaysBetween(d('2026-06-01T08:00:00'), d('2026-06-06T08:00:00'))
    ).toBe(5);
  });
});

describe('deriveDisplaySpirit (server-anchored)', () => {
  const at = (s: string) => new Date(s).getTime();

  it('returns null when serverSpirit is null (inactive/dormant)', () => {
    expect(
      deriveDisplaySpirit({
        serverSpirit: null,
        serverSpiritAt: at('2026-06-01T08:00:00'),
        now: at('2026-06-05T08:00:00'),
      })
    ).toEqual({ spirit: null, faded: false, active: false });
  });

  it('decays forward from the fetch time, never above the server value', () => {
    expect(
      deriveDisplaySpirit({
        serverSpirit: 100,
        serverSpiritAt: at('2026-06-01T08:00:00'),
        now: at('2026-06-03T09:00:00'),
      })
    ).toEqual({ spirit: 60, faded: false, active: true });
  });

  it('a returning-lapsed user fetched at 100 is NOT faded even if their last quest was long ago', () => {
    expect(
      deriveDisplaySpirit({
        serverSpirit: 100,
        serverSpiritAt: at('2026-06-10T00:00:00'),
        now: at('2026-06-10T06:00:00'),
      }).faded
    ).toBe(false);
  });

  it('is faded when the anchored decay reaches 0', () => {
    expect(
      deriveDisplaySpirit({
        serverSpirit: 20,
        serverSpiritAt: at('2026-06-01T08:00:00'),
        now: at('2026-06-02T09:00:00'),
      })
    ).toEqual({ spirit: 0, faded: true, active: true });
  });
});
