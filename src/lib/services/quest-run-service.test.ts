import { apiClient } from '@/api';
import type { StoryQuestTemplate } from '@/store/types';

import {
  beginQuestRun,
  confirmQuestRun,
  createQuestRun,
  updateAwayStatus,
  updateQuestRunStatus,
} from './quest-run-service';

// Mock the apiClient
jest.mock('@/api', () => ({
  apiClient: {
    post: jest.fn(),
    patch: jest.fn(),
  },
}));

describe('quest-run-service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createQuestRun', () => {
    it('should create a quest run for a story quest', async () => {
      // Arrange
      const mockResponse = {
        data: {
          id: 'mock-quest-run-id',
          status: 'pending',
          participants: ['user-123'],
          quest: {
            title: 'Test Quest',
            durationMinutes: 15,
            mode: 'story',
            category: '',
            reward: { xp: 100 },
            options: [],
          },
        },
      };

      (apiClient.post as jest.Mock).mockResolvedValueOnce(mockResponse);

      const mockStoryQuest: StoryQuestTemplate = {
        id: 'test-quest-id',
        title: 'Test Quest',
        durationMinutes: 15,
        mode: 'story',
        recap: 'Test recap',
        poiSlug: 'test-poi',
        story: 'Test story',
        options: [{ id: 'option1', text: 'Option 1', nextQuestId: null }],
        reward: { xp: 100 },
      };

      // Act
      const result = await createQuestRun(mockStoryQuest);

      // Assert - without _id, it should send the full quest object
      expect(apiClient.post).toHaveBeenCalledWith('/quest-runs/', {
        quest: {
          title: 'Test Quest',
          durationMinutes: 15,
          mode: 'story',
          recap: 'Test recap',
          poiSlug: 'test-poi',
          story: 'Test story',
          options: [{ id: 'option1', text: 'Option 1', nextQuestId: null }],
          reward: { xp: 100 },
        },
      });
      expect(result).toEqual(mockResponse.data);
    });

    it('should create a quest run with questTemplateId when _id is present', async () => {
      // Arrange
      const mockResponse = {
        data: {
          id: 'quest-run-123',
          questId: 'test-quest-id',
          status: 'active',
        },
      };

      (apiClient.post as jest.Mock).mockResolvedValueOnce(mockResponse);

      const mockStoryQuest: StoryQuestTemplate & { _id: string } = {
        _id: 'server-quest-id',
        id: 'test-quest-id',
        title: 'Test Quest',
        durationMinutes: 15,
        mode: 'story',
        recap: 'Test recap',
        poiSlug: 'test-poi',
        story: 'Test story',
        options: [{ id: 'option1', text: 'Option 1', nextQuestId: null }],
        reward: { xp: 100 },
      };

      // Act
      const result = await createQuestRun(mockStoryQuest);

      // Assert - with _id, it should use questTemplateId
      expect(apiClient.post).toHaveBeenCalledWith('/quest-runs/', {
        questTemplateId: 'server-quest-id',
      });
      expect(result).toEqual(mockResponse.data);
    });

    it('should handle errors when creating a quest run', async () => {
      // Arrange
      const mockError = new Error('API error');
      (apiClient.post as jest.Mock).mockRejectedValueOnce(mockError);

      const mockStoryQuest: StoryQuestTemplate = {
        id: 'test-quest-id',
        title: 'Test Quest',
        durationMinutes: 15,
        mode: 'story',
        recap: 'Test recap',
        poiSlug: 'test-poi',
        story: 'Test story',
        options: [{ id: 'option1', text: 'Option 1', nextQuestId: null }],
        reward: { xp: 100 },
      };

      // Act & Assert
      await expect(createQuestRun(mockStoryQuest)).rejects.toThrow('API error');
      // Without _id, it should send the full quest object
      expect(apiClient.post).toHaveBeenCalledWith('/quest-runs/', {
        quest: {
          title: 'Test Quest',
          durationMinutes: 15,
          mode: 'story',
          recap: 'Test recap',
          poiSlug: 'test-poi',
          story: 'Test story',
          options: [{ id: 'option1', text: 'Option 1', nextQuestId: null }],
          reward: { xp: 100 },
        },
      });
    });
  });

  describe('updateQuestRunStatus', () => {
    it('should update a quest run status without liveActivityId', async () => {
      // Arrange
      const mockResponse = {
        data: {
          id: 'mock-quest-run-id',
          status: 'active',
          participants: ['user-123'],
          quest: {
            title: 'Test Quest',
            durationMinutes: 15,
            mode: 'story',
            category: '',
            reward: { xp: 100 },
            options: [],
          },
        },
      };

      (apiClient.patch as jest.Mock).mockResolvedValueOnce(mockResponse);

      // Act
      const result = await updateQuestRunStatus('mock-quest-run-id', 'active');

      // Assert
      expect(apiClient.patch).toHaveBeenCalledWith(
        '/quest-runs/mock-quest-run-id/status',
        { status: 'active' }
      );
      expect(result).toEqual(mockResponse.data);
    });

    it('should update a quest run status with liveActivityId', async () => {
      // Arrange
      const mockResponse = {
        data: {
          id: 'mock-quest-run-id',
          status: 'active',
          participants: ['user-123'],
          quest: {
            title: 'Test Quest',
            durationMinutes: 15,
            mode: 'story',
            category: '',
            reward: { xp: 100 },
            options: [],
          },
        },
      };

      (apiClient.patch as jest.Mock).mockResolvedValueOnce(mockResponse);

      // Act
      const result = await updateQuestRunStatus(
        'mock-quest-run-id',
        'active',
        'live-activity-123'
      );

      // Assert
      expect(apiClient.patch).toHaveBeenCalledWith(
        '/quest-runs/mock-quest-run-id/status',
        { status: 'active', liveActivityId: 'live-activity-123' }
      );
      expect(result).toEqual(mockResponse.data);
    });

    it('should handle errors when updating a quest run status', async () => {
      // Arrange
      const mockError = new Error('API error');
      (apiClient.patch as jest.Mock).mockRejectedValueOnce(mockError);

      // Act & Assert
      await expect(
        updateQuestRunStatus('mock-quest-run-id', 'failed')
      ).rejects.toThrow('API error');
      expect(apiClient.patch).toHaveBeenCalledWith(
        '/quest-runs/mock-quest-run-id/status',
        { status: 'failed' }
      );
    });

    it('sends failureReason for a left_app fail', async () => {
      (apiClient.patch as jest.Mock).mockResolvedValueOnce({
        data: { id: 'r1', status: 'failed', failureReason: 'left_app' },
      });
      await updateQuestRunStatus('r1', 'failed', null, undefined, 'left_app');
      expect(apiClient.patch).toHaveBeenCalledWith(
        '/quest-runs/r1/status',
        expect.objectContaining({ status: 'failed', failureReason: 'left_app' })
      );
    });
  });

  describe('beginQuestRun', () => {
    it('PATCHes /begin with an empty body and returns the run', async () => {
      (apiClient.patch as jest.Mock).mockResolvedValueOnce({
        data: { id: 'r1', status: 'active', enforcement: 'presence' },
      });
      const run = await beginQuestRun('r1');
      expect(apiClient.patch).toHaveBeenCalledWith('/quest-runs/r1/begin', {});
      expect(run.status).toBe('active');
    });

    it('rejects an invalid run id before hitting the network', async () => {
      await expect(beginQuestRun('null')).rejects.toThrow(
        /invalid quest run id/i
      );
      expect(apiClient.patch).not.toHaveBeenCalled();
    });
  });

  describe('confirmQuestRun', () => {
    it('PATCHes /confirm with an empty body', async () => {
      (apiClient.patch as jest.Mock).mockResolvedValueOnce({
        data: { id: 'r1', status: 'completed' },
      });
      const run = await confirmQuestRun('r1');
      expect(apiClient.patch).toHaveBeenCalledWith(
        '/quest-runs/r1/confirm',
        {}
      );
      expect(run.status).toBe('completed');
    });
  });

  describe('updateAwayStatus', () => {
    it('PATCHes away:true with the liveActivityID (server sweep needs it)', async () => {
      (apiClient.patch as jest.Mock).mockResolvedValueOnce({
        data: { id: 'r1', status: 'active' },
      });
      await updateAwayStatus('r1', true, 'activity-1');
      expect(apiClient.patch).toHaveBeenCalledWith(
        '/quest-runs/r1/away-status',
        { away: true, liveActivityID: 'activity-1' }
      );
    });

    it('omits liveActivityID on away:false (disarm needs none)', async () => {
      (apiClient.patch as jest.Mock).mockResolvedValueOnce({
        data: { id: 'r1', status: 'active' },
      });
      await updateAwayStatus('r1', false, 'activity-1');
      expect(apiClient.patch).toHaveBeenCalledWith(
        '/quest-runs/r1/away-status',
        { away: false }
      );
    });

    it('omits liveActivityID when there is none (Android)', async () => {
      (apiClient.patch as jest.Mock).mockResolvedValueOnce({
        data: { id: 'r1', status: 'active' },
      });
      await updateAwayStatus('r1', true, null);
      expect(apiClient.patch).toHaveBeenCalledWith(
        '/quest-runs/r1/away-status',
        { away: true }
      );
    });

    it('rejects an invalid run id before hitting the network', async () => {
      await expect(updateAwayStatus('null', true)).rejects.toThrow(
        /invalid quest run id/i
      );
      expect(apiClient.patch).not.toHaveBeenCalled();
    });
  });
});
