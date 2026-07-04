import { act, renderHook } from '@testing-library/react-native';

import { getItem } from '@/lib/storage';
import type {
  PresenceContext,
  PresenceState,
} from '@/lib/services/quest-presence-machine';
import type { PresenceViewState } from '@/lib/services/quest-presence-runtime';
import {
  getViewState,
  subscribeToViewState,
} from '@/lib/services/quest-presence-runtime';
import { useQuestStore } from '@/store/quest-store';

import { useQuestPresence } from './use-quest-presence';

jest.mock('@/lib/services/quest-presence-runtime', () => ({
  subscribeToViewState: jest.fn(() => jest.fn()),
  getViewState: jest.fn(),
}));

jest.mock('@/store/quest-store', () => ({
  useQuestStore: jest.fn(),
}));

jest.mock('@/lib/storage', () => ({
  getItem: jest.fn(),
}));

const START = 1_000_000;

function mockRuntimeView(view: PresenceViewState) {
  (getViewState as jest.Mock).mockReturnValue(view);
}

function mockActiveQuest(activeQuest: Record<string, unknown> | null) {
  (useQuestStore as unknown as jest.Mock).mockImplementation(
    (selector?: (state: any) => unknown) => {
      const state = { activeQuest };
      return selector ? selector(state) : state;
    }
  );
}

function context(overrides: Partial<PresenceContext> = {}): PresenceContext {
  return {
    state: 'IN_APP' as PresenceState,
    actualStartTime: START,
    scheduledEndTime: START + 30 * 60_000,
    lockedMs: 0,
    lockedSegmentStart: null,
    graceDeadline: null,
    enteredAt: START,
    lastAliveAt: START,
    ...overrides,
  };
}

describe('useQuestPresence', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    jest.setSystemTime(START);
    (getItem as jest.Mock).mockReturnValue(null);
    mockActiveQuest(null);
    mockRuntimeView({ runId: null, context: null });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('maps runtime state + config to display values', () => {
    mockRuntimeView({
      runId: 'r1',
      context: context({
        state: 'LOCKED',
        scheduledEndTime: START + 30 * 60_000,
        lockedMs: 12 * 60_000,
        lockedSegmentStart: null,
      }),
    });
    mockActiveQuest({
      title: 'The Whispering Glade',
      mode: 'story',
      reward: { xp: 62 },
      durationMinutes: 30,
    });
    jest.setSystemTime(START + 18 * 60_000);

    const { result } = renderHook(() => useQuestPresence());

    expect(result.current.state).toBe('LOCKED');
    expect(result.current.remainingMs).toBe(12 * 60_000);
    expect(result.current.liveMultiplier).toBeCloseTo(1.2);
    expect(result.current.forecast).toEqual({ current: 62, maxIfLocked: 93 });
    expect(result.current.questTitle).toBe('The Whispering Glade');
    expect(result.current.mode).toBe('story');
  });

  it('counts down remainingMs live while IN_APP with lockedMs at 0', () => {
    mockRuntimeView({
      runId: 'r2',
      context: context({
        state: 'IN_APP',
        scheduledEndTime: START + 10 * 60_000,
      }),
    });
    mockActiveQuest({
      title: 'Focus Session',
      mode: 'custom',
      reward: { xp: 20 },
      durationMinutes: 10,
    });

    const { result } = renderHook(() => useQuestPresence());

    expect(result.current.state).toBe('IN_APP');
    expect(result.current.lockedMs).toBe(0);
    expect(result.current.remainingMs).toBe(10 * 60_000);

    act(() => {
      jest.advanceTimersByTime(60_000);
    });

    expect(result.current.remainingMs).toBe(9 * 60_000);
  });

  it('returns coherent defaults without throwing when there is no active run', () => {
    mockRuntimeView({ runId: null, context: null });
    mockActiveQuest(null);

    const { result } = renderHook(() => useQuestPresence());

    expect(() => result.current).not.toThrow();
    expect(result.current.remainingMs).toBe(0);
    expect(result.current.lockedMs).toBe(0);
    expect(result.current.questTitle).toBeUndefined();
    expect(result.current.mode).toBeUndefined();
  });

  it('climbs lockedMs live during an open LOCKED segment', () => {
    mockRuntimeView({
      runId: 'r3',
      context: context({
        state: 'LOCKED',
        scheduledEndTime: START + 30 * 60_000,
        lockedMs: 0,
        lockedSegmentStart: START,
      }),
    });
    mockActiveQuest({
      title: 'Deep Work',
      mode: 'custom',
      reward: { xp: 50 },
      durationMinutes: 30,
    });

    const { result } = renderHook(() => useQuestPresence());
    const initialMultiplier = result.current.liveMultiplier;

    act(() => {
      jest.advanceTimersByTime(6 * 60_000);
    });

    expect(result.current.lockedMs).toBe(6 * 60_000);
    expect(result.current.liveMultiplier).toBeGreaterThan(initialMultiplier);
  });

  it('reads the mute flag from storage', () => {
    (getItem as jest.Mock).mockReturnValue(true);
    mockRuntimeView({ runId: null, context: null });
    mockActiveQuest(null);

    const { result } = renderHook(() => useQuestPresence());

    expect(result.current.isMuted).toBe(true);
  });

  it('subscribes to the runtime view via useSyncExternalStore', () => {
    renderHook(() => useQuestPresence());
    expect(subscribeToViewState).toHaveBeenCalled();
    expect(getViewState).toHaveBeenCalled();
  });
});
