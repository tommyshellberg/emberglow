import 'react-native-get-random-values';

import { jest } from '@jest/globals';
import { Platform } from 'react-native';
// Import OneSignal for mocking
import { OneSignal } from 'react-native-onesignal';

// Import mocked modules
import { queryClient } from '@/api/common';
import {
  areNotificationsEnabled,
  clearAllNotifications,
  scheduleQuestCompletionNotification,
} from '@/lib/services/notifications';
import {
  createQuestRun,
  getQuestRunStatus,
  updatePhoneLockStatus,
} from '@/lib/services/quest-run-service';
import { removeItem, setItem } from '@/lib/storage';
import { useUserStore } from '@/store/user-store';
// Import the store for assertions
// Import types
import type {
  CooperativeQuestTemplate,
  CustomQuestTemplate,
  StoryQuestTemplate,
} from '@/store/types';

import QuestTimer from './quest-timer';

// Mock dependencies
jest.mock('@/lib/services/quest-run-service', () => ({
  createQuestRun: jest.fn().mockResolvedValue({ id: 'mock-quest-run-id' }),
  updateQuestRunStatus: jest.fn().mockResolvedValue({}),
  updatePhoneLockStatus: jest.fn().mockResolvedValue({
    id: 'mock-quest-run-id',
    status: 'active',
    participants: [],
  }),
  getQuestRunStatus: jest.fn().mockResolvedValue({
    id: 'mock-quest-run-id',
    status: 'active',
    actualStartTime: Date.now(),
    scheduledEndTime: Date.now() + 900000,
  }),
}));

jest.mock('react-native-onesignal', () => ({
  OneSignal: {
    LiveActivities: {
      startDefault: jest.fn(),
      exit: jest.fn(),
      setupDefault: jest.fn(),
      updateDefault: jest.fn(),
    },
  },
}));

jest.mock('@/lib/services/notifications', () => ({
  areNotificationsEnabled: jest.fn().mockResolvedValue(true),
  clearAllNotifications: jest.fn(),
  scheduleQuestCompletionNotification: jest.fn(),
}));

// Create a persistent mock storage that survives clearAllMocks
const mockStorage: Record<string, any> = {};

jest.mock('@/lib/storage', () => ({
  // getItem returns parsed values, not strings
  getItem: jest.fn((key: string) => {
    const value = mockStorage[key];
    if (!value) return null;

    // For quest template, return the JSON string since quest-timer expects to parse it
    if (key === 'QUEST_TIMER_TEMPLATE') {
      return value; // Already a string from setItem
    }

    // For other values, return as-is since quest-timer expects strings
    return value;
  }),
  setItem: jest.fn((key: string, value: any) => {
    mockStorage[key] = value;
  }),
  removeItem: jest.fn((key: string) => {
    delete mockStorage[key];
  }),
}));

// A single mutable object backs every getState() call, so a test can stage
// store state by assigning to it (reset in beforeEach).
//
// `activeQuest` defaults to null, not to a quest. The solo-start path is
// guarded by `if (!questStore.activeQuest && this.questTemplate)`, so a
// non-null activeQuest fixture makes `startQuest` structurally unreachable —
// the assertion would pass against an implementation that never starts a
// quest at all. Tests that need an in-progress quest set it explicitly.
jest.mock('@/store/quest-store', () => {
  const mockStore = {
    setLiveActivityId: jest.fn(),
    startQuest: jest.fn(),
    completeQuest: jest.fn(),
    failQuest: jest.fn(),
    resetActiveQuest: jest.fn(),
    setCooperativeQuestRun: jest.fn(),
    reset: jest.fn(),
    activeQuest: null as { id: string; startTime: number } | null,
    pendingQuest: null,
    recentCompletedQuest: null,
    completedQuests: [] as unknown[],
    failedQuests: [] as unknown[],
    lastCompletedQuestTimestamp: 0,
    cooperativeQuestRun: null as { id: string; status: string } | null,
  };

  return {
    useQuestStore: {
      getState: jest.fn(() => mockStore),
      // Real zustand runs an updater function against the current state and
      // merges what it returns. A bare jest.fn() stores the function and
      // never calls it, so everything inside a `setState(state => …)` is
      // unreachable in every test — it reads as code with no coverage rather
      // than as an untested branch.
      setState: jest.fn((next) => {
        Object.assign(
          mockStore,
          typeof next === 'function' ? next(mockStore) : next
        );
      }),
      __mockStore: mockStore,
    },
  };
});

jest.mock('@/store/user-store', () => ({
  useUserStore: {
    getState: jest.fn(() => ({
      user: { id: 'test-user-id' },
    })),
  },
}));

jest.mock('@/store/character-store', () => {
  const mockStore = {
    character: { id: 'test-character-id' },
    addXP: jest.fn(),
    updateStreak: jest.fn(),
  };
  return {
    useCharacterStore: {
      getState: jest.fn(() => mockStore),
      __mockStore: mockStore,
    },
  };
});

// backgroundTask's stuck-in-pending completion arm require()s this lazily.
jest.mock('@/api/common', () => ({
  queryClient: { invalidateQueries: jest.fn() },
}));

// Mock uuid
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'test-uuid-' + Math.random()),
}));

// Mock react-native-background-actions
jest.mock('react-native-background-actions', () => ({
  start: jest.fn(),
  stop: jest.fn(),
  isRunning: jest.fn().mockReturnValue(false),
  updateNotification: jest.fn(),
  // Add the default export
  default: {
    start: jest.fn(),
    stop: jest.fn(),
    isRunning: jest.fn().mockReturnValue(false),
    updateNotification: jest.fn(),
  },
}));

// Handle on the shared quest-store mock object so tests can stage store state.
const questStoreMockModule = jest.requireMock('@/store/quest-store') as {
  useQuestStore: {
    setState: jest.Mock;
    __mockStore: {
      pendingQuest: {
        id: string;
        durationMinutes: number;
        reward: { xp: number };
      } | null;
    };
  };
};
const mockSetState = questStoreMockModule.useQuestStore.setState;
const mockCharacterStore = (
  jest.requireMock('@/store/character-store') as {
    useCharacterStore: {
      __mockStore: { addXP: jest.Mock; updateStreak: jest.Mock };
    };
  }
).useCharacterStore.__mockStore;

const mockQuestStore = (
  jest.requireMock('@/store/quest-store') as {
    useQuestStore: {
      __mockStore: {
        setLiveActivityId: jest.Mock;
        startQuest: jest.Mock;
        completeQuest: jest.Mock;
        failQuest: jest.Mock;
        setCooperativeQuestRun: jest.Mock;
        activeQuest: { id: string; startTime: number } | null;
        cooperativeQuestRun: { id: string; status: string } | null;
        recentCompletedQuest: {
          id: string;
          questRunId?: string;
          stopTime?: number;
        } | null;
        completedQuests: unknown[];
      };
    };
  }
).useQuestStore.__mockStore;

const BackgroundService = jest.requireMock(
  'react-native-background-actions'
) as {
  start: jest.Mock;
  stop: jest.Mock;
  isRunning: jest.Mock;
  updateNotification: jest.Mock;
};

/**
 * QuestTimer is a static class, so its fields survive between tests. Without
 * this the suite is order-dependent: a leftover `isPhoneLocked = true` makes
 * onPhoneLocked return early, and a leftover questTemplate keeps an "unlock
 * with no quest" case from ever taking the early-return branch.
 */
function resetQuestTimerStatics() {
  const timer = QuestTimer as unknown as {
    isPhoneLocked: boolean;
    questStartTime: number | null;
    questTemplate: unknown;
    oneSignalActivityId: string | null;
    questRunId: string | null;
  };
  timer.isPhoneLocked = false;
  timer.questStartTime = null;
  timer.questTemplate = null;
  timer.oneSignalActivityId = null;
  timer.questRunId = null;
}

function readQuestTimerStatics() {
  return QuestTimer as unknown as {
    isPhoneLocked: boolean;
    questStartTime: number | null;
    oneSignalActivityId: string | null;
  };
}

/**
 * The background task is handed to BackgroundService.start(), which is mocked,
 * so it never runs on its own. Pull it back off the mock to drive it directly.
 */
function capturedBackgroundTask(): (taskData?: {
  questDuration: number;
  questTitle: string;
  questId: string;
  questDescription: string;
}) => Promise<void> {
  return BackgroundService.start.mock.calls[0][0];
}

const taskDataFor = (durationMinutes = 15) => ({
  questDuration: durationMinutes * 60 * 1000,
  questTitle: 'Test Quest',
  questId: 'test-quest-id',
  questDescription: 'Test quest recap',
});

const storyQuest = (
  overrides: Partial<StoryQuestTemplate> = {}
): StoryQuestTemplate => ({
  id: 'test-quest-id',
  title: 'Test Quest',
  durationMinutes: 15,
  mode: 'story',
  recap: 'Test quest recap',
  poiSlug: 'test-poi',
  story: 'Test story content',
  options: [{ id: 'option1', text: 'Option 1', nextQuestId: null }],
  reward: { xp: 100 },
  ...overrides,
});

const customQuest = (
  overrides: Partial<CustomQuestTemplate> = {}
): CustomQuestTemplate => ({
  id: 'custom-quest-id',
  title: 'Go for a walk',
  durationMinutes: 20,
  mode: 'custom',
  category: 'fitness',
  reward: { xp: 50 },
  ...overrides,
});

describe('QuestTimer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Fake timers make the 500 ms solo-start window advanceable, and stop a
    // stray timer from a locking test firing during a later one.
    //
    // Deliberately a plain fake clock, NOT `{ advanceTimers: true }`: that was
    // tried to stop mutation runs hanging on the cooperative retry ladder's
    // `await new Promise(r => setTimeout(r, retryDelay))`, and it did not help
    // — the hangs are unbounded loops in the production code that these tests
    // now reach, not artifacts of the clock. Auto-advancing only bought
    // nondeterminism under parallel load.
    jest.useFakeTimers();
    resetQuestTimerStatics();
    mockQuestStore.activeQuest = null;
    mockQuestStore.cooperativeQuestRun = null;
    mockQuestStore.recentCompletedQuest = null;
    mockQuestStore.completedQuests = [];
    questStoreMockModule.useQuestStore.__mockStore.pendingQuest = null;
    BackgroundService.isRunning.mockReturnValue(false);
    // clearAllMocks only clears call records, not implementations. Re-establish
    // createQuestRun's default resolved value so a prior test's mockRejectedValue
    // can't leak forward. (Previously masked by the static questRunId never being
    // reset between tests; M1's prepare-time reset removes that masking.)
    (createQuestRun as jest.Mock).mockResolvedValue({
      id: 'mock-quest-run-id',
    });
    // Same reason: tests that stage a 'pending' or 'failed' run would
    // otherwise leak that status into every later cooperative test.
    (getQuestRunStatus as jest.Mock).mockResolvedValue({
      id: 'mock-quest-run-id',
      status: 'active',
      actualStartTime: Date.now(),
      scheduledEndTime: Date.now() + 900000,
    });
    (updatePhoneLockStatus as jest.Mock).mockResolvedValue({
      id: 'mock-quest-run-id',
      status: 'active',
      participants: [],
    });
    (useUserStore.getState as jest.Mock).mockReturnValue({
      user: { id: 'test-user-id' },
    });
    // Clear the mock storage
    Object.keys(mockStorage).forEach((key) => delete mockStorage[key]);
    // Reset Platform.OS to ios for most tests
    Platform.OS = 'ios';
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('prepareQuest', () => {
    it('creates a quest run on the server with status pending', async () => {
      // Arrange
      const mockQuestTemplate: StoryQuestTemplate = {
        id: 'test-quest-id',
        title: 'Test Quest',
        durationMinutes: 15,
        mode: 'story',
        recap: 'Test quest recap',
        poiSlug: 'test-poi',
        story: 'Test story content',
        options: [{ id: 'option1', text: 'Option 1', nextQuestId: null }],
        reward: { xp: 100 },
      };

      // Act
      await QuestTimer.prepareQuest(mockQuestTemplate);

      // Assert
      expect(createQuestRun).toHaveBeenCalledWith(mockQuestTemplate);
      expect(setItem).toHaveBeenCalledWith(
        'QUEST_TIMER_TEMPLATE',
        JSON.stringify(mockQuestTemplate)
      );
      expect(setItem).toHaveBeenCalledWith('QUEST_RUN_ID', 'mock-quest-run-id');
    });

    it('continues with quest preparation even if server request fails', async () => {
      // Arrange
      const mockQuestTemplate: StoryQuestTemplate = {
        id: 'test-quest-id',
        title: 'Test Quest',
        durationMinutes: 15,
        mode: 'story',
        recap: 'Test quest recap',
        poiSlug: 'test-poi',
        story: 'Test story content',
        options: [{ id: 'option1', text: 'Option 1', nextQuestId: null }],
        reward: { xp: 100 },
      };

      // Mock server failure
      (createQuestRun as jest.Mock).mockRejectedValue(
        new Error('Server error')
      );

      // Act
      await QuestTimer.prepareQuest(mockQuestTemplate);

      // Assert - should continue with quest preparation despite server error
      expect(createQuestRun).toHaveBeenCalledWith(mockQuestTemplate);
      expect(setItem).toHaveBeenCalledWith(
        'QUEST_TIMER_TEMPLATE',
        JSON.stringify(mockQuestTemplate)
      );
    });

    it('mints a fresh Live Activity id on every prepare (H1)', async () => {
      // Arrange
      const mockQuestTemplate: StoryQuestTemplate = {
        id: 'test-quest-id',
        title: 'Test Quest',
        durationMinutes: 15,
        mode: 'story',
        recap: 'Test quest recap',
        poiSlug: 'test-poi',
        story: 'Test story content',
        options: [{ id: 'option1', text: 'Option 1', nextQuestId: null }],
        reward: { xp: 100 },
      };

      // Act
      await QuestTimer.prepareQuest(mockQuestTemplate);
      const firstId = (OneSignal.LiveActivities.startDefault as jest.Mock).mock
        .calls[0][0];
      await QuestTimer.prepareQuest(mockQuestTemplate);
      const secondId = (OneSignal.LiveActivities.startDefault as jest.Mock).mock
        .calls[1][0];

      // Assert
      expect(firstId).toBeTruthy();
      expect(secondId).not.toBe(firstId);
    });

    it('registers the new activity id with the server at prepare (H2)', async () => {
      // Arrange
      const mockQuestTemplate: StoryQuestTemplate = {
        id: 'test-quest-id',
        title: 'Test Quest',
        durationMinutes: 15,
        mode: 'story',
        recap: 'Test quest recap',
        poiSlug: 'test-poi',
        story: 'Test story content',
        options: [{ id: 'option1', text: 'Option 1', nextQuestId: null }],
        reward: { xp: 100 },
      };

      // Act
      await QuestTimer.prepareQuest(mockQuestTemplate);
      const activityId = (OneSignal.LiveActivities.startDefault as jest.Mock)
        .mock.calls[0][0];

      // Assert
      expect(updatePhoneLockStatus).toHaveBeenCalledWith(
        'mock-quest-run-id',
        false,
        activityId
      );
    });

    it('does not register a stale prior run id when createQuestRun fails (M1)', async () => {
      // Arrange
      const mockQuestTemplate: StoryQuestTemplate = {
        id: 'test-quest-id',
        title: 'Test Quest',
        durationMinutes: 15,
        mode: 'story',
        recap: 'Test quest recap',
        poiSlug: 'test-poi',
        story: 'Test story content',
        options: [{ id: 'option1', text: 'Option 1', nextQuestId: null }],
        reward: { xp: 100 },
      };

      // Simulate a leftover questRunId from a prior quest
      // @ts-ignore - private static
      QuestTimer.questRunId = 'stale-prior-run-id';
      (createQuestRun as jest.Mock).mockRejectedValue(new Error('server down'));

      // Act
      await QuestTimer.prepareQuest(mockQuestTemplate);

      // Assert - H2 must NOT register the current card's id onto the stale prior run
      expect(updatePhoneLockStatus).not.toHaveBeenCalled();
    });
  });

  describe('onPhoneLocked', () => {
    it('updates quest run status to active when phone is locked', async () => {
      // Arrange
      const mockQuestTemplate: StoryQuestTemplate = {
        id: 'test-quest-id',
        title: 'Test Quest',
        durationMinutes: 15,
        mode: 'story',
        recap: 'Test quest recap',
        poiSlug: 'test-poi',
        story: 'Test story content',
        options: [],
        reward: { xp: 100 },
      };

      // Prepare quest first
      await QuestTimer.prepareQuest(mockQuestTemplate);

      // Act
      await QuestTimer.onPhoneLocked();

      // Assert
      expect(updatePhoneLockStatus).toHaveBeenCalledWith(
        'mock-quest-run-id',
        true,
        expect.any(String)
      );
    });

    it('ignores a duplicate lock event', async () => {
      // The old version of this test set isPhoneLocked by hand with no quest
      // prepared, so it asserted nothing the guard at the top of the method
      // was responsible for. Drive a real quest through instead, and check
      // the second lock produces no side effects at all — including the
      // storage reload, which is the only observable difference once the
      // start-time check downstream also blocks a re-start.
      await QuestTimer.prepareQuest(storyQuest());
      await QuestTimer.onPhoneLocked();
      jest.clearAllMocks();

      await QuestTimer.onPhoneLocked();

      expect(mockQuestStore.setLiveActivityId).not.toHaveBeenCalled();
      expect(updatePhoneLockStatus).not.toHaveBeenCalled();
      expect(OneSignal.LiveActivities.startDefault).not.toHaveBeenCalled();
    });

    it('sends lock status through the cooperative path for a cooperative run', async () => {
      mockQuestStore.cooperativeQuestRun = {
        id: 'coop-run-id',
        status: 'pending',
      };
      await QuestTimer.prepareQuest(storyQuest(), 'coop-run-id');
      const activityId = readQuestTimerStatics().oneSignalActivityId;
      (updatePhoneLockStatus as jest.Mock).mockClear();

      await QuestTimer.onPhoneLocked();

      // The cooperative branch still reports the lock, and carries the live
      // activity id so the server can dismiss the card.
      expect(updatePhoneLockStatus).toHaveBeenCalledWith(
        'coop-run-id',
        true,
        activityId
      );
      // Only the cooperative branch polls the server for activation.
      expect(getQuestRunStatus).toHaveBeenCalledWith('coop-run-id');
      expect(mockQuestStore.setCooperativeQuestRun).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'coop-run-id', status: 'active' })
      );
    });

    it('retries the lock report after a failed attempt', async () => {
      mockQuestStore.cooperativeQuestRun = {
        id: 'coop-run-id',
        status: 'pending',
      };
      await QuestTimer.prepareQuest(storyQuest(), 'coop-run-id');
      (updatePhoneLockStatus as jest.Mock)
        .mockClear()
        .mockRejectedValueOnce(new Error('offline'));

      const locking = QuestTimer.onPhoneLocked();
      // The ladder waits a second between attempts. Without this the second
      // attempt never happens and the assertion below reads 1.
      await jest.advanceTimersByTimeAsync(1000);
      await locking;

      expect(updatePhoneLockStatus).toHaveBeenCalledTimes(2);
    });

    it('gives up after three attempts and still starts the quest', async () => {
      // A phone that locks in a dead spot must not lose the quest. The
      // ladder's return value is discarded on purpose: the lock report is
      // best-effort, and activation is decided by the status check that
      // follows it.
      mockQuestStore.cooperativeQuestRun = {
        id: 'coop-run-id',
        status: 'pending',
      };
      await QuestTimer.prepareQuest(storyQuest(), 'coop-run-id');
      (updatePhoneLockStatus as jest.Mock)
        .mockClear()
        .mockRejectedValue(new Error('offline'));

      const locking = QuestTimer.onPhoneLocked();
      await jest.advanceTimersByTimeAsync(2000);
      await locking;

      expect(updatePhoneLockStatus).toHaveBeenCalledTimes(3);
      expect(getQuestRunStatus).toHaveBeenCalledWith('coop-run-id');
      expect(mockQuestStore.setCooperativeQuestRun).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'coop-run-id', status: 'active' })
      );
    });

    it('starts a cooperative quest at the server-supplied start time', async () => {
      const actualStartTime = 1_700_000_000_000;
      mockQuestStore.cooperativeQuestRun = {
        id: 'coop-run-id',
        status: 'pending',
      };
      (getQuestRunStatus as jest.Mock).mockResolvedValue({
        id: 'coop-run-id',
        status: 'active',
        actualStartTime,
        scheduledEndTime: actualStartTime + 900_000,
      });
      const template = storyQuest();
      await QuestTimer.prepareQuest(template, 'coop-run-id');

      await QuestTimer.onPhoneLocked();

      // Falling back to Date.now() here would desynchronise this participant
      // from everyone else in the run.
      expect(mockQuestStore.startQuest).toHaveBeenCalledWith({
        ...template,
        startTime: actualStartTime,
        status: 'active',
      });
    });

    it('does not start a cooperative quest the server has not activated', async () => {
      mockQuestStore.cooperativeQuestRun = {
        id: 'coop-run-id',
        status: 'pending',
      };
      (getQuestRunStatus as jest.Mock).mockResolvedValue({
        id: 'coop-run-id',
        status: 'pending',
        actualStartTime: undefined,
      });
      await QuestTimer.prepareQuest(storyQuest(), 'coop-run-id');

      await QuestTimer.onPhoneLocked();
      jest.advanceTimersByTime(500);

      expect(mockQuestStore.startQuest).not.toHaveBeenCalled();
      expect(mockQuestStore.setCooperativeQuestRun).not.toHaveBeenCalled();
    });

    it('fails the local quest when the server says the run already failed', async () => {
      mockQuestStore.cooperativeQuestRun = {
        id: 'coop-run-id',
        status: 'pending',
      };
      (getQuestRunStatus as jest.Mock).mockResolvedValue({
        id: 'coop-run-id',
        status: 'failed',
      });
      await QuestTimer.prepareQuest(storyQuest(), 'coop-run-id');

      await QuestTimer.onPhoneLocked();

      expect(mockQuestStore.setCooperativeQuestRun).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'coop-run-id', status: 'failed' })
      );
      expect(mockQuestStore.failQuest).toHaveBeenCalled();
    });

    it('does not restart a cooperative quest that is already active locally', async () => {
      mockQuestStore.cooperativeQuestRun = {
        id: 'coop-run-id',
        status: 'pending',
      };
      mockQuestStore.activeQuest = { id: 'test-quest-id', startTime: 1 };
      await QuestTimer.prepareQuest(storyQuest(), 'coop-run-id');

      await QuestTimer.onPhoneLocked();

      expect(mockQuestStore.startQuest).not.toHaveBeenCalled();
    });

    it('updates the Android notification when a cooperative quest activates', async () => {
      Platform.OS = 'android';
      BackgroundService.isRunning.mockReturnValue(true);
      mockQuestStore.cooperativeQuestRun = {
        id: 'coop-run-id',
        status: 'pending',
      };
      await QuestTimer.prepareQuest(storyQuest(), 'coop-run-id');

      await QuestTimer.onPhoneLocked();

      expect(BackgroundService.updateNotification).toHaveBeenCalledWith({
        taskTitle: 'Quest in progress: Test Quest',
        taskDesc: 'Keep your phone locked for 15 minutes to complete the quest',
        progressBar: { max: 100, value: 0, indeterminate: false },
      });
    });

    it('sends lock status through the solo path for a solo run', async () => {
      await QuestTimer.prepareQuest(storyQuest());

      await QuestTimer.onPhoneLocked();

      expect(updatePhoneLockStatus).toHaveBeenCalledWith(
        'mock-quest-run-id',
        true,
        expect.any(String)
      );
      expect(getQuestRunStatus).not.toHaveBeenCalled();
    });

    it('does not send lock status when the server issued no run id', async () => {
      (createQuestRun as jest.Mock).mockRejectedValue(new Error('server down'));
      await QuestTimer.prepareQuest(storyQuest());
      (updatePhoneLockStatus as jest.Mock).mockClear();

      await QuestTimer.onPhoneLocked();

      expect(updatePhoneLockStatus).not.toHaveBeenCalled();
    });
  });

  describe('stopQuest', () => {
    it('should stop quest and clear all data', async () => {
      // Arrange
      const mockQuestTemplate: StoryQuestTemplate = {
        id: 'test-quest-id',
        title: 'Test Quest',
        durationMinutes: 15,
        mode: 'story',
        recap: 'Test quest recap',
        poiSlug: 'test-poi',
        story: 'Test story content',
        options: [],
        reward: { xp: 100 },
      };

      // Prepare quest first
      await QuestTimer.prepareQuest(mockQuestTemplate);

      // Act
      await QuestTimer.stopQuest();

      // Assert - should clear storage
      expect(removeItem).toHaveBeenCalledWith('QUEST_TIMER_TEMPLATE');
      expect(removeItem).toHaveBeenCalledWith('QUEST_TIMER_START_TIME');
      expect(removeItem).toHaveBeenCalledWith('ONESIGNAL_ACTIVITY_ID');
      expect(removeItem).toHaveBeenCalledWith('QUEST_RUN_ID');
    });

    it('should handle Android platform', async () => {
      // Arrange
      Platform.OS = 'android';
      BackgroundService.isRunning.mockReturnValue(true);

      // Act
      await QuestTimer.stopQuest();

      // Assert
      expect(BackgroundService.stop).toHaveBeenCalled();
    });

    it('does not stop a background service that is not running', async () => {
      // The guard's other direction. Without this, `if (isRunning())` can be
      // forced true and only the case above is exercised.
      BackgroundService.isRunning.mockReturnValue(false);

      await QuestTimer.stopQuest();

      expect(BackgroundService.stop).not.toHaveBeenCalled();
    });
  });

  describe('onPhoneUnlocked', () => {
    // These previously asserted only `resolves.not.toThrow()`. An empty method
    // body also does not throw, which is why the whole of onPhoneUnlocked could
    // be deleted with the suite still green. Assert the outcome instead.

    it('fails the quest when the phone is unlocked before the duration elapses', async () => {
      await QuestTimer.prepareQuest(storyQuest());
      await QuestTimer.onPhoneLocked();

      await QuestTimer.onPhoneUnlocked();

      expect(mockQuestStore.failQuest).toHaveBeenCalledTimes(1);
      expect(mockQuestStore.completeQuest).not.toHaveBeenCalled();
    });

    it('tells the server the phone is unlocked and tears the run down', async () => {
      await QuestTimer.prepareQuest(storyQuest());
      await QuestTimer.onPhoneLocked();
      (updatePhoneLockStatus as jest.Mock).mockClear();

      await QuestTimer.onPhoneUnlocked();

      expect(updatePhoneLockStatus).toHaveBeenCalledWith(
        'mock-quest-run-id',
        false
      );
      // stopQuest() runs as part of the failure path.
      expect(removeItem).toHaveBeenCalledWith('QUEST_RUN_ID');
      expect(removeItem).toHaveBeenCalledWith('QUEST_TIMER_START_TIME');
    });

    it('does nothing when a quest is prepared but never locked', async () => {
      // The start-time arm of the early-return condition. Note there is
      // deliberately no "nothing prepared at all" companion test: with every
      // static null the method is inert under every mutation of it, so such a
      // test asserts nothing. This one has a run id and a template, and only
      // the missing start time stops it — so inverting the guard is visible.
      //
      // activeQuest is staged so that the downstream `questStartTime &&
      // questTemplate` guard is observable too: relaxing it to `||` would
      // reach the fallback completion call below.
      mockQuestStore.activeQuest = { id: 'test-quest-id', startTime: 0 };
      await QuestTimer.prepareQuest(storyQuest());
      (updatePhoneLockStatus as jest.Mock).mockClear();

      await QuestTimer.onPhoneUnlocked();

      expect(mockQuestStore.failQuest).not.toHaveBeenCalled();
      expect(mockQuestStore.completeQuest).not.toHaveBeenCalled();
      expect(updatePhoneLockStatus).not.toHaveBeenCalled();
    });

    it('clears the locked flag so the next lock is processed', async () => {
      // stopQuest() does not reset isPhoneLocked — only onPhoneUnlocked does.
      // If that assignment is dropped, the duplicate-lock guard swallows every
      // subsequent lock and no further quest can ever start.
      await QuestTimer.prepareQuest(storyQuest());
      await QuestTimer.onPhoneLocked();
      await QuestTimer.onPhoneUnlocked();

      await QuestTimer.prepareQuest(storyQuest());
      (updatePhoneLockStatus as jest.Mock).mockClear();
      await QuestTimer.onPhoneLocked();

      expect(updatePhoneLockStatus).toHaveBeenCalledWith(
        'mock-quest-run-id',
        true,
        expect.any(String)
      );
    });

    it('does not push a failed Live Activity for a cooperative quest', async () => {
      // The single-player branch flips the card to "Quest Failed"; the
      // cooperative branch leaves it to the server. This is the actual
      // difference the test name has always claimed.
      mockQuestStore.cooperativeQuestRun = {
        id: 'cooperative-quest-run-id',
        status: 'active',
      };
      await QuestTimer.prepareQuest(
        storyQuest({ durationMinutes: 5 }),
        'cooperative-quest-run-id'
      );
      await QuestTimer.onPhoneLocked();
      (OneSignal.LiveActivities.startDefault as jest.Mock).mockClear();

      await QuestTimer.onPhoneUnlocked();

      expect(mockQuestStore.failQuest).toHaveBeenCalledTimes(1);
      expect(OneSignal.LiveActivities.startDefault).not.toHaveBeenCalled();
    });

    it('completes the quest when the phone is unlocked after the duration', async () => {
      // The other side of the elapsed-time comparison. Without it the
      // `>=` boundary and the whole completion arm are unasserted, and a
      // flipped comparison would fail every quest the user actually finished.
      mockQuestStore.activeQuest = { id: 'test-quest-id', startTime: 0 };
      await QuestTimer.prepareQuest(storyQuest({ durationMinutes: 15 }));
      await QuestTimer.onPhoneLocked();
      jest.advanceTimersByTime(15 * 60 * 1000);
      (OneSignal.LiveActivities.startDefault as jest.Mock).mockClear();

      await QuestTimer.onPhoneUnlocked();

      expect(mockQuestStore.completeQuest).toHaveBeenCalledWith(true);
      expect(mockQuestStore.failQuest).not.toHaveBeenCalled();
      expect(OneSignal.LiveActivities.startDefault).toHaveBeenCalledWith(
        expect.any(String),
        {
          title: 'Quest Complete',
          description: 'Congratulations on finishing your quest!',
        },
        { durationMinutes: 15, status: 'completed' }
      );
    });

    it('does not complete a quest the store is not actually running', async () => {
      // The store moved on to a different quest. Completing on id mismatch
      // would credit the wrong quest.
      mockQuestStore.activeQuest = { id: 'some-other-quest', startTime: 0 };
      await QuestTimer.prepareQuest(storyQuest({ durationMinutes: 15 }));
      await QuestTimer.onPhoneLocked();
      jest.advanceTimersByTime(15 * 60 * 1000);

      await QuestTimer.onPhoneUnlocked();

      expect(mockQuestStore.completeQuest).not.toHaveBeenCalled();
    });

    it('fetches participant rewards for a completed run', async () => {
      mockQuestStore.activeQuest = { id: 'test-quest-id', startTime: 0 };
      mockQuestStore.recentCompletedQuest = {
        id: 'test-quest-id',
        questRunId: 'completed-run-id',
        stopTime: 5,
      };
      (getQuestRunStatus as jest.Mock).mockResolvedValue({
        id: 'completed-run-id',
        status: 'completed',
        participants: [{ userId: 'u1', rewards: { adjustedXP: 120 } }],
      });
      await QuestTimer.prepareQuest(storyQuest({ durationMinutes: 15 }));
      await QuestTimer.onPhoneLocked();
      jest.advanceTimersByTime(15 * 60 * 1000);
      (getQuestRunStatus as jest.Mock).mockClear();

      await QuestTimer.onPhoneUnlocked();

      // Skipping this leaves the results screen showing base XP rather than
      // the server's adjusted, perk-applied numbers.
      expect(getQuestRunStatus).toHaveBeenCalledWith('completed-run-id');
      // …and the fetched rewards have to reach the store, or the round-trip
      // is pure cost.
      expect(mockSetState).toHaveBeenCalledWith(
        expect.objectContaining({
          recentCompletedQuest: expect.objectContaining({
            id: 'test-quest-id',
            participants: [{ userId: 'u1', rewards: { adjustedXP: 120 } }],
          }),
        })
      );
    });

    it('rewrites only the matching entry in the completed-quests history', async () => {
      // The history is matched on id *and* stop time, because a repeatable
      // quest appears in it once per run. Matching on id alone would rewrite
      // an earlier run of the same quest with this run's rewards.
      const earlierRun = { id: 'test-quest-id', stopTime: 6 };
      mockQuestStore.activeQuest = { id: 'test-quest-id', startTime: 0 };
      mockQuestStore.recentCompletedQuest = {
        id: 'test-quest-id',
        questRunId: 'completed-run-id',
        stopTime: 5,
      };
      mockQuestStore.completedQuests = [
        { id: 'test-quest-id', stopTime: 5 },
        earlierRun,
      ];
      (getQuestRunStatus as jest.Mock).mockResolvedValue({
        id: 'completed-run-id',
        status: 'completed',
        participants: [{ userId: 'u1', rewards: { adjustedXP: 120 } }],
      });
      await QuestTimer.prepareQuest(storyQuest({ durationMinutes: 15 }));
      await QuestTimer.onPhoneLocked();
      jest.advanceTimersByTime(15 * 60 * 1000);

      await QuestTimer.onPhoneUnlocked();

      expect(mockSetState).toHaveBeenCalledWith(
        expect.objectContaining({
          completedQuests: [
            expect.objectContaining({
              stopTime: 5,
              participants: [{ userId: 'u1', rewards: { adjustedXP: 120 } }],
            }),
            earlierRun,
          ],
        })
      );
    });

    it('skips the rewards fetch when the completed quest has no run id', async () => {
      mockQuestStore.activeQuest = { id: 'test-quest-id', startTime: 0 };
      mockQuestStore.recentCompletedQuest = { id: 'test-quest-id' };
      await QuestTimer.prepareQuest(storyQuest({ durationMinutes: 15 }));
      await QuestTimer.onPhoneLocked();
      jest.advanceTimersByTime(15 * 60 * 1000);
      (getQuestRunStatus as jest.Mock).mockClear();

      await QuestTimer.onPhoneUnlocked();

      expect(getQuestRunStatus).not.toHaveBeenCalled();
      expect(mockSetState).not.toHaveBeenCalled();
    });

    it('completes a quest that was stuck in the pending state', async () => {
      // The store never transitioned to active (the 500 ms starter was
      // missed), so the active-quest branch cannot fire. Without this arm the
      // user finishes the quest and gets nothing.
      questStoreMockModule.useQuestStore.__mockStore.pendingQuest = {
        id: 'test-quest-id',
        durationMinutes: 15,
        reward: { xp: 100 },
      };
      await QuestTimer.prepareQuest(storyQuest({ durationMinutes: 15 }));
      await QuestTimer.onPhoneLocked();
      jest.advanceTimersByTime(15 * 60 * 1000);

      await QuestTimer.onPhoneUnlocked();

      expect(mockSetState).toHaveBeenCalledWith(
        expect.objectContaining({
          activeQuest: null,
          pendingQuest: null,
          recentCompletedQuest: expect.objectContaining({
            id: 'test-quest-id',
            status: 'completed',
            questRunId: 'mock-quest-run-id',
          }),
        })
      );
      expect(mockCharacterStore.addXP).toHaveBeenCalledWith(100);
      expect(mockCharacterStore.updateStreak).toHaveBeenCalled();
    });

    it('fetches participant rewards for a quest that was stuck in pending', async () => {
      // The rewards merge exists twice: once for a quest the store had made
      // active, once here. Only the first arm had a test, so a stuck quest
      // could complete showing base XP instead of the server's adjusted
      // numbers and nothing would notice.
      const earlierRun = { id: 'test-quest-id', stopTime: -1 };
      questStoreMockModule.useQuestStore.__mockStore.pendingQuest = {
        id: 'test-quest-id',
        durationMinutes: 15,
        reward: { xp: 100 },
      };
      mockQuestStore.completedQuests = [earlierRun];
      (getQuestRunStatus as jest.Mock).mockResolvedValue({
        id: 'mock-quest-run-id',
        status: 'completed',
        participants: [{ userId: 'u1', rewards: { adjustedXP: 140 } }],
      });
      await QuestTimer.prepareQuest(storyQuest({ durationMinutes: 15 }));
      await QuestTimer.onPhoneLocked();
      jest.advanceTimersByTime(15 * 60 * 1000);

      await QuestTimer.onPhoneUnlocked();

      expect(getQuestRunStatus).toHaveBeenCalledWith('mock-quest-run-id');
      expect(mockQuestStore.recentCompletedQuest).toEqual(
        expect.objectContaining({
          id: 'test-quest-id',
          participants: [{ userId: 'u1', rewards: { adjustedXP: 140 } }],
        })
      );
      // The new run is rewritten in the history; the earlier one is not.
      expect(mockQuestStore.completedQuests).toEqual([
        earlierRun,
        expect.objectContaining({
          participants: [{ userId: 'u1', rewards: { adjustedXP: 140 } }],
        }),
      ]);
    });

    it('does not push a completed Live Activity on Android', async () => {
      Platform.OS = 'android';
      mockQuestStore.activeQuest = { id: 'test-quest-id', startTime: 0 };
      await QuestTimer.prepareQuest(storyQuest({ durationMinutes: 15 }));
      await QuestTimer.onPhoneLocked();
      jest.advanceTimersByTime(15 * 60 * 1000);

      await QuestTimer.onPhoneUnlocked();

      expect(mockQuestStore.completeQuest).toHaveBeenCalledWith(true);
      expect(OneSignal.LiveActivities.startDefault).not.toHaveBeenCalled();
    });

    it('shows the failure notification on Android instead of a Live Activity', async () => {
      Platform.OS = 'android';
      BackgroundService.isRunning.mockReturnValue(true);
      await QuestTimer.prepareQuest(storyQuest());
      await QuestTimer.onPhoneLocked();
      BackgroundService.updateNotification.mockClear();

      await QuestTimer.onPhoneUnlocked();

      expect(BackgroundService.updateNotification).toHaveBeenCalledWith({
        taskTitle: 'Quest Failed',
        taskDesc: 'You unlocked your phone. Try again next time!',
        progressBar: { max: 100, value: 0, indeterminate: false },
      });
      expect(OneSignal.LiveActivities.startDefault).not.toHaveBeenCalled();
    });

    it('flips the Live Activity to failed for a single-player quest', async () => {
      await QuestTimer.prepareQuest(storyQuest());
      await QuestTimer.onPhoneLocked();
      const activityId = readQuestTimerStatics().oneSignalActivityId;
      (OneSignal.LiveActivities.startDefault as jest.Mock).mockClear();

      await QuestTimer.onPhoneUnlocked();

      expect(OneSignal.LiveActivities.startDefault).toHaveBeenCalledWith(
        activityId,
        { title: 'Quest Failed', description: 'Try again next time' },
        { durationMinutes: 15, status: 'failed' }
      );
    });
  });

  describe('solo quest start', () => {
    it('starts the quest in the store 500 ms after the phone is locked', async () => {
      const template = storyQuest();
      await QuestTimer.prepareQuest(template);

      await QuestTimer.onPhoneLocked();
      // The delay is deliberate — assert it has not started yet, so a mutant
      // that starts the quest synchronously is also caught.
      expect(mockQuestStore.startQuest).not.toHaveBeenCalled();
      const startTime = readQuestTimerStatics().questStartTime;

      jest.advanceTimersByTime(500);

      expect(mockQuestStore.startQuest).toHaveBeenCalledWith({
        ...template,
        startTime,
        status: 'active',
      });
    });

    it('does not start the quest if the phone was unlocked inside the window', async () => {
      // Server unreachable at prepare, so there is no run id. onPhoneUnlocked
      // then clears isPhoneLocked and early-returns without tearing down the
      // template — which is what isolates the in-callback lock check.
      (createQuestRun as jest.Mock).mockRejectedValue(new Error('server down'));
      await QuestTimer.prepareQuest(storyQuest());
      await QuestTimer.onPhoneLocked();
      await QuestTimer.onPhoneUnlocked();

      jest.advanceTimersByTime(500);

      expect(mockQuestStore.startQuest).not.toHaveBeenCalled();
    });

    it('does not start a second quest when one is already active', async () => {
      await QuestTimer.prepareQuest(storyQuest());
      await QuestTimer.onPhoneLocked();
      // The store gained an active quest during the 500 ms window (e.g. a
      // restored session). The timer must stand down.
      mockQuestStore.activeQuest = { id: 'test-quest-id', startTime: 1 };

      jest.advanceTimersByTime(500);

      expect(mockQuestStore.startQuest).not.toHaveBeenCalled();
    });

    it('does not double-start a cooperative quest via the solo timer', async () => {
      // The cooperative branch starts the quest itself once the server reports
      // it active. If the solo/cooperative discriminator flips, the 500 ms
      // timer starts it a second time.
      mockQuestStore.cooperativeQuestRun = {
        id: 'cooperative-quest-run-id',
        status: 'active',
      };
      await QuestTimer.prepareQuest(storyQuest(), 'cooperative-quest-run-id');

      await QuestTimer.onPhoneLocked();
      jest.advanceTimersByTime(500);

      expect(mockQuestStore.startQuest).toHaveBeenCalledTimes(1);
    });
  });

  describe('prepareQuest with cooperative quest', () => {
    it('should throw error if cooperative quest has no questRunId', async () => {
      // Arrange
      const cooperativeQuest: CooperativeQuestTemplate = {
        id: 'coop-quest-1',
        title: 'Cooperative Quest',
        durationMinutes: 10,
        mode: 'cooperative',
        category: 'cooperative',
        reward: { xp: 200 },
      };

      // Act & Assert
      await expect(QuestTimer.prepareQuest(cooperativeQuest)).rejects.toThrow(
        'Cooperative quest must have an existing quest run ID from server'
      );
    });

    it('should use provided cooperativeQuestRunId for cooperative quests', async () => {
      // Arrange
      const cooperativeQuest: CooperativeQuestTemplate = {
        id: 'coop-quest-1',
        title: 'Cooperative Quest',
        durationMinutes: 10,
        mode: 'cooperative',
        category: 'cooperative',
        reward: { xp: 200 },
      };

      // Act
      await QuestTimer.prepareQuest(cooperativeQuest, 'existing-coop-run-id');

      // Assert
      expect(createQuestRun).not.toHaveBeenCalled(); // Should not create new quest run
      expect(setItem).toHaveBeenCalledWith(
        'QUEST_RUN_ID',
        'existing-coop-run-id'
      );
    });

    // The discriminator is `mode === 'cooperative' || (mode === 'custom' &&
    // category === 'cooperative')`. Flipping that `&&` to `||` makes EVERY
    // custom quest throw. Both arms need a test or the operator is free.
    it('creates a solo run for a custom quest in a non-cooperative category', async () => {
      await QuestTimer.prepareQuest(customQuest({ category: 'fitness' }));

      expect(createQuestRun).toHaveBeenCalledTimes(1);
      expect(setItem).toHaveBeenCalledWith('QUEST_RUN_ID', 'mock-quest-run-id');
    });

    it('throws for a cooperative custom quest with no run id', async () => {
      await expect(
        QuestTimer.prepareQuest(customQuest({ category: 'cooperative' }))
      ).rejects.toThrow(
        'Cooperative quest must have an existing quest run ID from server'
      );
      expect(createQuestRun).not.toHaveBeenCalled();
    });

    it('stores cooperative run data when the server returns an invitation', async () => {
      (createQuestRun as jest.Mock).mockResolvedValue({
        id: 'coop-run-id',
        invitationId: 'invitation-1',
        // The server sends participants as bare ids or as objects; both must
        // normalise to the object shape.
        participants: [
          'user-a',
          { userId: 'user-b', ready: true, status: 'accepted' },
        ],
      });

      await QuestTimer.prepareQuest(storyQuest());

      expect(mockQuestStore.setCooperativeQuestRun).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'coop-run-id',
          questId: 'test-quest-id',
          hostId: 'test-user-id',
          status: 'pending',
          invitationId: 'invitation-1',
          participants: [
            { userId: 'user-a', ready: false, status: 'pending' },
            { userId: 'user-b', ready: true, status: 'accepted' },
          ],
        })
      );
    });

    it('prefers the server questId over the local template id', async () => {
      // The fallback chain ends at `quest-${run.id}`. Getting the order wrong
      // attaches the run to the wrong quest in the store.
      (createQuestRun as jest.Mock).mockResolvedValue({
        id: 'coop-run-id',
        questId: 'server-quest-id',
        invitationId: 'invitation-1',
        participants: [],
      });

      await QuestTimer.prepareQuest(storyQuest());

      expect(mockQuestStore.setCooperativeQuestRun).toHaveBeenCalledWith(
        expect.objectContaining({ questId: 'server-quest-id' })
      );
    });

    it('falls back to the nested quest id when the server sends no questId', async () => {
      (createQuestRun as jest.Mock).mockResolvedValue({
        id: 'coop-run-id',
        quest: { id: 'nested-quest-id' },
        invitationId: 'invitation-1',
        participants: [],
      });

      await QuestTimer.prepareQuest(storyQuest());

      expect(mockQuestStore.setCooperativeQuestRun).toHaveBeenCalledWith(
        expect.objectContaining({ questId: 'nested-quest-id' })
      );
    });

    it('records an empty host id when there is no signed-in user', async () => {
      (useUserStore.getState as jest.Mock).mockReturnValue({ user: null });
      (createQuestRun as jest.Mock).mockResolvedValue({
        id: 'coop-run-id',
        invitationId: 'invitation-1',
        participants: [],
      });

      await QuestTimer.prepareQuest(storyQuest());

      expect(mockQuestStore.setCooperativeQuestRun).toHaveBeenCalledWith(
        expect.objectContaining({ hostId: '' })
      );
    });

    it('does not store cooperative run data when participants are missing', async () => {
      // Both fields are required. With `||` in place of `&&`, a solo run that
      // happens to carry an invitationId would be promoted to cooperative.
      (createQuestRun as jest.Mock).mockResolvedValue({
        id: 'run-id',
        invitationId: 'invitation-1',
      });

      await QuestTimer.prepareQuest(storyQuest());

      expect(mockQuestStore.setCooperativeQuestRun).not.toHaveBeenCalled();
    });

    it('does not store cooperative run data for a solo run', async () => {
      await QuestTimer.prepareQuest(storyQuest());

      expect(mockQuestStore.setCooperativeQuestRun).not.toHaveBeenCalled();
    });
  });

  describe('notification hygiene at prepare', () => {
    it('clears stale notifications when notifications are enabled', async () => {
      (areNotificationsEnabled as jest.Mock).mockResolvedValue(true);

      await QuestTimer.prepareQuest(storyQuest());

      expect(clearAllNotifications).toHaveBeenCalled();
    });

    it('does not clear notifications when the user has them disabled', async () => {
      (areNotificationsEnabled as jest.Mock).mockResolvedValue(false);

      await QuestTimer.prepareQuest(storyQuest());

      expect(clearAllNotifications).not.toHaveBeenCalled();
    });
  });

  describe('Live Activity payloads', () => {
    it('starts the pending card with the ready copy and duration', async () => {
      await QuestTimer.prepareQuest(storyQuest());

      expect(OneSignal.LiveActivities.startDefault).toHaveBeenCalledWith(
        expect.any(String),
        {
          title: 'Quest Ready',
          description: 'Lock your phone to begin your quest',
        },
        { durationMinutes: 15, status: 'pending' }
      );
    });

    it('publishes the minted activity id to the quest store', async () => {
      await QuestTimer.prepareQuest(storyQuest());

      const mintedId = (OneSignal.LiveActivities.startDefault as jest.Mock).mock
        .calls[0][0];
      expect(mockQuestStore.setLiveActivityId).toHaveBeenCalledWith(mintedId);
    });

    it('reuses the prepare-time id and flips the card to active on lock', async () => {
      // Minting a second id here is the H1 defect: the server's stale-activity
      // sweep would dismiss the card belonging to the running quest.
      await QuestTimer.prepareQuest(storyQuest());
      const preparedId = (OneSignal.LiveActivities.startDefault as jest.Mock)
        .mock.calls[0][0];

      await QuestTimer.onPhoneLocked();

      expect(OneSignal.LiveActivities.startDefault).toHaveBeenLastCalledWith(
        preparedId,
        { title: 'Test Quest', description: 'Focus on your quest' },
        { durationMinutes: 15, status: 'active' }
      );
    });

    it('does not touch Live Activities on Android', async () => {
      Platform.OS = 'android';

      await QuestTimer.prepareQuest(storyQuest());

      expect(OneSignal.LiveActivities.startDefault).not.toHaveBeenCalled();
      // H2 registration is iOS-only — there is no card to register. Asserted
      // as "not called at all" rather than by argument shape, because
      // expect.anything() does not match null: a `not.toHaveBeenCalledWith(
      // expect.anything(), false, expect.anything())` assertion still passes
      // against an actual call of (runId, false, null).
      expect(updatePhoneLockStatus).not.toHaveBeenCalled();

      // The lock-time card update is iOS-only too.
      await QuestTimer.onPhoneLocked();
      expect(OneSignal.LiveActivities.startDefault).not.toHaveBeenCalled();
    });
  });

  describe('Android background service', () => {
    beforeEach(() => {
      Platform.OS = 'android';
    });

    it('starts the foreground service with a declared type and icon', async () => {
      await QuestTimer.prepareQuest(storyQuest());

      // Asserted as a whole object, not objectContaining: dropping
      // foregroundServiceType kills the service on Android 14+, and an
      // objectContaining assertion would not notice.
      expect(BackgroundService.start).toHaveBeenCalledWith(
        expect.any(Function),
        {
          taskName: 'QuestTimer',
          taskTitle: 'Quest Ready',
          taskDesc: 'Lock your phone to begin your quest',
          taskIcon: { name: 'ic_launcher', type: 'mipmap' },
          color: '#77c5bf',
          foregroundServiceType: ['specialUse'],
          progressBar: { max: 100, value: 0, indeterminate: true },
          parameters: {
            questDuration: 900000, // 15 * 60 * 1000
            questTitle: 'Test Quest',
            questDescription: 'Test quest recap',
            questId: 'test-quest-id',
          },
        }
      );
    });

    it('falls back to the title when the template has no recap', async () => {
      await QuestTimer.prepareQuest(customQuest({ title: 'Go for a walk' }));

      expect(BackgroundService.start).toHaveBeenCalledWith(
        expect.any(Function),
        expect.objectContaining({
          parameters: expect.objectContaining({
            questDescription: 'Go for a walk',
          }),
        })
      );
    });

    it('falls back to generic copy when the recap is empty', async () => {
      await QuestTimer.prepareQuest(storyQuest({ recap: '' }));

      expect(BackgroundService.start).toHaveBeenCalledWith(
        expect.any(Function),
        expect.objectContaining({
          parameters: expect.objectContaining({
            questDescription: 'Focus on your quest',
          }),
        })
      );
    });

    it('updates the notification on lock when the service is running', async () => {
      BackgroundService.isRunning.mockReturnValue(true);

      await QuestTimer.prepareQuest(storyQuest());
      await QuestTimer.onPhoneLocked();

      expect(BackgroundService.updateNotification).toHaveBeenCalledWith({
        taskTitle: 'Quest in progress: Test Quest',
        taskDesc: 'Keep your phone locked for 15 minutes to complete the quest',
        progressBar: { max: 100, value: 0, indeterminate: false },
      });
    });

    it('does not update the notification when no service is running', async () => {
      BackgroundService.isRunning.mockReturnValue(false);

      await QuestTimer.prepareQuest(storyQuest());
      await QuestTimer.onPhoneLocked();

      expect(BackgroundService.updateNotification).not.toHaveBeenCalled();
    });

    it('does not update the notification on iOS', async () => {
      Platform.OS = 'ios';
      BackgroundService.isRunning.mockReturnValue(true);

      await QuestTimer.prepareQuest(storyQuest());
      await QuestTimer.onPhoneLocked();

      expect(BackgroundService.updateNotification).not.toHaveBeenCalled();
    });
  });

  describe('persistence round-trip', () => {
    it('writes every quest key when the phone locks', async () => {
      const template = storyQuest();
      await QuestTimer.prepareQuest(template);

      await QuestTimer.onPhoneLocked();

      const { questStartTime, oneSignalActivityId } = readQuestTimerStatics();
      expect(setItem).toHaveBeenCalledWith(
        'QUEST_TIMER_TEMPLATE',
        JSON.stringify(template)
      );
      expect(setItem).toHaveBeenCalledWith(
        'QUEST_TIMER_START_TIME',
        String(questStartTime)
      );
      expect(setItem).toHaveBeenCalledWith(
        'ONESIGNAL_ACTIVITY_ID',
        oneSignalActivityId
      );
      expect(setItem).toHaveBeenCalledWith('QUEST_RUN_ID', 'mock-quest-run-id');
    });

    it('clears the stored ids when there is no card and no run', async () => {
      // Android mints no Live Activity; a failed createQuestRun leaves no run
      // id. Both stale keys must be removed or a new quest attaches to a dead
      // run / an undismissable card.
      Platform.OS = 'android';
      (createQuestRun as jest.Mock).mockRejectedValue(new Error('server down'));

      await QuestTimer.prepareQuest(storyQuest());

      expect(removeItem).toHaveBeenCalledWith('ONESIGNAL_ACTIVITY_ID');
      expect(removeItem).toHaveBeenCalledWith('QUEST_RUN_ID');
      expect(setItem).not.toHaveBeenCalledWith(
        'QUEST_RUN_ID',
        expect.anything()
      );
    });

    it('restores a running quest from storage after an app restart', async () => {
      // Every static is null here (fresh process). Everything the unlock path
      // needs — run id, start time, template — has to come back out of
      // storage, so this one assertion covers the whole read path.
      const template = storyQuest();
      mockStorage['QUEST_TIMER_TEMPLATE'] = JSON.stringify(template);
      mockStorage['QUEST_TIMER_START_TIME'] = String(Date.now() - 60_000);
      mockStorage['ONESIGNAL_ACTIVITY_ID'] = 'restored-activity-id';
      mockStorage['QUEST_RUN_ID'] = 'restored-run-id';

      await QuestTimer.onPhoneUnlocked();

      expect(mockQuestStore.setLiveActivityId).toHaveBeenCalledWith(
        'restored-activity-id'
      );
      expect(updatePhoneLockStatus).toHaveBeenCalledWith(
        'restored-run-id',
        false
      );
      expect(mockQuestStore.failQuest).toHaveBeenCalledTimes(1);
    });

    it('does not push a null activity id into the store on restore', async () => {
      // Android has no Live Activity, so nothing is stored under that key.
      // Publishing null would clear the store's handle rather than leave it.
      mockStorage['QUEST_TIMER_TEMPLATE'] = JSON.stringify(storyQuest());
      mockStorage['QUEST_TIMER_START_TIME'] = String(Date.now() - 60_000);
      mockStorage['QUEST_RUN_ID'] = 'restored-run-id';

      await QuestTimer.onPhoneUnlocked();

      expect(mockQuestStore.setLiveActivityId).not.toHaveBeenCalled();
    });

    it('does not restamp the start time when a lock event repeats', async () => {
      await QuestTimer.prepareQuest(storyQuest());
      await QuestTimer.onPhoneLocked();
      const firstStart = readQuestTimerStatics().questStartTime;

      // Screen off → on → off without the quest ever being unlocked. Clearing
      // the duplicate-lock flag is what a real second lock event does.
      readQuestTimerStatics().isPhoneLocked = false;
      jest.advanceTimersByTime(60_000);
      await QuestTimer.onPhoneLocked();

      expect(readQuestTimerStatics().questStartTime).toBe(firstStart);
    });
  });

  // This is the loop that actually runs a quest while the phone is locked:
  // elapsed-time maths, the progress notification, completion detection and
  // teardown. None of it was executed by any test — ~180 of the module's
  // no-coverage mutants live here.
  //
  // The loop is `while (BackgroundService.isRunning())`, so isRunning is the
  // exit control. Every test below must either drive the loop to an explicit
  // `break` or flip isRunning false, otherwise the loop's
  // `await new Promise(r => setTimeout(r, updateInterval))` never resolves
  // under fake timers and the test hangs instead of failing.
  describe('backgroundTask', () => {
    it('does nothing without task data', async () => {
      await QuestTimer.prepareQuest(storyQuest());
      const backgroundTask = capturedBackgroundTask();
      jest.clearAllMocks();

      await backgroundTask();

      expect(BackgroundService.updateNotification).not.toHaveBeenCalled();
      expect(mockQuestStore.completeQuest).not.toHaveBeenCalled();
    });

    it('reports elapsed progress on the Android notification', async () => {
      Platform.OS = 'android';
      await QuestTimer.prepareQuest(storyQuest({ durationMinutes: 15 }));
      await QuestTimer.onPhoneLocked();
      const backgroundTask = capturedBackgroundTask();
      BackgroundService.updateNotification.mockClear();
      // Exactly half way through, so the percentage maths is pinned to a value
      // that is not 0 or 100 — either of which several mutants also produce.
      jest.advanceTimersByTime(7.5 * 60 * 1000);
      let iterations = 0;
      BackgroundService.isRunning.mockImplementation(() => iterations++ < 1);

      const running = backgroundTask(taskDataFor(15));
      await jest.advanceTimersByTimeAsync(9000); // the loop's update interval
      await running;

      expect(BackgroundService.updateNotification).toHaveBeenCalledWith({
        progressBar: { max: 100, value: 50, indeterminate: false },
      });
      expect(mockQuestStore.completeQuest).not.toHaveBeenCalled();
    });

    it('completes the quest once the duration elapses', async () => {
      mockQuestStore.activeQuest = { id: 'test-quest-id', startTime: 0 };
      await QuestTimer.prepareQuest(storyQuest({ durationMinutes: 15 }));
      await QuestTimer.onPhoneLocked();
      const backgroundTask = capturedBackgroundTask();
      const activityId = readQuestTimerStatics().oneSignalActivityId;
      jest.advanceTimersByTime(15 * 60 * 1000);
      BackgroundService.isRunning.mockReturnValue(true);
      (OneSignal.LiveActivities.startDefault as jest.Mock).mockClear();

      await backgroundTask(taskDataFor(15));

      expect(mockQuestStore.completeQuest).toHaveBeenCalledWith(true);
      expect(BackgroundService.updateNotification).toHaveBeenCalledWith({
        progressBar: { max: 100, value: 100, indeterminate: false },
      });
      expect(OneSignal.LiveActivities.startDefault).toHaveBeenCalledWith(
        activityId,
        {
          title: 'Quest Complete',
          description: 'Congratulations on finishing your quest!',
        },
        { durationMinutes: 15, status: 'completed' }
      );
      // Teardown, or the service keeps running after the quest is over.
      expect(BackgroundService.stop).toHaveBeenCalled();
      expect(removeItem).toHaveBeenCalledWith('QUEST_RUN_ID');
    });

    it('schedules the completion notification on Android only', async () => {
      Platform.OS = 'android';
      mockQuestStore.activeQuest = { id: 'test-quest-id', startTime: 0 };
      await QuestTimer.prepareQuest(storyQuest({ durationMinutes: 15 }));
      await QuestTimer.onPhoneLocked();
      const backgroundTask = capturedBackgroundTask();
      jest.advanceTimersByTime(15 * 60 * 1000);
      BackgroundService.isRunning.mockReturnValue(true);
      (OneSignal.LiveActivities.startDefault as jest.Mock).mockClear();

      await backgroundTask(taskDataFor(15));

      expect(scheduleQuestCompletionNotification).toHaveBeenCalledWith(
        'test-quest-id'
      );
      // Android has no Live Activity to complete.
      expect(OneSignal.LiveActivities.startDefault).not.toHaveBeenCalled();
    });

    it('does not schedule a completion notification on iOS', async () => {
      mockQuestStore.activeQuest = { id: 'test-quest-id', startTime: 0 };
      await QuestTimer.prepareQuest(storyQuest({ durationMinutes: 15 }));
      await QuestTimer.onPhoneLocked();
      const backgroundTask = capturedBackgroundTask();
      jest.advanceTimersByTime(15 * 60 * 1000);
      BackgroundService.isRunning.mockReturnValue(true);

      await backgroundTask(taskDataFor(15));

      expect(scheduleQuestCompletionNotification).not.toHaveBeenCalled();
    });

    it('tears down when it notices the phone was unlocked', async () => {
      await QuestTimer.prepareQuest(storyQuest());
      await QuestTimer.onPhoneLocked();
      const backgroundTask = capturedBackgroundTask();
      // The unlock listener has already flipped the flag. The loop has to
      // notice and stop, rather than ticking against an abandoned quest.
      readQuestTimerStatics().isPhoneLocked = false;
      BackgroundService.isRunning.mockReturnValue(true);
      BackgroundService.updateNotification.mockClear();

      await backgroundTask(taskDataFor(15));

      expect(BackgroundService.stop).toHaveBeenCalled();
      expect(BackgroundService.updateNotification).not.toHaveBeenCalled();
      expect(mockQuestStore.completeQuest).not.toHaveBeenCalled();
    });

    it('completes a cooperative quest still stuck in the pending state', async () => {
      questStoreMockModule.useQuestStore.__mockStore.pendingQuest = {
        id: 'test-quest-id',
        durationMinutes: 15,
        reward: { xp: 100 },
      };
      await QuestTimer.prepareQuest(storyQuest({ durationMinutes: 15 }));
      await QuestTimer.onPhoneLocked();
      const backgroundTask = capturedBackgroundTask();
      jest.advanceTimersByTime(15 * 60 * 1000);
      BackgroundService.isRunning.mockReturnValue(true);

      await backgroundTask(taskDataFor(15));

      expect(mockSetState).toHaveBeenCalledWith(
        expect.objectContaining({
          pendingQuest: null,
          activeQuest: null,
          recentCompletedQuest: expect.objectContaining({
            id: 'test-quest-id',
            status: 'completed',
          }),
        })
      );
      expect(mockCharacterStore.addXP).toHaveBeenCalledWith(100);
      expect(mockCharacterStore.updateStreak).toHaveBeenCalled();
      // Stale user details would otherwise show the pre-quest XP.
      expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
        queryKey: ['user', 'details'],
      });
    });

    it('starts a cooperative quest once the server reports it active', async () => {
      // Locked, but the server had not activated the run when the service
      // started, so no start time was ever stamped.
      mockQuestStore.cooperativeQuestRun = {
        id: 'coop-run-id',
        status: 'pending',
      };
      const template = storyQuest();
      await QuestTimer.prepareQuest(template, 'coop-run-id');
      const backgroundTask = capturedBackgroundTask();
      const actualStartTime = Date.now() - 60_000;
      (getQuestRunStatus as jest.Mock).mockResolvedValue({
        id: 'coop-run-id',
        status: 'active',
        actualStartTime,
        scheduledEndTime: actualStartTime + 900_000,
      });
      readQuestTimerStatics().isPhoneLocked = true;
      let iterations = 0;
      BackgroundService.isRunning.mockImplementation(() => iterations++ < 1);
      mockQuestStore.startQuest.mockClear();

      const running = backgroundTask(taskDataFor(15));
      await jest.advanceTimersByTimeAsync(9000);
      await running;

      // Anchored to the server's time, not Date.now(), or this participant
      // finishes at a different moment from everyone else in the run.
      expect(mockQuestStore.startQuest).toHaveBeenCalledWith({
        ...template,
        startTime: actualStartTime,
        status: 'active',
      });
      expect(mockQuestStore.setCooperativeQuestRun).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'coop-run-id', status: 'active' })
      );
    });

    it('fails the quest when the server reports the cooperative run failed', async () => {
      mockQuestStore.cooperativeQuestRun = {
        id: 'coop-run-id',
        status: 'pending',
      };
      await QuestTimer.prepareQuest(storyQuest(), 'coop-run-id');
      const backgroundTask = capturedBackgroundTask();
      (getQuestRunStatus as jest.Mock).mockResolvedValue({
        id: 'coop-run-id',
        status: 'failed',
      });
      readQuestTimerStatics().isPhoneLocked = true;
      BackgroundService.isRunning.mockReturnValue(true);

      await backgroundTask(taskDataFor(15));

      expect(mockQuestStore.setCooperativeQuestRun).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'coop-run-id', status: 'failed' })
      );
      expect(mockQuestStore.failQuest).toHaveBeenCalled();
      expect(BackgroundService.stop).toHaveBeenCalled();
    });
  });
});
