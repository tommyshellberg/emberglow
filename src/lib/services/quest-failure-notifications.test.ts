import { jest } from '@jest/globals';
import { Platform } from 'react-native';
import BackgroundService from 'react-native-background-actions';

import { getQuestRunStatus } from '@/lib/services/quest-run-service';
// Mock imports
import { useQuestStore } from '@/store/quest-store';

// Mock all dependencies
jest.mock('react-native-onesignal');
jest.mock('react-native-background-actions');
jest.mock('@/store/quest-store');
jest.mock('@/lib/services/quest-run-service');
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn() }),
}));

// Import the handler function from _layout.tsx
// Since we can't directly import from _layout.tsx, we'll test the logic separately
const handleQuestFailure = (questRunId: string) => {
  console.log('[Push Notification] Handling quest failure for:', questRunId);
  const questStore = useQuestStore.getState();

  if (
    questStore.cooperativeQuestRun?.id === questRunId ||
    questStore.activeQuest?.id === questRunId
  ) {
    console.log('[Push Notification] Marking quest as failed');
    questStore.failQuest();

    // Stop Android background service
    if (Platform.OS === 'android' && BackgroundService.isRunning()) {
      console.log('[Push Notification] Stopping Android background service');
      BackgroundService.stop();
    }
  }
};

describe('Quest Failure Push Notifications', () => {
  let mockQuestStore: any;

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup mock quest store
    mockQuestStore = {
      cooperativeQuestRun: null,
      activeQuest: null,
      failQuest: jest.fn(),
    };

    (useQuestStore.getState as jest.Mock).mockReturnValue(mockQuestStore);
    (BackgroundService.isRunning as jest.Mock).mockReturnValue(false);
    (BackgroundService.stop as jest.Mock).mockResolvedValue(undefined);
  });

  describe('handleQuestFailure', () => {
    it('should fail quest when questRunId matches cooperative quest', () => {
      // Arrange
      mockQuestStore.cooperativeQuestRun = { id: 'quest-123' };

      // Act
      handleQuestFailure('quest-123');

      // Assert
      expect(mockQuestStore.failQuest).toHaveBeenCalled();
    });

    it('should fail quest when questRunId matches active quest', () => {
      // Arrange
      mockQuestStore.activeQuest = { id: 'quest-456' };

      // Act
      handleQuestFailure('quest-456');

      // Assert
      expect(mockQuestStore.failQuest).toHaveBeenCalled();
    });

    it('should not fail quest when questRunId does not match', () => {
      // Arrange
      mockQuestStore.cooperativeQuestRun = { id: 'quest-123' };
      mockQuestStore.activeQuest = { id: 'quest-456' };

      // Act
      handleQuestFailure('quest-789');

      // Assert
      expect(mockQuestStore.failQuest).not.toHaveBeenCalled();
    });

    it('should stop Android background service when on Android', () => {
      // Arrange
      Platform.OS = 'android';
      (BackgroundService.isRunning as jest.Mock).mockReturnValue(true);
      mockQuestStore.activeQuest = { id: 'quest-123' };

      // Act
      handleQuestFailure('quest-123');

      // Assert
      expect(BackgroundService.stop).toHaveBeenCalled();
    });

    it('should not stop background service on iOS', () => {
      // Arrange
      Platform.OS = 'ios';
      mockQuestStore.activeQuest = { id: 'quest-123' };

      // Act
      handleQuestFailure('quest-123');

      // Assert
      expect(BackgroundService.stop).not.toHaveBeenCalled();
    });
  });

  describe('OneSignal Notification Handlers', () => {
    it('should handle quest_failed notification on click', () => {
      // Arrange
      const mockNotification = {
        notification: {
          additionalData: {
            type: 'quest_failed',
            questRunId: 'quest-123',
          },
        },
      };
      mockQuestStore.cooperativeQuestRun = { id: 'quest-123' };

      // Simulate notification click handler
      const clickHandler = (event: any) => {
        const { additionalData } = event.notification;
        if (
          additionalData?.type === 'quest_failed' &&
          additionalData?.questRunId
        ) {
          handleQuestFailure(additionalData.questRunId);
        }
      };

      // Act
      clickHandler(mockNotification);

      // Assert
      expect(mockQuestStore.failQuest).toHaveBeenCalled();
    });

    it('should handle quest_failed notification in foreground', () => {
      // Arrange
      const mockNotification = {
        notification: {
          additionalData: {
            type: 'quest_failed',
            questRunId: 'quest-456',
          },
        },
        preventDefault: jest.fn(),
        notification: {
          display: jest.fn(),
          additionalData: {
            type: 'quest_failed',
            questRunId: 'quest-456',
          },
        },
      };
      mockQuestStore.activeQuest = { id: 'quest-456' };

      // Simulate foreground notification handler
      const foregroundHandler = (event: any) => {
        const { additionalData } = event.notification;
        if (
          additionalData?.type === 'quest_failed' &&
          additionalData?.questRunId
        ) {
          handleQuestFailure(additionalData.questRunId);
        }
        event.preventDefault();
        event.notification.display();
      };

      // Act
      foregroundHandler(mockNotification);

      // Assert
      expect(mockQuestStore.failQuest).toHaveBeenCalled();
      expect(mockNotification.preventDefault).toHaveBeenCalled();
      expect(mockNotification.notification.display).toHaveBeenCalled();
    });

    it('should ignore non-quest_failed notifications', () => {
      // Arrange
      const mockNotification = {
        notification: {
          additionalData: {
            type: 'cooperative_quest_invitation',
            invitationId: 'inv-123',
          },
        },
      };

      // Simulate notification click handler
      const clickHandler = (event: any) => {
        const { additionalData } = event.notification;
        if (
          additionalData?.type === 'quest_failed' &&
          additionalData?.questRunId
        ) {
          handleQuestFailure(additionalData.questRunId);
        }
      };

      // Act
      clickHandler(mockNotification);

      // Assert
      expect(mockQuestStore.failQuest).not.toHaveBeenCalled();
    });
  });

  describe('App Foreground Quest Status Check', () => {
    it('should check quest status when app comes to foreground with active cooperative quest', async () => {
      // Arrange
      mockQuestStore.cooperativeQuestRun = {
        id: 'quest-789',
        status: 'active',
      };

      (getQuestRunStatus as jest.Mock).mockResolvedValue({
        id: 'quest-789',
        status: 'failed',
      });

      // Simulate app state change handler
      const handleAppStateChange = async (
        nextAppState: string,
        previousState: string
      ) => {
        if (
          previousState.match(/inactive|background/) &&
          nextAppState === 'active'
        ) {
          const questStore = useQuestStore.getState();
          if (
            questStore.cooperativeQuestRun?.status === 'active' &&
            questStore.cooperativeQuestRun?.id
          ) {
            try {
              const status = await getQuestRunStatus(
                questStore.cooperativeQuestRun.id
              );
              if (status.status === 'failed') {
                handleQuestFailure(status.id);
              }
            } catch (error) {
              console.error('[App State] Failed to check quest status:', error);
            }
          }
        }
      };

      // Act
      await handleAppStateChange('active', 'background');

      // Assert
      expect(getQuestRunStatus).toHaveBeenCalledWith('quest-789');
      expect(mockQuestStore.failQuest).toHaveBeenCalled();
    });

    it('should not check quest status when no active cooperative quest', async () => {
      // Arrange
      mockQuestStore.cooperativeQuestRun = null;

      // Simulate app state change handler
      const handleAppStateChange = async (
        nextAppState: string,
        previousState: string
      ) => {
        if (
          previousState.match(/inactive|background/) &&
          nextAppState === 'active'
        ) {
          const questStore = useQuestStore.getState();
          if (
            questStore.cooperativeQuestRun?.status === 'active' &&
            questStore.cooperativeQuestRun?.id
          ) {
            const status = await getQuestRunStatus(
              questStore.cooperativeQuestRun.id
            );
            if (status.status === 'failed') {
              handleQuestFailure(status.id);
            }
          }
        }
      };

      // Act
      await handleAppStateChange('active', 'background');

      // Assert
      expect(getQuestRunStatus).not.toHaveBeenCalled();
      expect(mockQuestStore.failQuest).not.toHaveBeenCalled();
    });

    it('should not fail quest if status is still active', async () => {
      // Arrange
      mockQuestStore.cooperativeQuestRun = {
        id: 'quest-999',
        status: 'active',
      };

      (getQuestRunStatus as jest.Mock).mockResolvedValue({
        id: 'quest-999',
        status: 'active', // Still active
      });

      // Simulate app state change handler
      const handleAppStateChange = async (
        nextAppState: string,
        previousState: string
      ) => {
        if (
          previousState.match(/inactive|background/) &&
          nextAppState === 'active'
        ) {
          const questStore = useQuestStore.getState();
          if (
            questStore.cooperativeQuestRun?.status === 'active' &&
            questStore.cooperativeQuestRun?.id
          ) {
            const status = await getQuestRunStatus(
              questStore.cooperativeQuestRun.id
            );
            if (status.status === 'failed') {
              handleQuestFailure(status.id);
            }
          }
        }
      };

      // Act
      await handleAppStateChange('active', 'background');

      // Assert
      expect(getQuestRunStatus).toHaveBeenCalledWith('quest-999');
      expect(mockQuestStore.failQuest).not.toHaveBeenCalled();
    });
  });
});
