import {
  cancelScheduledQuest,
  createScheduledQuest,
  discoverScheduledQuests,
  getMyScheduledQuests,
  getScheduledQuest,
  joinScheduledQuest,
  kickParticipant,
  leaveScheduledQuest,
  scheduledQuestErrorMessage,
} from './scheduled-quest-service';

jest.mock('@/api', () => ({
  apiClient: { get: jest.fn(), post: jest.fn(), delete: jest.fn() },
}));
jest.mock('@/api/common/provisional-client', () => ({
  provisionalApiClient: { get: jest.fn(), post: jest.fn(), delete: jest.fn() },
}));
jest.mock('@/lib/storage', () => ({ getItem: jest.fn(() => null) }));

const { apiClient } = jest.requireMock('@/api');
const { provisionalApiClient } = jest.requireMock(
  '@/api/common/provisional-client'
);
const { getItem } = jest.requireMock('@/lib/storage');

describe('scheduled-quest-service', () => {
  beforeEach(() => jest.clearAllMocks());

  it('creates via POST /quest-runs/scheduled', async () => {
    apiClient.post.mockResolvedValue({ data: { id: 'r1' } });
    const input = {
      title: '5am run club',
      category: 'fitness',
      durationMinutes: 60,
      scheduledStartAt: '2030-01-01T05:00:00.000Z',
      visibility: 'public' as const,
      maxParticipants: 10,
    };
    await expect(createScheduledQuest(input)).resolves.toEqual({ id: 'r1' });
    expect(apiClient.post).toHaveBeenCalledWith('/quest-runs/scheduled', input);
  });

  it('uses the provisional client when a provisional token exists', async () => {
    getItem.mockReturnValue('prov-token');
    provisionalApiClient.get.mockResolvedValue({ data: { results: [] } });
    await getMyScheduledQuests();
    expect(provisionalApiClient.get).toHaveBeenCalledWith(
      '/quest-runs/scheduled/mine'
    );
    expect(apiClient.get).not.toHaveBeenCalled();
  });

  it('hits the expected endpoints', async () => {
    // Reset the provisional-token stub from the previous test: jest.clearAllMocks()
    // wipes call history but not a previously-set mockReturnValue, so without this
    // every clientFor() call here would still resolve to provisionalApiClient.
    getItem.mockReturnValue(null);
    apiClient.get.mockResolvedValue({ data: { results: [] } });
    apiClient.post.mockResolvedValue({ data: {} });
    apiClient.delete.mockResolvedValue({ data: {} });
    await discoverScheduledQuests({ category: 'fitness' });
    expect(apiClient.get).toHaveBeenCalledWith('/quest-runs/discover', {
      params: { category: 'fitness' },
    });
    apiClient.get.mockResolvedValue({ data: { id: 'r1' } });
    await getScheduledQuest('r1');
    expect(apiClient.get).toHaveBeenCalledWith('/quest-runs/scheduled/r1');
    await joinScheduledQuest('r1');
    expect(apiClient.post).toHaveBeenCalledWith('/quest-runs/r1/join');
    await leaveScheduledQuest('r1');
    expect(apiClient.delete).toHaveBeenCalledWith('/quest-runs/r1/join');
    await cancelScheduledQuest('r1');
    expect(apiClient.delete).toHaveBeenCalledWith('/quest-runs/r1');
    await kickParticipant('r1', 'u2');
    expect(apiClient.delete).toHaveBeenCalledWith(
      '/quest-runs/r1/participants/u2'
    );
  });

  it('maps server error messages for display', () => {
    const err = {
      response: {
        status: 409,
        data: {
          message: 'You are already registered for an overlapping event',
        },
      },
    };
    expect(scheduledQuestErrorMessage(err)).toBe(
      'You are already registered for an overlapping event'
    );
    expect(scheduledQuestErrorMessage(new Error('boom'))).toBe(
      'Something went wrong - try again'
    );
  });
});
