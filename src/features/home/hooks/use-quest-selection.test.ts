import { renderHook, act } from '@testing-library/react-native';

const mockPush = jest.fn();
const mockPrepareQuest = jest.fn();
const mockQuestTimerPrepareQuest = jest.fn().mockResolvedValue(undefined);
const mockCapture = jest.fn();

// Controllable faded flag (mock-prefixed so jest.mock factory can reference it)
let mockFaded = false;

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush }),
}));

jest.mock('posthog-react-native', () => ({
  usePostHog: () => ({ capture: mockCapture }),
}));

jest.mock('@/lib/services/quest-timer', () => ({
  prepareQuest: mockQuestTimerPrepareQuest,
}));

jest.mock('@/store/quest-store', () => ({
  useQuestStore: jest.fn((selector: any) =>
    selector({ prepareQuest: mockPrepareQuest })
  ),
}));

jest.mock('@/app/data/quests', () => ({
  AVAILABLE_QUESTS: [{ id: 'quest-1', mode: 'story' }],
}));

jest.mock('@/hooks/use-spirit', () => ({
  isFadedNow: () => mockFaded,
}));

const { useQuestSelection } = require('./use-quest-selection');

describe('useQuestSelection - spirit fading gate', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFaded = false;
  });

  it('routes home and skips prepareQuest when faded', async () => {
    // Arrange
    mockFaded = true;
    const { result } = renderHook(() =>
      useQuestSelection({ serverQuests: [], serverOptions: [] })
    );

    // Act
    await act(async () => {
      await result.current.handleQuestOptionSelect('quest-1');
    });

    // Assert
    expect(mockPush).toHaveBeenCalledWith('/(app)');
    expect(mockQuestTimerPrepareQuest).not.toHaveBeenCalled();
    expect(mockPrepareQuest).not.toHaveBeenCalled();
  });

  it('starts the quest when not faded', async () => {
    // Arrange
    mockFaded = false;
    const { result } = renderHook(() =>
      useQuestSelection({ serverQuests: [], serverOptions: [] })
    );

    // Act
    await act(async () => {
      await result.current.handleQuestOptionSelect('quest-1');
    });

    // Assert
    expect(mockPush).toHaveBeenCalledWith('/pending-quest');
    expect(mockQuestTimerPrepareQuest).toHaveBeenCalled();
  });
});
