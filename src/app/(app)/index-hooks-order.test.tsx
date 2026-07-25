/**
 * Test to verify React Hooks are declared in the correct order
 * This test will fail/hang if hooks are declared after they're used in useEffect
 */
import React from 'react';

import { render } from '@/lib/test-utils';

// Mock the router
const mockPush = jest.fn();
const mockReplace = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({
    replace: mockReplace,
    push: mockPush,
  }),
}));

// Mock react-native-reanimated
jest.mock('react-native-reanimated', () =>
  require('react-native-reanimated/mock')
);

// expo-haptics is a native module the jest environment can't load; the
// DecisionSlider component this screen now renders references its enums at
// call sites, so stub the surface.
jest.mock('expo-haptics', () => ({
  selectionAsync: jest.fn(),
  impactAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy' },
}));

// Mock QuestTimer
jest.mock('@/lib/services/quest-timer', () => ({
  prepareQuest: jest.fn(),
}));

// Mock useServerQuests hook
const mockUseServerQuests = {
  isLoading: false,
  error: null,
  serverQuests: [],
  hasMoreQuests: false,
  storylineComplete: false,
  storylineProgress: undefined,
  options: [],
};

jest.mock('@/hooks/use-server-quests', () => ({
  useServerQuests: jest.fn(() => mockUseServerQuests),
}));

// Mock quest store
const mockQuestStoreState: any = {
  activeQuest: null,
  pendingQuest: null,
  availableQuests: [],
  completedQuests: [],
  getCompletedQuests: () => [],
  prepareQuest: jest.fn(),
  refreshAvailableQuests: jest.fn(),
};

jest.mock('@/store/quest-store', () => ({
  useQuestStore: Object.assign(
    jest.fn((selector) => selector(mockQuestStoreState)),
    {
      getState: jest.fn(() => mockQuestStoreState),
    }
  ),
}));

// Mock AVAILABLE_QUESTS
jest.mock('@/app/data/quests', () => ({
  AVAILABLE_QUESTS: [],
}));

// Mock user services
jest.mock('@/lib/services/user', () => ({
  refreshPremiumStatus: jest.fn().mockResolvedValue({}),
}));

// Import Home component
const Home = require('./index').default;

describe('Home Component - Hooks Ordering', () => {
  // Set a reasonable timeout for this test
  jest.setTimeout(5000);

  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('should render without hanging due to hooks ordering issues', () => {
    // This test will hang/timeout if activeIndex is used before it's declared
    const { unmount } = render(<Home />);
    expect(true).toBeTruthy();

    // Clean up immediately to prevent async operations from continuing
    unmount();
  });
});
