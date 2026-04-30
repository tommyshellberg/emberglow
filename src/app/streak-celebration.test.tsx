import React from 'react';

import { fireEvent, render } from '@/lib/test-utils';
import { useCharacterStore } from '@/store/character-store';
import { useQuestStore } from '@/store/quest-store';

import StreakCelebrationScreen from './streak-celebration';

// Create a shared router mock
const mockRouterBack = jest.fn();
const mockRouterPush = jest.fn();

// Mock dependencies
jest.mock('expo-router', () => ({
  router: {
    back: mockRouterBack,
    push: mockRouterPush,
  },
  useRouter: jest.fn(() => ({
    back: mockRouterBack,
    push: mockRouterPush,
  })),
  useFocusEffect: jest.fn((callback) => {
    // Immediately call the callback to simulate screen focus
    callback();
  }),
}));

// Simple test without mocking react-native internals

jest.mock('lottie-react-native', () => 'LottieView');

jest.mock('@/components/StreakCounter', () => ({
  StreakCounter: ({ animate, size }: { animate: boolean; size: string }) => {
    const MockStreakCounter = require('react-native').Text;
    return (
      <MockStreakCounter testID="streak-counter">
        {`StreakCounter-${animate ? 'animated' : 'static'}-${size}`}
      </MockStreakCounter>
    );
  },
}));

// Mock stores
const mockCharacterStore = {
  dailyQuestStreak: 1,
  markStreakCelebrationShown: jest.fn(),
};

const mockQuestStore = {
  lastCompletedQuestTimestamp: Date.now(),
  setShouldShowStreakCelebration: jest.fn(),
};

jest.mock('@/store/character-store', () => ({
  useCharacterStore: jest.fn(),
}));

jest.mock('@/store/quest-store', () => ({
  useQuestStore: jest.fn(),
}));

const mockUseCharacterStore = useCharacterStore as jest.MockedFunction<
  typeof useCharacterStore
>;
const mockUseQuestStore = useQuestStore as jest.MockedFunction<
  typeof useQuestStore
>;

// Helper function to mock current day
const mockCurrentDay = (dayOfWeek: number) => {
  const mockDate = new Date();
  mockDate.setDate(mockDate.getDate() - mockDate.getDay() + dayOfWeek);

  // Mock both Date constructor and Date.now
  const realDate = Date;
  global.Date = jest.fn(() => mockDate) as any;
  global.Date.now = jest.fn(() => mockDate.getTime());
  global.Date.getDay = jest.fn(() => dayOfWeek);

  // Copy other static methods from real Date
  Object.setPrototypeOf(global.Date, realDate);
  Object.getOwnPropertyNames(realDate).forEach((name) => {
    if (name !== 'now' && name !== 'constructor') {
      (global.Date as any)[name] = (realDate as any)[name];
    }
  });

  return mockDate;
};

describe('StreakCelebrationScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset mock functions
    mockCharacterStore.markStreakCelebrationShown.mockClear();
    mockRouterBack.mockClear();
    mockRouterPush.mockClear();

    mockUseCharacterStore.mockImplementation((selector) =>
      selector(mockCharacterStore as any)
    );
    mockUseQuestStore.mockImplementation((selector) =>
      selector(mockQuestStore as any)
    );
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('StreakCounter Integration', () => {
    it('should render StreakCounter with correct props', () => {
      const { getByTestId } = render(<StreakCelebrationScreen />);

      const streakCounter = getByTestId('streak-counter');
      expect(streakCounter).toBeTruthy();
      expect(streakCounter.props.children).toBe('StreakCounter-animated-large');
    });

    it('should display "day streak!" text', () => {
      const { getByText } = render(<StreakCelebrationScreen />);

      const streakText = getByText('day streak!');
      expect(streakText).toBeTruthy();
    });

    it('should display the QUEST STREAK eyebrow', () => {
      const { getByText } = render(<StreakCelebrationScreen />);

      expect(getByText('QUEST STREAK')).toBeTruthy();
    });
  });

  describe('1-Day Streak (Thursday)', () => {
    beforeEach(() => {
      // Mock Thursday (day 4 of week)
      mockCurrentDay(4);
      mockCharacterStore.dailyQuestStreak = 1;
    });

    it('should show Thursday as completed and 4 empty days after', () => {
      const { getByText, getAllByTestId } = render(<StreakCelebrationScreen />);

      // Check day names are displayed correctly
      expect(getByText('Th')).toBeTruthy(); // Thursday - first day
      expect(getByText('Fr')).toBeTruthy(); // Friday
      expect(getByText('Sa')).toBeTruthy(); // Saturday
      expect(getByText('Su')).toBeTruthy(); // Sunday
      expect(getByText('Mo')).toBeTruthy(); // Monday

      // Check that we have 5 day containers
      const flameContainers = getAllByTestId('flame-container');
      expect(flameContainers).toHaveLength(5);
    });
  });

  describe('2-Day Streak (Wednesday)', () => {
    beforeEach(() => {
      // Mock Wednesday (day 3 of week)
      mockCurrentDay(3);
      mockCharacterStore.dailyQuestStreak = 2;
    });

    it('should show Tuesday and Wednesday as completed, 3 empty days after', () => {
      const { getByText, getAllByTestId } = render(<StreakCelebrationScreen />);

      // Check day names - should start with Tuesday (streak start)
      expect(getByText('Tu')).toBeTruthy(); // Tuesday - streak start
      expect(getByText('We')).toBeTruthy(); // Wednesday - today
      expect(getByText('Th')).toBeTruthy(); // Thursday - empty
      expect(getByText('Fr')).toBeTruthy(); // Friday - empty
      expect(getByText('Sa')).toBeTruthy(); // Saturday - empty

      const flameContainers = getAllByTestId('flame-container');
      expect(flameContainers).toHaveLength(5);
    });
  });

  describe('5-Day Streak (Friday)', () => {
    beforeEach(() => {
      // Mock Friday (day 5 of week)
      mockCurrentDay(5);
      mockCharacterStore.dailyQuestStreak = 5;
    });

    it('should show all 5 days as completed ending with today', () => {
      const { getByText, getAllByTestId } = render(<StreakCelebrationScreen />);

      // Should show Monday through Friday (5 consecutive days ending today)
      expect(getByText('Mo')).toBeTruthy(); // Monday
      expect(getByText('Tu')).toBeTruthy(); // Tuesday
      expect(getByText('We')).toBeTruthy(); // Wednesday
      expect(getByText('Th')).toBeTruthy(); // Thursday
      expect(getByText('Fr')).toBeTruthy(); // Friday - today

      const flameContainers = getAllByTestId('flame-container');
      expect(flameContainers).toHaveLength(5);
    });
  });

  describe('6+ Day Streak (Sunday)', () => {
    beforeEach(() => {
      // Mock Sunday (day 0 of week)
      mockCurrentDay(0);
      mockCharacterStore.dailyQuestStreak = 7;
    });

    it('should show 5 most recent completed days ending with today', () => {
      const { getByText, getAllByTestId } = render(<StreakCelebrationScreen />);

      // Should show Wednesday through Sunday (5 days ending with today)
      expect(getByText('We')).toBeTruthy(); // Wednesday
      expect(getByText('Th')).toBeTruthy(); // Thursday
      expect(getByText('Fr')).toBeTruthy(); // Friday
      expect(getByText('Sa')).toBeTruthy(); // Saturday
      expect(getByText('Su')).toBeTruthy(); // Sunday - today

      const flameContainers = getAllByTestId('flame-container');
      expect(flameContainers).toHaveLength(5);
    });
  });

  describe('0-Day Streak', () => {
    beforeEach(() => {
      mockCurrentDay(2); // Tuesday
      mockCharacterStore.dailyQuestStreak = 0;
    });

    it('should show today and 4 empty days after', () => {
      const { getByText, getAllByTestId } = render(<StreakCelebrationScreen />);

      // Should show Tuesday through Saturday
      expect(getByText('Tu')).toBeTruthy(); // Tuesday - today
      expect(getByText('We')).toBeTruthy(); // Wednesday
      expect(getByText('Th')).toBeTruthy(); // Thursday
      expect(getByText('Fr')).toBeTruthy(); // Friday
      expect(getByText('Sa')).toBeTruthy(); // Saturday

      const flameContainers = getAllByTestId('flame-container');
      expect(flameContainers).toHaveLength(5);
    });
  });

  describe('UI Elements', () => {
    it('should display the streak reminder text', () => {
      const { getByText } = render(<StreakCelebrationScreen />);

      expect(
        getByText("Complete a quest each day so your streak won't reset!")
      ).toBeTruthy();
    });

    it('should have Share and Continue buttons', () => {
      const { getByText } = render(<StreakCelebrationScreen />);

      expect(getByText('Share')).toBeTruthy();
      expect(getByText('CONTINUE')).toBeTruthy();
    });
  });

  describe('Button Interactions', () => {
    it('should navigate back when Continue button is pressed', () => {
      const { getByText } = render(<StreakCelebrationScreen />);

      const continueButton = getByText('CONTINUE');
      fireEvent.press(continueButton);

      expect(mockRouterBack).toHaveBeenCalled();
    });

    it('should call setShouldShowStreakCelebration(false) when Continue is pressed', () => {
      const mockSetShouldShowStreakCelebration = jest.fn();
      mockQuestStore.setShouldShowStreakCelebration =
        mockSetShouldShowStreakCelebration;

      mockUseQuestStore.mockImplementation((selector) =>
        selector(mockQuestStore as any)
      );

      const { getByText } = render(<StreakCelebrationScreen />);

      const continueButton = getByText('CONTINUE');
      fireEvent.press(continueButton);

      expect(mockSetShouldShowStreakCelebration).toHaveBeenCalledWith(false);
    });
  });

  describe('Store Integration', () => {
    it('should call markStreakCelebrationShown when screen is accessed', () => {
      render(<StreakCelebrationScreen />);

      // The useFocusEffect should trigger markStreakCelebrationShown
      expect(mockCharacterStore.markStreakCelebrationShown).toHaveBeenCalled();
    });
  });

  describe('Confetti Animation', () => {
    it('should render LottieView for confetti animation', () => {
      const { UNSAFE_getByType } = render(<StreakCelebrationScreen />);

      // LottieView should be rendered
      const lottieView = UNSAFE_getByType('LottieView' as any);
      expect(lottieView).toBeTruthy();
    });
  });

  describe('Accessibility', () => {
    it('should have accessible Continue button', () => {
      const { getByLabelText } = render(<StreakCelebrationScreen />);

      const continueButton = getByLabelText('Continue to home screen');
      expect(continueButton).toBeTruthy();
      expect(continueButton.props.accessibilityRole).toBe('button');
      expect(continueButton.props.accessibilityHint).toBe(
        'Returns to the main app'
      );
    });

    it('should have accessible Share button', () => {
      const { getByLabelText } = render(<StreakCelebrationScreen />);

      const shareButton = getByLabelText(/Share your \d+ day streak/);
      expect(shareButton).toBeTruthy();
      expect(shareButton.props.accessibilityRole).toBe('button');
      expect(shareButton.props.accessibilityHint).toBe(
        'Opens sharing options to share your streak progress'
      );
    });
  });
});
