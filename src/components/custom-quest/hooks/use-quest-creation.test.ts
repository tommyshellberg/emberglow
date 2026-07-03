import { renderHook, act } from '@testing-library/react-native';

const mockPush = jest.fn();
const mockQuestStorePrepareQuest = jest.fn();
const mockQuestTimerPrepareQuest = jest.fn().mockResolvedValue(undefined);
const mockCapture = jest.fn();
const mockLogError = jest.fn();

// Controllable faded flag (mock-prefixed so jest.mock factory can reference it)
let mockFaded = false;

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush }),
}));

jest.mock('posthog-react-native', () => ({
  usePostHog: () => ({ capture: mockCapture }),
}));

jest.mock('@/lib/services/logger.service', () => ({
  log: { error: mockLogError },
}));

jest.mock('@/lib/services/quest-timer', () => ({
  prepareQuest: mockQuestTimerPrepareQuest,
}));

jest.mock('@/store/quest-store', () => ({
  useQuestStore: {
    getState: () => ({ prepareQuest: mockQuestStorePrepareQuest }),
  },
}));

jest.mock('@/hooks/use-spirit', () => ({
  isFadedNow: () => mockFaded,
}));

const { useQuestCreation } = require('./use-quest-creation');

const validFormData = {
  questName: 'Test Quest',
  questDuration: 30,
  questCategory: 'fitness',
};

describe('useQuestCreation - spirit fading gate', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFaded = false;
  });

  it('routes home and skips prepareQuest when faded', async () => {
    // Arrange
    mockFaded = true;
    const { result } = renderHook(() => useQuestCreation());

    // Act
    await act(async () => {
      await result.current.createQuest(validFormData);
    });

    // Assert
    expect(mockPush).toHaveBeenCalledWith('/(app)');
    expect(mockQuestTimerPrepareQuest).not.toHaveBeenCalled();
    expect(mockQuestStorePrepareQuest).not.toHaveBeenCalled();
  });

  it('creates the quest when not faded', async () => {
    // Arrange
    mockFaded = false;
    const { result } = renderHook(() => useQuestCreation());

    // Act
    await act(async () => {
      await result.current.createQuest(validFormData);
    });

    // Assert
    expect(mockPush).toHaveBeenCalledWith('/pending-quest');
    expect(mockQuestTimerPrepareQuest).toHaveBeenCalled();
    expect(mockQuestStorePrepareQuest).toHaveBeenCalled();
  });
});
