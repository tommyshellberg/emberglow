import { act, renderHook } from '@testing-library/react-native';
import { AppState, type AppStateStatus } from 'react-native';

import addLockListener from '@/../modules/lock-state';
import {
  cancelPresenceWarningNotification,
  schedulePresenceWarningNotification,
} from '@/lib/services/notifications';
import {
  flipLiveActivityToFailed,
  flipLiveActivityToGrace,
  revertLiveActivityToActive,
} from '@/lib/services/presence-live-activity';
import {
  confirmQuestRun,
  updateAwayStatus,
  updatePhoneLockStatus,
  updateQuestRunStatus,
} from '@/lib/services/quest-run-service';
import QuestTimer from '@/lib/services/quest-timer';
import { getItem, removeItem, setItem } from '@/lib/storage';
import { useQuestStore } from '@/store/quest-store';

import { snapshotKey, usePresenceRuntime } from './quest-presence-runtime';

jest.mock('@/../modules/lock-state', () => ({
  __esModule: true,
  default: jest.fn(() => ({ remove: jest.fn() })),
}));

jest.mock('@/lib/services/quest-run-service', () => ({
  updatePhoneLockStatus: jest.fn().mockResolvedValue({}),
  updateQuestRunStatus: jest.fn().mockResolvedValue({}),
  confirmQuestRun: jest.fn().mockResolvedValue({}),
  getQuestRunStatus: jest.fn().mockResolvedValue({}),
  updateAwayStatus: jest.fn().mockResolvedValue({ status: 'active' }),
}));

jest.mock('@/lib/services/presence-live-activity', () => ({
  flipLiveActivityToGrace: jest.fn(),
  revertLiveActivityToActive: jest.fn(),
  flipLiveActivityToFailed: jest.fn(),
}));

jest.mock('@/lib/services/notifications', () => ({
  schedulePresenceWarningNotification: jest.fn().mockResolvedValue(true),
  cancelPresenceWarningNotification: jest.fn().mockResolvedValue(true),
}));

jest.mock('@/lib/storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

jest.mock('@/lib/services/quest-timer', () => ({
  __esModule: true,
  default: {
    onPhoneLocked: jest.fn().mockResolvedValue(undefined),
    onPhoneUnlocked: jest.fn().mockResolvedValue(undefined),
  },
}));

jest.mock('@/store/quest-store', () => ({
  useQuestStore: {
    getState: jest.fn(),
    subscribe: jest.fn(() => jest.fn()),
  },
}));

const RUN_ID = 'run-1';
const START = 1_000_000;
const DURATION_MIN = 30;
const DURATION_MS = DURATION_MIN * 60_000;
const END = START + DURATION_MS;
const LIVE_ACTIVITY_ID = 'live-activity-1';

// Captured by monkey-patching AppState.addEventListener directly (the same
// technique src/lib/services/timezone-service.test.ts uses) — reliable
// because the runtime module and this test share the same imported AppState
// object reference, unlike jest.doMock('react-native', ...) which only
// affects modules required *after* the mock is registered.
let appStateListener: ((status: AppStateStatus) => void) | undefined;

// Captured store-subscription callback (the runtime's evaluateStoreState),
// invoked to simulate a mid-run store transition.
let storeSubscriber: (() => void) | undefined;

let mockQuestState: any;

function baseActiveQuest(overrides: Record<string, unknown> = {}) {
  return {
    id: 'quest-1',
    questRunId: RUN_ID,
    enforcement: 'presence',
    startTime: START,
    durationMinutes: DURATION_MIN,
    title: 'Test quest',
    mode: 'custom',
    category: 'focus',
    reward: { xp: 10 },
    status: 'active',
    ...overrides,
  };
}

function setQuestState(overrides: Record<string, unknown> = {}) {
  mockQuestState = {
    activeQuest: null,
    cooperativeQuestRun: null,
    currentLiveActivityId: LIVE_ACTIVITY_ID,
    failQuest: jest.fn(),
    completeQuest: jest.fn().mockResolvedValue(null),
    ...overrides,
  };
  (useQuestStore.getState as jest.Mock).mockReturnValue(mockQuestState);
}

describe('quest-presence-runtime', () => {
  let hook: ReturnType<typeof renderHook> | undefined;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    jest.setSystemTime(START);

    appStateListener = undefined;
    AppState.addEventListener = jest.fn((event, listener) => {
      if (event === 'change') {
        appStateListener = listener as (status: AppStateStatus) => void;
      }
      return { remove: jest.fn() };
    }) as any;

    (getItem as jest.Mock).mockReturnValue(null);
    // clearAllMocks() wipes call history only, not implementations — reset
    // the default resolution every test so a prior test's mockRejectedValue
    // (offline scenarios) can't bleed into a later test that needs the ack.
    (updateAwayStatus as jest.Mock).mockResolvedValue({ status: 'active' });
    storeSubscriber = undefined;
    (useQuestStore.subscribe as jest.Mock).mockImplementation((cb) => {
      storeSubscriber = cb as () => void;
      return jest.fn();
    });
    hook = undefined;
    setQuestState();
  });

  afterEach(() => {
    hook?.unmount();
    jest.useRealTimers();
  });

  function mountRuntime() {
    hook = renderHook(() => usePresenceRuntime());
  }

  function startRuntimeForActivePresenceRun(
    overrides: Record<string, unknown> = {}
  ) {
    setQuestState({ activeQuest: baseActiveQuest(overrides) });
    mountRuntime();
  }

  function fireLockEvent(kind: 'LOCKED' | 'UNLOCKED') {
    const calls = (addLockListener as jest.Mock).mock.calls.filter(
      (c) => c[0] === kind
    );
    const callback = calls[calls.length - 1]?.[1];
    act(() => {
      callback?.();
    });
  }

  function fireAppState(status: AppStateStatus) {
    act(() => {
      appStateListener?.(status);
    });
  }

  // Update the mocked store, then invoke the runtime's captured store
  // subscription (evaluateStoreState) — simulates a mid-run store transition.
  function transitionStore(overrides: Record<string, unknown>) {
    setQuestState(overrides);
    act(() => {
      storeSubscriber?.();
    });
  }

  async function flush() {
    await act(async () => {
      for (let i = 0; i < 6; i += 1) {
        await Promise.resolve();
      }
    });
  }

  it('SCREEN_LOCKED event PATCHes lock:true and persists the snapshot', async () => {
    startRuntimeForActivePresenceRun();

    fireLockEvent('LOCKED');
    await flush();

    expect(updatePhoneLockStatus).toHaveBeenCalledWith(
      RUN_ID,
      true,
      LIVE_ACTIVITY_ID
    );
    expect(setItem).toHaveBeenCalledWith(
      snapshotKey(RUN_ID),
      expect.objectContaining({ state: 'LOCKED' })
    );
  });

  it('grace expiry with the away report acked: server owns the fail — no status PATCH, local commit only', async () => {
    startRuntimeForActivePresenceRun();

    fireAppState('background');
    act(() => {
      jest.advanceTimersByTime(3_000); // debounce fires, away:true acked
    });
    await flush();
    act(() => {
      jest.advanceTimersByTime(37_000); // 40s total → grace deadline
    });
    await flush();

    expect(updateQuestRunStatus).not.toHaveBeenCalled();
    expect(mockQuestState.failQuest).toHaveBeenCalled();
    expect(flipLiveActivityToFailed).not.toHaveBeenCalled(); // server pushes the failed tile
  });

  it('grace expiry with the away report unreachable (offline): fallback fail + local failed tile', async () => {
    (updateAwayStatus as jest.Mock).mockRejectedValue(new Error('offline'));
    startRuntimeForActivePresenceRun();

    fireAppState('background');
    act(() => {
      jest.advanceTimersByTime(40_000);
    });
    await flush();

    expect(updateQuestRunStatus).toHaveBeenCalledWith(
      RUN_ID,
      'failed',
      null,
      undefined,
      'left_app'
    );
    expect(mockQuestState.failQuest).toHaveBeenCalled();
    expect(flipLiveActivityToFailed).toHaveBeenCalledWith({
      activityId: LIVE_ACTIVITY_ID,
      title: 'Test quest',
      durationMinutes: DURATION_MIN,
    });
  });

  it('returning within grace cancels the timer and warning, no fail', async () => {
    startRuntimeForActivePresenceRun();

    fireAppState('background');
    act(() => {
      jest.advanceTimersByTime(10_000);
    });
    fireAppState('active');
    act(() => {
      jest.advanceTimersByTime(40_000);
    });
    await flush();

    expect(updateQuestRunStatus).not.toHaveBeenCalled();
    expect(cancelPresenceWarningNotification).toHaveBeenCalled();
  });

  it('TIMER_COMPLETE while foregrounded confirms via /confirm (watched)', async () => {
    startRuntimeForActivePresenceRun();

    act(() => {
      jest.advanceTimersByTime(DURATION_MS);
    });
    await flush();

    expect(confirmQuestRun).toHaveBeenCalledWith(RUN_ID);
    expect(mockQuestState.completeQuest).toHaveBeenCalledWith(true);
  });

  it('cold start rehydrates from the MMKV snapshot and re-judges (abandoned → left_app)', async () => {
    (getItem as jest.Mock).mockReturnValue({
      state: 'IN_APP',
      enteredAt: START,
      lockedMs: 0,
      lastAliveAt: START + 2 * 60_000,
    });
    jest.setSystemTime(END + 60_000);

    startRuntimeForActivePresenceRun();
    await flush();

    expect(updateQuestRunStatus).toHaveBeenCalledWith(
      RUN_ID,
      'failed',
      null,
      undefined,
      'left_app'
    );
  });

  it('an active COOPERATIVE run routes lock/unlock to the legacy QuestTimer handlers, not the machine', async () => {
    setQuestState({
      activeQuest: baseActiveQuest({
        enforcement: undefined,
        category: 'cooperative',
      }),
      cooperativeQuestRun: { id: RUN_ID },
    });
    mountRuntime();

    fireLockEvent('LOCKED');
    await flush();

    expect(QuestTimer.onPhoneLocked).toHaveBeenCalled();
    expect(updatePhoneLockStatus).not.toHaveBeenCalledWith(
      expect.anything(),
      true,
      expect.anything()
    );

    fireLockEvent('UNLOCKED');
    await flush();

    expect(QuestTimer.onPhoneUnlocked).toHaveBeenCalled();
  });

  it('ignores lock/unlock and AppState signals when there is no active run', async () => {
    mountRuntime();

    fireLockEvent('LOCKED');
    fireAppState('background');
    await flush();

    expect(updatePhoneLockStatus).not.toHaveBeenCalled();
    expect(QuestTimer.onPhoneLocked).not.toHaveBeenCalled();
  });

  // --- CRITICAL 1 regression: a rejected network report must NOT block the
  // local store mutation, or the run is stranded forever. ---

  it('REPORT_FAIL still calls failQuest() locally even if the network report rejects', async () => {
    (updateQuestRunStatus as jest.Mock).mockRejectedValue(new Error('offline'));
    (updateAwayStatus as jest.Mock).mockRejectedValue(new Error('offline'));
    startRuntimeForActivePresenceRun();

    fireAppState('background');
    act(() => {
      jest.advanceTimersByTime(40_000);
    });
    await flush();

    expect(updateQuestRunStatus).toHaveBeenCalled();
    expect(mockQuestState.failQuest).toHaveBeenCalled();
  });

  it('REPORT_COMPLETE still calls completeQuest() locally even if confirm rejects', async () => {
    (confirmQuestRun as jest.Mock).mockRejectedValue(new Error('offline'));
    startRuntimeForActivePresenceRun();

    act(() => {
      jest.advanceTimersByTime(DURATION_MS);
    });
    await flush();

    expect(confirmQuestRun).toHaveBeenCalledWith(RUN_ID);
    expect(mockQuestState.completeQuest).toHaveBeenCalledWith(true);
  });

  // --- IMPORTANT 3 store-subscription lifecycle. ---

  it('a mid-run store transition to no presence run cleanly ends the session (timers cleared, warning + snapshot dropped)', async () => {
    startRuntimeForActivePresenceRun();

    // Go AWAY so a grace timer is armed and a warning is scheduled.
    fireAppState('background');
    await flush();
    (updateQuestRunStatus as jest.Mock).mockClear();

    // Store's activeQuest clears (e.g. cancelQuest()) → session must end.
    transitionStore({ activeQuest: null });
    await flush();

    expect(cancelPresenceWarningNotification).toHaveBeenCalled();
    expect(removeItem).toHaveBeenCalledWith(snapshotKey(RUN_ID));

    // Grace timer was cleared: advancing past it must NOT report a failure.
    act(() => {
      jest.advanceTimersByTime(40_000);
    });
    await flush();
    expect(updateQuestRunStatus).not.toHaveBeenCalled();
  });

  it('a different presence run replacing the tracked one starts fresh with no cross-talk from the old timers', async () => {
    startRuntimeForActivePresenceRun();

    // Replace run-1 with a longer run-2 (double duration) before run-1's end.
    transitionStore({
      activeQuest: baseActiveQuest({
        questRunId: 'run-2',
        startTime: START,
        durationMinutes: DURATION_MIN * 2,
      }),
    });
    await flush();

    // Advance past run-1's original end (30m) but before run-2's end (60m):
    // run-1's completion timer must have been cleared — nothing completes.
    act(() => {
      jest.advanceTimersByTime(DURATION_MS + 60_000);
    });
    await flush();
    expect(confirmQuestRun).not.toHaveBeenCalled();

    // Reaching run-2's end fires ITS completion, for run-2 only.
    act(() => {
      jest.advanceTimersByTime(DURATION_MS);
    });
    await flush();
    expect(confirmQuestRun).toHaveBeenCalledTimes(1);
    expect(confirmQuestRun).toHaveBeenCalledWith('run-2');
  });

  describe('debounced away report (realtime-fail)', () => {
    it('a sustained background fires flip + away:true (with liveActivityID) after 3s', async () => {
      startRuntimeForActivePresenceRun();

      fireAppState('background');
      expect(updateAwayStatus).not.toHaveBeenCalled(); // debounce pending

      act(() => {
        jest.advanceTimersByTime(3_000);
      });
      await flush();

      expect(flipLiveActivityToGrace).toHaveBeenCalledWith({
        activityId: LIVE_ACTIVITY_ID,
        title: 'Test quest',
        durationMinutes: DURATION_MIN,
        graceEndsAt: START + 3_000 + 30_000, // fire time + VISIBLE_GRACE_MS
      });
      expect(updateAwayStatus).toHaveBeenCalledWith(
        RUN_ID,
        true,
        LIVE_ACTIVITY_ID
      );
    });

    it('the ack is recorded and persisted (snapshot awayReported:true)', async () => {
      startRuntimeForActivePresenceRun();

      fireAppState('background');
      act(() => {
        jest.advanceTimersByTime(3_000);
      });
      await flush();

      expect(setItem).toHaveBeenCalledWith(
        snapshotKey(RUN_ID),
        expect.objectContaining({ state: 'AWAY', awayReported: true })
      );
    });

    it('an instant switch-back inside the debounce sends and flips nothing', async () => {
      startRuntimeForActivePresenceRun();

      fireAppState('background');
      act(() => {
        jest.advanceTimersByTime(2_000);
      });
      fireAppState('active');
      act(() => {
        jest.advanceTimersByTime(60_000);
      });
      await flush();

      expect(updateAwayStatus).not.toHaveBeenCalled();
      expect(flipLiveActivityToGrace).not.toHaveBeenCalled();
    });

    it('a lock inside the debounce cancels the report and is handled immediately', async () => {
      startRuntimeForActivePresenceRun();

      fireAppState('background');
      act(() => {
        jest.advanceTimersByTime(1_000);
      });
      fireLockEvent('LOCKED');
      await flush();

      // Lock (the good path) was not delayed by the away debounce…
      expect(updatePhoneLockStatus).toHaveBeenCalledWith(
        RUN_ID,
        true,
        LIVE_ACTIVITY_ID
      );

      act(() => {
        jest.advanceTimersByTime(60_000);
      });
      await flush();

      // …and the away report never fired.
      expect(updateAwayStatus).not.toHaveBeenCalled();
      expect(flipLiveActivityToGrace).not.toHaveBeenCalled();
    });

    it('returning after the report fired reverts the tile and disarms (away:true then away:false)', async () => {
      startRuntimeForActivePresenceRun();

      fireAppState('background');
      act(() => {
        jest.advanceTimersByTime(3_000);
      });
      await flush();
      fireAppState('active');
      await flush();

      expect(revertLiveActivityToActive).toHaveBeenCalledWith({
        activityId: LIVE_ACTIVITY_ID,
        title: 'Test quest',
        durationMinutes: DURATION_MIN,
        startedAt: START,
      });
      const awayFlags = (updateAwayStatus as jest.Mock).mock.calls.map(
        (c) => c[1]
      );
      expect(awayFlags).toEqual([true, false]); // call order (the chain's race-serialization is by construction, not tested here)
      expect(updateQuestRunStatus).not.toHaveBeenCalled(); // no fail — rescued
    });

    it('locking after the report fired also disarms (lock rescue)', async () => {
      startRuntimeForActivePresenceRun();

      fireAppState('background');
      act(() => {
        jest.advanceTimersByTime(3_000);
      });
      await flush();
      fireLockEvent('LOCKED');
      await flush();

      expect(updatePhoneLockStatus).toHaveBeenCalledWith(
        RUN_ID,
        true,
        LIVE_ACTIVITY_ID
      );
      expect(updateAwayStatus).toHaveBeenCalledWith(
        RUN_ID,
        false,
        LIVE_ACTIVITY_ID
      );
      expect(revertLiveActivityToActive).toHaveBeenCalled();
    });

    it('an away:false response carrying a failed run fails locally (server won the ~39s cross)', async () => {
      (updateAwayStatus as jest.Mock)
        .mockResolvedValueOnce({ status: 'active' }) // away:true ack
        .mockResolvedValueOnce({ status: 'failed' }); // disarm lost the race
      startRuntimeForActivePresenceRun();

      fireAppState('background');
      act(() => {
        jest.advanceTimersByTime(3_000);
      });
      await flush();
      fireAppState('active');
      await flush();

      expect(mockQuestState.failQuest).toHaveBeenCalled();
      // The client itself sent no fail — the server owned it.
      expect(updateQuestRunStatus).not.toHaveBeenCalled();
    });
  });
});
