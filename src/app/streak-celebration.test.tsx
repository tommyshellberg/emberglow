import React from 'react';

import { fireEvent, render } from '@/lib/test-utils';
import { useCharacterStore } from '@/store/character-store';
import { useQuestStore } from '@/store/quest-store';

import { generateStreakVisualization } from './streak-visualization.util';
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

// expo-haptics is not a native module the jest environment can load; mock it
// so importing the animation hook (which references its enums) doesn't
// throw. The actual haptic *calls* happen inside Reanimated animation
// callbacks, which the global `react-native-reanimated` jest mock
// (jest-setup.ts) never invokes — so haptic-firing itself isn't observable
// from this test file.
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  notificationAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium' },
  NotificationFeedbackType: { Success: 'success' },
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

describe('generateStreakVisualization (7-day model)', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('0-day streak on Tuesday: shows the current week with nothing lit', () => {
    mockCurrentDay(2); // Tuesday

    const days = generateStreakVisualization(0);

    expect(days.map((d) => d.name)).toEqual([
      'We',
      'Th',
      'Fr',
      'Sa',
      'Su',
      'Mo',
      'Tu',
    ]);
    expect(days.map((d) => d.isCompleted)).toEqual([
      false,
      false,
      false,
      false,
      false,
      false,
      false,
    ]);
    expect(days.map((d) => d.isToday)).toEqual([
      false,
      false,
      false,
      false,
      false,
      false,
      true,
    ]);
  });

  it('1-day streak on Thursday: only today is lit', () => {
    mockCurrentDay(4); // Thursday

    const days = generateStreakVisualization(1);

    expect(days.map((d) => d.name)).toEqual([
      'Fr',
      'Sa',
      'Su',
      'Mo',
      'Tu',
      'We',
      'Th',
    ]);
    expect(days.map((d) => d.isCompleted)).toEqual([
      false,
      false,
      false,
      false,
      false,
      false,
      true,
    ]);
  });

  it('2-day streak on Wednesday: the last two days (Tu, We) are lit', () => {
    mockCurrentDay(3); // Wednesday

    const days = generateStreakVisualization(2);

    expect(days.map((d) => d.name)).toEqual([
      'Th',
      'Fr',
      'Sa',
      'Su',
      'Mo',
      'Tu',
      'We',
    ]);
    expect(days.map((d) => d.isCompleted)).toEqual([
      false,
      false,
      false,
      false,
      false,
      true,
      true,
    ]);
  });

  it('7-day streak on Friday: the full week is lit', () => {
    mockCurrentDay(5); // Friday

    const days = generateStreakVisualization(7);

    expect(days.map((d) => d.name)).toEqual([
      'Sa',
      'Su',
      'Mo',
      'Tu',
      'We',
      'Th',
      'Fr',
    ]);
    expect(days.every((d) => d.isCompleted)).toBe(true);
  });

  it('streak longer than 7 days on Sunday: clamps to a fully lit week (no overflow)', () => {
    mockCurrentDay(0); // Sunday

    const days = generateStreakVisualization(30);

    expect(days.map((d) => d.name)).toEqual([
      'Mo',
      'Tu',
      'We',
      'Th',
      'Fr',
      'Sa',
      'Su',
    ]);
    expect(days.every((d) => d.isCompleted)).toBe(true);
    expect(days).toHaveLength(7);
  });

  it('always returns exactly 7 days with today last', () => {
    mockCurrentDay(6); // Saturday

    const days = generateStreakVisualization(3);

    expect(days).toHaveLength(7);
    expect(days[6].isToday).toBe(true);
    expect(days.filter((d) => d.isToday)).toHaveLength(1);
  });
});

describe('StreakCelebrationScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset mock functions
    mockCharacterStore.markStreakCelebrationShown.mockClear();
    mockRouterBack.mockClear();
    mockRouterPush.mockClear();
    mockCharacterStore.dailyQuestStreak = 1;

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

  describe('UI Elements', () => {
    it('should display the QUEST STREAK eyebrow', () => {
      const { getByText } = render(<StreakCelebrationScreen />);

      expect(getByText('Quest streak')).toBeTruthy();
    });

    it('should display "day streak" title and subtitle', () => {
      const { getByText } = render(<StreakCelebrationScreen />);

      expect(getByText('day streak')).toBeTruthy();
      expect(getByText('You kept the fire burning.')).toBeTruthy();
    });

    it('should render a full 7-day week visualization', () => {
      const { getAllByTestId, getAllByText } = render(
        <StreakCelebrationScreen />
      );

      const flameContainers = getAllByTestId('flame-container');
      expect(flameContainers).toHaveLength(7);

      const expectedDays = generateStreakVisualization(
        mockCharacterStore.dailyQuestStreak
      );
      const uniqueDayNames = Array.from(
        new Set(expectedDays.map((d) => d.name))
      );
      uniqueDayNames.forEach((name) => {
        expect(getAllByText(name).length).toBeGreaterThan(0);
      });
    });

    it('should display the streak reminder text', () => {
      const { getByText } = render(<StreakCelebrationScreen />);

      expect(
        getByText('Complete a quest each day to keep the fire burning.')
      ).toBeTruthy();
    });

    it('should have Share and Continue buttons', () => {
      const { getByText } = render(<StreakCelebrationScreen />);

      expect(getByText('Share')).toBeTruthy();
      expect(getByText('Continue')).toBeTruthy();
    });
  });

  describe('Button Interactions', () => {
    it('should navigate back when Continue button is pressed', () => {
      const { getByTestId } = render(<StreakCelebrationScreen />);

      fireEvent.press(getByTestId('streak-continue-button'));

      expect(mockRouterBack).toHaveBeenCalled();
    });

    it('should call setShouldShowStreakCelebration(false) when Continue is pressed', () => {
      const mockSetShouldShowStreakCelebration = jest.fn();
      mockQuestStore.setShouldShowStreakCelebration =
        mockSetShouldShowStreakCelebration;

      mockUseQuestStore.mockImplementation((selector) =>
        selector(mockQuestStore as any)
      );

      const { getByTestId } = render(<StreakCelebrationScreen />);

      fireEvent.press(getByTestId('streak-continue-button'));

      expect(mockSetShouldShowStreakCelebration).toHaveBeenCalledWith(false);
    });

    it('should share the streak when Share button is pressed', async () => {
      const { getByTestId } = render(<StreakCelebrationScreen />);

      const RNShare = require('react-native').Share;
      const shareSpy = jest
        .spyOn(RNShare, 'share')
        .mockResolvedValue({ action: 'sharedAction' } as any);

      await fireEvent.press(getByTestId('streak-share-button'));

      expect(shareSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'My emberglow Streak',
          message: expect.stringContaining('1 day quest streak'),
        })
      );
    });
  });

  describe('Store Integration', () => {
    it('should call markStreakCelebrationShown when screen is accessed', () => {
      render(<StreakCelebrationScreen />);

      // The useFocusEffect should trigger markStreakCelebrationShown
      expect(mockCharacterStore.markStreakCelebrationShown).toHaveBeenCalled();
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
