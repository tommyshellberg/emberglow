import { act, renderHook } from '@testing-library/react-native';

import { getItem, setItem } from '@/lib/storage';

import { useScheduledQuestsStore } from './scheduled-quests-store';

jest.mock('@/lib/storage', () => ({
  getItem: jest.fn(() => null),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

const STORAGE_KEY = 'scheduled-quests-storage';

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

const settlementFor = (questRunId: string) =>
  ({
    questRunId,
    completedAt: '2030-01-01T06:00:00.000Z',
    participants: [],
  }) as any;

describe('scheduled-quests-store', () => {
  beforeEach(() => {
    act(() => useScheduledQuestsStore.getState().reset());
    jest.clearAllMocks();
    (getItem as jest.Mock).mockReturnValue(null);
  });

  it('replaces registrations wholesale on fetch', () => {
    const { result } = renderHook(() => useScheduledQuestsStore());
    act(() => result.current.setMyRegistrations([run('a'), run('b')]));
    expect(result.current.myRegistrations.map((r) => r.id)).toEqual(['a', 'b']);
  });

  // Every fixture below seeds TWO registrations on purpose. On a one-element
  // array `.some` and `.every` agree, and the map ternary has only one element
  // to choose between — so an implementation that appends duplicates, and one
  // that overwrites every entry with the incoming run, both look correct.
  it('upserts an existing registration without touching its neighbours', () => {
    const { result } = renderHook(() => useScheduledQuestsStore());
    act(() => result.current.setMyRegistrations([run('a'), run('b')]));

    act(() =>
      result.current.upsertRegistration({ ...run('b'), status: 'active' })
    );

    expect(result.current.myRegistrations.map((r) => r.id)).toEqual(['a', 'b']);
    expect(
      result.current.myRegistrations.find((r) => r.id === 'b')?.status
    ).toBe('active');
    // The neighbour must be left exactly as it was.
    expect(
      result.current.myRegistrations.find((r) => r.id === 'a')?.status
    ).toBe('pending');
  });

  it('appends a registration it has not seen before', () => {
    const { result } = renderHook(() => useScheduledQuestsStore());
    act(() => result.current.setMyRegistrations([run('a'), run('b')]));

    act(() => result.current.upsertRegistration(run('c')));

    expect(result.current.myRegistrations.map((r) => r.id)).toEqual([
      'a',
      'b',
      'c',
    ]);
  });

  it('removes a registration', () => {
    const { result } = renderHook(() => useScheduledQuestsStore());
    act(() => result.current.setMyRegistrations([run('a'), run('b')]));
    act(() => result.current.removeRegistration('a'));
    expect(result.current.myRegistrations.map((r) => r.id)).toEqual(['b']);
  });

  it('records a settlement and drops only the settled registration', () => {
    const { result } = renderHook(() => useScheduledQuestsStore());
    act(() => result.current.setMyRegistrations([run('a'), run('b')]));
    const settlement = settlementFor('a');

    act(() => result.current.recordSettlement(settlement));

    expect(result.current.settlements.a).toEqual(settlement);
    // Seeded with two so that "drops everything" is distinguishable from
    // "drops the settled one".
    expect(result.current.myRegistrations.map((r) => r.id)).toEqual(['b']);
  });

  it('reset empties both registrations and settlements', () => {
    const { result } = renderHook(() => useScheduledQuestsStore());
    act(() => result.current.setMyRegistrations([run('a'), run('b')]));
    act(() => result.current.recordSettlement(settlementFor('a')));

    act(() => result.current.reset());

    expect(result.current.myRegistrations).toEqual([]);
    expect(result.current.settlements).toEqual({});
  });

  describe('persistence', () => {
    it('writes both slices under the pinned storage key', () => {
      const { result } = renderHook(() => useScheduledQuestsStore());

      act(() => result.current.setMyRegistrations([run('a')]));
      act(() => result.current.recordSettlement(settlementFor('a')));

      expect(setItem).toHaveBeenCalledWith(STORAGE_KEY, expect.any(String));
      const written = JSON.parse(
        (setItem as jest.Mock).mock.calls.at(-1)![1] as string
      );
      // Pin the shape, not just the fact that something was written: a
      // partialize that returns {} still calls setItem.
      expect(written.state.settlements.a).toEqual(settlementFor('a'));
      expect(written.state).toHaveProperty('myRegistrations');
    });

    it('rehydrates registrations written by a previous launch', () => {
      (getItem as jest.Mock).mockImplementation((name: string) =>
        name === STORAGE_KEY
          ? JSON.stringify({
              state: { myRegistrations: [run('a'), run('b')], settlements: {} },
              version: 0,
            })
          : null
      );

      // A fresh module instance is the only way to observe hydration, which
      // happens once when the store is created.
      let store: typeof useScheduledQuestsStore;
      jest.isolateModules(() => {
        store = require('./scheduled-quests-store')
          .useScheduledQuestsStore as typeof useScheduledQuestsStore;
      });

      expect(getItem).toHaveBeenCalledWith(STORAGE_KEY);
      expect(store!.getState().myRegistrations.map((r) => r.id)).toEqual([
        'a',
        'b',
      ]);
    });
  });
});
