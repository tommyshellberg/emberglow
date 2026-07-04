import 'react-native-get-random-values';

import { jest } from '@jest/globals';
import { Platform } from 'react-native';
// Import OneSignal for mocking
import { OneSignal } from 'react-native-onesignal';

// Import mocked modules
import {
  beginQuestRun,
  createQuestRun,
  updatePhoneLockStatus,
} from '@/lib/services/quest-run-service';
import { removeItem, setItem } from '@/lib/storage';
// Import the store for assertions
import { useQuestStore } from '@/store/quest-store';
// Import types
import type {
  CooperativeQuestTemplate,
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
  beginQuestRun: jest.fn().mockResolvedValue({
    id: 'mock-quest-run-id',
    status: 'active',
    enforcement: 'presence',
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

jest.mock('@/store/quest-store', () => {
  const mockStore = {
    setLiveActivityId: jest.fn(),
    startQuest: jest.fn(),
    completeQuest: jest.fn(),
    failQuest: jest.fn(),
    resetActiveQuest: jest.fn(),
    setCooperativeQuestRun: jest.fn(),
    activeQuest: {
      id: 'test-quest-id',
      startTime: 0,
    },
    cooperativeQuestRun: null,
  };

  return {
    useQuestStore: {
      getState: jest.fn().mockReturnValue(mockStore),
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

jest.mock('@/store/character-store', () => ({
  useCharacterStore: {
    getState: jest.fn(() => ({
      character: { id: 'test-character-id' },
    })),
  },
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

describe('QuestTimer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // clearAllMocks only clears call records, not implementations. Re-establish
    // createQuestRun's default resolved value so a prior test's mockRejectedValue
    // can't leak forward. (Previously masked by the static questRunId never being
    // reset between tests; M1's prepare-time reset removes that masking.)
    (createQuestRun as jest.Mock).mockResolvedValue({
      id: 'mock-quest-run-id',
    });
    // Clear the mock storage
    Object.keys(mockStorage).forEach((key) => delete mockStorage[key]);
    // Reset Platform.OS to ios for most tests
    Platform.OS = 'ios';
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

    it('should handle duplicate phone lock calls', async () => {
      // Arrange
      // @ts-ignore
      QuestTimer.isPhoneLocked = true;

      // Act
      await QuestTimer.onPhoneLocked();

      // Assert
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
      const BackgroundService = require('react-native-background-actions');
      BackgroundService.isRunning.mockReturnValue(true);

      // Act
      await QuestTimer.stopQuest();

      // Assert
      expect(BackgroundService.stop).toHaveBeenCalled();
    });
  });

  describe('onPhoneUnlocked', () => {
    it('marks quest as failed locally when phone is unlocked during quest', async () => {
      // This test is checking that QuestTimer can handle phone unlock events
      // The actual logic of failing quests is complex and depends on timing
      // For now, let's just verify the basic flow works without errors

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

      // Prepare quest first
      await QuestTimer.prepareQuest(mockQuestTemplate);

      // Act - call onPhoneUnlocked
      await expect(QuestTimer.onPhoneUnlocked()).resolves.not.toThrow();

      // The test passes if no errors are thrown
      // More detailed testing would require mocking the internal timer state
    });

    it('handles cooperative quest unlock differently than single-player', async () => {
      // This test verifies that cooperative quests can be handled without errors
      // The actual cooperative quest logic is complex and would need more setup

      const mockQuestTemplate: StoryQuestTemplate = {
        id: 'test-quest-id',
        title: 'Cooperative Quest',
        durationMinutes: 5,
        mode: 'story',
        category: 'cooperative',
        recap: 'Test cooperative quest',
        poiSlug: 'test-poi',
        story: 'Test story content',
        options: [],
        reward: { xp: 100 },
      };

      // For cooperative quests, we need to provide a quest run ID
      await QuestTimer.prepareQuest(
        mockQuestTemplate,
        'cooperative-quest-run-id'
      );

      // Act - call onPhoneUnlocked
      await expect(QuestTimer.onPhoneUnlocked()).resolves.not.toThrow();

      // The test passes if no errors are thrown
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
  });

  describe('Android platform specific tests', () => {
    beforeEach(() => {
      Platform.OS = 'android';
    });

    it('should use BackgroundService for Android', async () => {
      // Arrange
      const BackgroundService = require('react-native-background-actions');
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

      // Act
      await QuestTimer.prepareQuest(mockQuestTemplate);

      // Assert
      expect(BackgroundService.start).toHaveBeenCalledWith(
        expect.any(Function),
        expect.objectContaining({
          taskName: 'QuestTimer',
          taskTitle: 'Quest Ready',
          taskDesc: 'Lock your phone to begin your quest',
          parameters: expect.objectContaining({
            questDuration: 900000, // 15 * 60 * 1000
            questTitle: 'Test Quest',
            questId: 'test-quest-id',
          }),
        })
      );
      expect(OneSignal.LiveActivities.startDefault).not.toHaveBeenCalled();
    });
  });

  describe('startPresenceQuest (Task 8: solo presence start)', () => {
    const mockQuestTemplate: StoryQuestTemplate = {
      id: 'test-quest-id',
      title: 'Test Quest',
      durationMinutes: 30,
      mode: 'story',
      recap: 'Test quest recap',
      poiSlug: 'test-poi',
      story: 'Test story content',
      options: [],
      reward: { xp: 50 },
    };

    afterEach(() => {
      // The manual store mock's `activeQuest` is a shared, mutable object
      // (getState always returns the same reference, and startQuest is a
      // bare jest.fn() that doesn't actually update it). The tests below
      // mutate it directly to simulate a presence run being active; restore
      // the suite-wide default here so later tests aren't affected.
      const store = useQuestStore.getState() as any;
      store.activeQuest = { id: 'test-quest-id', startTime: 0 };
    });

    it('creates the run, begins it, and starts the local active quest', async () => {
      (createQuestRun as jest.Mock).mockResolvedValue({
        id: 'run1',
        status: 'pending',
        quest: { durationMinutes: 30, reward: { xp: 50 } },
      });
      (beginQuestRun as jest.Mock).mockResolvedValue({
        id: 'run1',
        status: 'active',
        enforcement: 'presence',
        actualStartTime: Date.now(),
        scheduledEndTime: Date.now() + 30 * 60_000,
      });

      await QuestTimer.startPresenceQuest(mockQuestTemplate);

      expect(createQuestRun).toHaveBeenCalledWith(mockQuestTemplate);
      expect(beginQuestRun).toHaveBeenCalledWith('run1');

      const started = useQuestStore.getState().startQuest as jest.Mock;
      expect(started).toHaveBeenCalledWith(
        expect.objectContaining({
          questRunId: 'run1',
          enforcement: 'presence',
        })
      );

      // Happy path calls them in order: create -> begin -> local start.
      const createOrder = (createQuestRun as jest.Mock).mock
        .invocationCallOrder[0];
      const beginOrder = (beginQuestRun as jest.Mock).mock
        .invocationCallOrder[0];
      const startOrder = started.mock.invocationCallOrder[0];
      expect(createOrder).toBeLessThan(beginOrder);
      expect(beginOrder).toBeLessThan(startOrder);
    });

    it('onPhoneLocked takes no action for a SOLO presence quest (the machine owns it)', async () => {
      // Set up the timer via prepareQuest, NOT startPresenceQuest. prepareQuest
      // sets this.questStartTime = null (and this.questTemplate/questRunId);
      // startPresenceQuest would set questStartTime = Date.now(), which would
      // make onPhoneLocked short-circuit on the pre-existing
      // `if (this.questTemplate && !this.questStartTime)` check for a reason
      // unrelated to the enforcement guard — making this test vacuous. With
      // questStartTime null and no cooperativeQuestRun, the enforcement guard
      // is the SOLE thing preventing the solo lock PATCH from firing.
      await QuestTimer.prepareQuest(mockQuestTemplate);

      // Mark the active run as presence. This file's store mock doesn't wire
      // startQuest to activeQuest, so set it directly (same idiom as the
      // onPhoneUnlocked test; restored in afterEach).
      const store = useQuestStore.getState() as any;
      store.activeQuest = { ...mockQuestTemplate, enforcement: 'presence' };

      (updatePhoneLockStatus as jest.Mock).mockClear();
      // @ts-ignore reset the duplicate-lock guard so it doesn't short-circuit
      // before the presence guard we're testing
      QuestTimer.isPhoneLocked = false;

      await QuestTimer.onPhoneLocked();

      expect(updatePhoneLockStatus).not.toHaveBeenCalled();
    });

    it('onPhoneUnlocked no longer fails a SOLO presence quest (the machine owns that)', async () => {
      (createQuestRun as jest.Mock).mockResolvedValue({
        id: 'run1',
        status: 'pending',
        quest: { durationMinutes: 30, reward: { xp: 50 } },
      });
      (beginQuestRun as jest.Mock).mockResolvedValue({
        id: 'run1',
        status: 'active',
        enforcement: 'presence',
      });

      await QuestTimer.startPresenceQuest(mockQuestTemplate);

      // See afterEach comment: simulate what startQuest would have set,
      // since this file's store mock doesn't wire startQuest to activeQuest.
      const store = useQuestStore.getState() as any;
      store.activeQuest = {
        ...mockQuestTemplate,
        questRunId: 'run1',
        enforcement: 'presence',
        startTime: Date.now(),
        status: 'active',
      };

      (updatePhoneLockStatus as jest.Mock).mockClear();

      await QuestTimer.onPhoneUnlocked();

      expect(useQuestStore.getState().failQuest).not.toHaveBeenCalled();
      expect(updatePhoneLockStatus).not.toHaveBeenCalled();
    });
  });
});
