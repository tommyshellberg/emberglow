import {
  isJoinable,
  joinCutoffMs,
  overlapsWindow,
  type ScheduledQuestStatus,
} from './types';

const run = (
  startISO: string,
  durationMinutes: number,
  status: ScheduledQuestStatus = 'pending'
) =>
  ({
    id: 'r1',
    status,
    scheduledStartAt: startISO,
    quest: {
      title: 't',
      category: 'fitness',
      durationMinutes,
      mode: 'cooperative',
      reward: { xp: 180 },
    },
    participants: [],
    completionPolicy: 'individual',
    visibility: 'public',
    maxParticipants: 10,
  }) as any;

describe('join window helpers', () => {
  const start = '2030-01-01T05:00:00.000Z';
  const startMs = new Date(start).getTime();

  it('cutoff is 25% of the duration after start', () => {
    expect(joinCutoffMs(run(start, 60))).toBe(startMs + 15 * 60_000);
  });
  it('pending runs are always joinable', () => {
    expect(isJoinable(run(start, 60, 'pending'), startMs + 999 * 60_000)).toBe(
      true
    );
  });
  it('active runs are joinable up to the cutoff and not after', () => {
    expect(isJoinable(run(start, 60, 'active'), startMs + 15 * 60_000)).toBe(
      true
    );
    expect(
      isJoinable(run(start, 60, 'active'), startMs + 15 * 60_000 + 1)
    ).toBe(false);
  });
  it('completed runs are never joinable, regardless of timing', () => {
    expect(isJoinable(run(start, 60, 'completed'), startMs)).toBe(false);
  });
});

describe('overlapsWindow', () => {
  const a = run('2030-01-01T05:00:00.000Z', 60);
  it('detects intersecting windows', () => {
    expect(overlapsWindow(a, run('2030-01-01T05:30:00.000Z', 60))).toBe(true);
  });
  it('treats abutting windows as non-overlapping (half-open)', () => {
    expect(overlapsWindow(a, run('2030-01-01T06:00:00.000Z', 60))).toBe(false);
  });
});
