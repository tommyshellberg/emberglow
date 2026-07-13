import { act, renderHook } from '@testing-library/react-native';

import { useScheduledQuestsStore } from './scheduled-quests-store';

const run = (id: string, startISO = '2030-01-01T05:00:00.000Z') =>
  ({
    id,
    status: 'pending',
    scheduledStartAt: startISO,
    quest: {
      title: 't',
      category: 'fitness',
      durationMinutes: 60,
      mode: 'cooperative',
      reward: { xp: 180 },
    },
    participants: [],
    completionPolicy: 'individual',
    visibility: 'public',
    maxParticipants: 10,
  }) as any;

describe('scheduled-quests-store', () => {
  beforeEach(() => act(() => useScheduledQuestsStore.getState().reset()));

  it('replaces registrations wholesale on fetch', () => {
    const { result } = renderHook(() => useScheduledQuestsStore());
    act(() => result.current.setMyRegistrations([run('a'), run('b')]));
    expect(result.current.myRegistrations.map((r) => r.id)).toEqual(['a', 'b']);
  });

  it('upserts a registration without duplicating', () => {
    const { result } = renderHook(() => useScheduledQuestsStore());
    act(() => result.current.setMyRegistrations([run('a')]));
    act(() =>
      result.current.upsertRegistration({ ...run('a'), status: 'active' })
    );
    act(() => result.current.upsertRegistration(run('b')));
    expect(result.current.myRegistrations).toHaveLength(2);
    expect(
      result.current.myRegistrations.find((r) => r.id === 'a')?.status
    ).toBe('active');
  });

  it('removes a registration', () => {
    const { result } = renderHook(() => useScheduledQuestsStore());
    act(() => result.current.setMyRegistrations([run('a'), run('b')]));
    act(() => result.current.removeRegistration('a'));
    expect(result.current.myRegistrations.map((r) => r.id)).toEqual(['b']);
  });

  it('records settlements by questRunId and drops the registration', () => {
    const { result } = renderHook(() => useScheduledQuestsStore());
    act(() => result.current.setMyRegistrations([run('a')]));
    const settlement = {
      questRunId: 'a',
      completedAt: '2030-01-01T06:00:00.000Z',
      participants: [],
    };
    act(() => result.current.recordSettlement(settlement as any));
    expect(result.current.settlements.a).toEqual(settlement);
    expect(result.current.myRegistrations).toHaveLength(0);
  });
});
