import { validateEventForm } from './validate-event-form';

describe('validateEventForm', () => {
  const now = 1_000_000_000_000;

  it('requires a title', () => {
    expect(
      validateEventForm({ title: '  ', startsAtMs: now + 3_600_000, nowMs: now })
    ).toMatch(/title/i);
  });
  it('rejects starts below the lead floor (5s violates the dev floor too)', () => {
    expect(
      validateEventForm({ title: 'Run', startsAtMs: now + 5_000, nowMs: now })
    ).toMatch(/at least 15 minutes/i);
  });
  it('rejects starts beyond 14 days', () => {
    expect(
      validateEventForm({
        title: 'Run',
        startsAtMs: now + 15 * 24 * 3_600_000,
        nowMs: now,
      })
    ).toMatch(/within 14 days/i);
  });
  it('accepts a valid form', () => {
    expect(
      validateEventForm({ title: 'Run', startsAtMs: now + 3_600_000, nowMs: now })
    ).toBeNull();
  });
});
