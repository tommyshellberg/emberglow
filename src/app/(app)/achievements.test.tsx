/* eslint-disable max-lines-per-function */
import React from 'react';
import { StyleSheet } from 'react-native';

import { cleanup, render, screen, setup, waitFor } from '@/lib/test-utils';
import { useCharacterStore } from '@/store/character-store';
import { useQuestStore } from '@/store/quest-store';

import AchievementsScreen from './achievements';

// Mock dependencies
const mockRouterPush = jest.fn();
const mockRouterReplace = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: mockRouterPush,
    replace: mockRouterReplace,
  }),
}));

// Mock lucide-react-native icons
jest.mock('lucide-react-native', () => ({
  Award: () => null,
  BowArrow: () => null,
  Clock: () => null,
  Crown: () => null,
  Hourglass: () => null,
  MapPinCheck: () => null,
  Sword: () => null,
  Swords: () => null,
  Target: () => null,
  Timer: () => null,
  Trophy: () => null,
  Watch: () => null,
}));

// Mock UI components (layout chrome only — Badge comes from @/components/emberglow
// and is rendered for real, it has no native dependencies)
jest.mock('@/components/ui', () => {
  const RN = jest.requireActual('react-native');
  return {
    Pressable: RN.Pressable,
    ScrollView: RN.ScrollView,
    FocusAwareStatusBar: () => null,
    ScreenContainer: ({ children }: any) => <RN.View>{children}</RN.View>,
    ScreenHeader: ({ title, subtitle, onBackPress }: any) => (
      <RN.View>
        <RN.Text>{title}</RN.Text>
        <RN.Text>{subtitle}</RN.Text>
        <RN.Pressable onPress={onBackPress}>
          <RN.Text>Back</RN.Text>
        </RN.Pressable>
      </RN.View>
    ),
  };
});

// Mock react-native-reanimated
jest.mock('react-native-reanimated', () => {
  const RN = jest.requireActual('react-native');
  const Reanimated = require('react-native-reanimated/mock');

  Reanimated.default.call = () => {};

  return {
    ...Reanimated,
    useSharedValue: jest.fn((initialValue) => ({ value: initialValue })),
    useAnimatedScrollHandler: jest.fn(() => jest.fn()),
    useAnimatedStyle: jest.fn(() => ({})),
    interpolate: jest.fn((value, inputRange, outputRange) => outputRange[0]),
    default: {
      ...Reanimated.default,
      View: RN.View,
      ScrollView: RN.ScrollView,
    },
  };
});

describe('AchievementsScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Reset stores to initial state
    useCharacterStore.setState({
      dailyQuestStreak: 0,
    });

    useQuestStore.setState({
      completedQuests: [],
      getCompletedQuests: jest.fn(() => []),
    });
  });

  afterEach(() => {
    cleanup();
  });

  describe('Rendering', () => {
    it('renders the screen with header and subtitle', () => {
      render(<AchievementsScreen />);

      expect(screen.getByText('Achievements')).toBeOnTheScreen();
      expect(
        screen.getByText('Track your progress • 0/9 Unlocked')
      ).toBeOnTheScreen();
    });

    it('renders back button that navigates to profile', async () => {
      const { user } = setup(<AchievementsScreen />);

      const backButton = screen.getByText('Back');
      await user.press(backButton);

      await waitFor(() => {
        expect(mockRouterPush).toHaveBeenCalledWith('/profile');
      });
    });

    it('renders all three achievement categories', () => {
      render(<AchievementsScreen />);

      expect(screen.getByText('Daily Streak')).toBeOnTheScreen();
      expect(screen.getByText('Quest Completion')).toBeOnTheScreen();
      expect(screen.getByText('Time Saved')).toBeOnTheScreen();
    });

    it('renders all achievement cards with titles', () => {
      render(<AchievementsScreen />);

      // Streak achievements
      expect(screen.getByText('First Steps')).toBeOnTheScreen();
      expect(screen.getByText('Committed')).toBeOnTheScreen();
      expect(screen.getByText('Unstoppable')).toBeOnTheScreen();

      // Quest achievements
      expect(screen.getByText('Quest Beginner')).toBeOnTheScreen();
      expect(screen.getByText('Quest Adventurer')).toBeOnTheScreen();
      expect(screen.getByText('Quest Master')).toBeOnTheScreen();

      // Minutes achievements
      expect(screen.getByText('Time Saver')).toBeOnTheScreen();
      expect(screen.getByText('Time Guardian')).toBeOnTheScreen();
      expect(screen.getByText('Time Lord')).toBeOnTheScreen();
    });

    it('renders achievement descriptions', () => {
      render(<AchievementsScreen />);

      expect(
        screen.getByText('Complete quests for 2 days in a row')
      ).toBeOnTheScreen();
      expect(screen.getByText('Complete 3 quests')).toBeOnTheScreen();
      expect(
        screen.getByText('Save 10 minutes off your phone')
      ).toBeOnTheScreen();
    });
  });

  describe('Achievement Progress Display', () => {
    it('displays correct progress for streak achievements', () => {
      useCharacterStore.setState({ dailyQuestStreak: 5 });

      render(<AchievementsScreen />);

      // Should show 5 for all streak achievements
      const progressTexts = screen.getAllByText(/5\//);
      expect(progressTexts.length).toBeGreaterThan(0);
    });

    it('displays correct progress for quest achievements', () => {
      useQuestStore.setState({
        completedQuests: [
          { id: '1', durationMinutes: 30 },
          { id: '2', durationMinutes: 45 },
          { id: '3', durationMinutes: 20 },
        ] as any,
        getCompletedQuests: jest.fn(() => [
          { id: '1', durationMinutes: 30 },
          { id: '2', durationMinutes: 45 },
          { id: '3', durationMinutes: 20 },
        ]),
      });

      render(<AchievementsScreen />);

      // Should show 3 completed quests
      expect(screen.getByText('3/3')).toBeOnTheScreen(); // Quest Beginner
      expect(screen.getByText('3/25')).toBeOnTheScreen(); // Quest Adventurer
      expect(screen.getByText('3/100')).toBeOnTheScreen(); // Quest Master
    });

    it('displays correct progress for minutes achievements', () => {
      useQuestStore.setState({
        completedQuests: [
          { id: '1', durationMinutes: 30 },
          { id: '2', durationMinutes: 45 },
          { id: '3', durationMinutes: 25 },
        ] as any,
        getCompletedQuests: jest.fn(() => [
          { id: '1', durationMinutes: 30 },
          { id: '2', durationMinutes: 45 },
          { id: '3', durationMinutes: 25 },
        ]),
      });

      render(<AchievementsScreen />);

      // Total: 30 + 45 + 25 = 100 minutes
      expect(screen.getByText('100/10')).toBeOnTheScreen(); // Time Saver
      expect(screen.getByText('100/100')).toBeOnTheScreen(); // Time Guardian
      expect(screen.getByText('100/1000')).toBeOnTheScreen(); // Time Lord
    });

    it('shows 0 progress when no data available', () => {
      useCharacterStore.setState({ dailyQuestStreak: 0 });
      useQuestStore.setState({
        completedQuests: [],
        getCompletedQuests: jest.fn(() => []),
      });

      render(<AchievementsScreen />);

      expect(screen.getByText('0/2')).toBeOnTheScreen(); // First Steps
      expect(screen.getByText('0/3')).toBeOnTheScreen(); // Quest Beginner

      // Multiple achievements have 0/10, so use getAllByText
      const zeroTenTexts = screen.getAllByText('0/10');
      expect(zeroTenTexts.length).toBeGreaterThan(0);
    });
  });

  describe('Achievement Unlock Status', () => {
    it('shows unlocked state for streak achievement when requirement is met', () => {
      useCharacterStore.setState({ dailyQuestStreak: 2 });

      render(<AchievementsScreen />);

      // Should show "Unlocked!" badge
      const unlockedBadges = screen.getAllByText('Unlocked!');
      expect(unlockedBadges.length).toBeGreaterThan(0);
    });

    it('shows unlocked state for quest achievement when requirement is met', () => {
      useQuestStore.setState({
        completedQuests: [
          { id: '1', durationMinutes: 30 },
          { id: '2', durationMinutes: 45 },
          { id: '3', durationMinutes: 20 },
        ] as any,
        getCompletedQuests: jest.fn(() => [
          { id: '1', durationMinutes: 30 },
          { id: '2', durationMinutes: 45 },
          { id: '3', durationMinutes: 20 },
        ]),
      });

      render(<AchievementsScreen />);

      // Quest Beginner (3 quests) should be unlocked
      const unlockedBadges = screen.getAllByText('Unlocked!');
      expect(unlockedBadges.length).toBeGreaterThan(0);
    });

    it('shows unlocked state for minutes achievement when requirement is met', () => {
      useQuestStore.setState({
        completedQuests: [{ id: '1', durationMinutes: 10 }] as any,
        getCompletedQuests: jest.fn(() => [{ id: '1', durationMinutes: 10 }]),
      });

      render(<AchievementsScreen />);

      // Time Saver (10 minutes) should be unlocked
      const unlockedBadges = screen.getAllByText('Unlocked!');
      expect(unlockedBadges.length).toBeGreaterThan(0);
    });

    it('does not show unlocked badge when requirement is not met', () => {
      useCharacterStore.setState({ dailyQuestStreak: 1 });
      useQuestStore.setState({
        completedQuests: [{ id: '1', durationMinutes: 5 }] as any,
        getCompletedQuests: jest.fn(() => [{ id: '1', durationMinutes: 5 }]),
      });

      render(<AchievementsScreen />);

      // No achievements should be unlocked
      expect(screen.queryByText('Unlocked!')).not.toBeOnTheScreen();
    });

    it('updates unlock count in header when achievements are unlocked', () => {
      useCharacterStore.setState({ dailyQuestStreak: 2 });
      useQuestStore.setState({
        completedQuests: [
          { id: '1', durationMinutes: 10 },
          { id: '2', durationMinutes: 10 },
          { id: '3', durationMinutes: 10 },
        ] as any,
        getCompletedQuests: jest.fn(() => [
          { id: '1', durationMinutes: 10 },
          { id: '2', durationMinutes: 10 },
          { id: '3', durationMinutes: 10 },
        ]),
      });

      render(<AchievementsScreen />);

      // Should have unlocked: First Steps (2 streak), Quest Beginner (3 quests), Time Saver (30 mins)
      expect(
        screen.getByText('Track your progress • 3/9 Unlocked')
      ).toBeOnTheScreen();
    });
  });

  describe('Progress Bar Display', () => {
    it('shows correct progress percentage for partial completion', () => {
      useCharacterStore.setState({ dailyQuestStreak: 5 });

      render(<AchievementsScreen />);

      // For 10-day streak requirement, 5/10 = 50%
      const fills = screen.getAllByTestId('progress-fill');
      expect(fills.length).toBeGreaterThan(0);

      const widths = fills.map(
        (el) => StyleSheet.flatten(el.props.style).width
      );
      expect(widths).toContain('50%');
    });

    it('caps progress at 100% when requirement is exceeded', () => {
      useQuestStore.setState({
        completedQuests: Array(150)
          .fill(null)
          .map((_, i) => ({
            id: `quest-${i}`,
            durationMinutes: 10,
          })) as any,
        getCompletedQuests: jest.fn(() =>
          Array(150)
            .fill(null)
            .map((_, i) => ({ id: `quest-${i}`, durationMinutes: 10 }))
        ),
      });

      render(<AchievementsScreen />);

      // Even with 150 quests, progress should cap at 100%
      const fills = screen.getAllByTestId('progress-fill');
      expect(fills.length).toBeGreaterThan(0);

      fills.forEach((el) => {
        const width = StyleSheet.flatten(el.props.style).width as string;
        expect(parseFloat(width)).toBeLessThanOrEqual(100);
      });
    });

    it('does not render a fill for achievements with zero progress', () => {
      useCharacterStore.setState({ dailyQuestStreak: 0 });
      useQuestStore.setState({
        completedQuests: [],
        getCompletedQuests: jest.fn(() => []),
      });

      render(<AchievementsScreen />);

      // Every progress track renders, but a fill only appears once progress > 0
      const tracks = screen.getAllByTestId('progress-track');
      const fills = screen.queryAllByTestId('progress-fill');
      expect(tracks.length).toBe(9);
      expect(fills.length).toBe(0);
    });
  });

  describe('Achievement Categories', () => {
    it('groups achievements into three categories', () => {
      render(<AchievementsScreen />);

      // Should have 3 category headers
      expect(screen.getByText('Daily Streak')).toBeOnTheScreen();
      expect(screen.getByText('Quest Completion')).toBeOnTheScreen();
      expect(screen.getByText('Time Saved')).toBeOnTheScreen();
    });

    it('displays 3 achievements per category', () => {
      render(<AchievementsScreen />);

      // Total of 9 achievement cards
      const cards = screen.getAllByTestId('achievement-card');
      expect(cards.length).toBeGreaterThanOrEqual(9);
    });
  });

  describe('Edge Cases', () => {
    it('handles very large streak counts', () => {
      useCharacterStore.setState({ dailyQuestStreak: 999 });

      render(<AchievementsScreen />);

      expect(screen.getByText('999/30')).toBeOnTheScreen();
    });

    it('handles very large quest counts', () => {
      useQuestStore.setState({
        completedQuests: Array(999)
          .fill(null)
          .map((_, i) => ({
            id: `quest-${i}`,
            durationMinutes: 1,
          })) as any,
        getCompletedQuests: jest.fn(() =>
          Array(999)
            .fill(null)
            .map((_, i) => ({ id: `quest-${i}`, durationMinutes: 1 }))
        ),
      });

      render(<AchievementsScreen />);

      // Multiple achievements may have same text, use getAllByText
      const questTexts = screen.getAllByText('999/100');
      expect(questTexts.length).toBeGreaterThan(0);
    });

    it('handles very large minute counts', () => {
      useQuestStore.setState({
        completedQuests: [{ id: '1', durationMinutes: 9999 }] as any,
        getCompletedQuests: jest.fn(() => [{ id: '1', durationMinutes: 9999 }]),
      });

      render(<AchievementsScreen />);

      expect(screen.getByText('9999/1000')).toBeOnTheScreen();
    });

    it('handles zero values gracefully', () => {
      useCharacterStore.setState({ dailyQuestStreak: 0 });
      useQuestStore.setState({
        completedQuests: [],
        getCompletedQuests: jest.fn(() => []),
      });

      render(<AchievementsScreen />);

      expect(screen.getByText('0/2')).toBeOnTheScreen();

      // Multiple achievements have 0/10, use getAllByText
      const zeroTenTexts = screen.getAllByText('0/10');
      expect(zeroTenTexts.length).toBeGreaterThan(0);
    });

    it('handles missing quest duration gracefully', () => {
      useQuestStore.setState({
        completedQuests: [{ id: '1' }, { id: '2', durationMinutes: 0 }] as any,
        getCompletedQuests: jest.fn(() => [
          { id: '1' },
          { id: '2', durationMinutes: 0 },
        ]),
      });

      render(<AchievementsScreen />);

      // Should still render without crashing
      expect(screen.getByText('Achievements')).toBeOnTheScreen();
    });
  });

  describe('Multiple Unlocks', () => {
    it('unlocks multiple achievements in same category', () => {
      useCharacterStore.setState({ dailyQuestStreak: 30 });

      render(<AchievementsScreen />);

      // All 3 streak achievements should be unlocked
      const unlockedBadges = screen.getAllByText('Unlocked!');
      expect(unlockedBadges.length).toBeGreaterThanOrEqual(3);
    });

    it('unlocks all achievements when all requirements are met', () => {
      useCharacterStore.setState({ dailyQuestStreak: 30 });
      useQuestStore.setState({
        completedQuests: Array(100)
          .fill(null)
          .map((_, i) => ({
            id: `quest-${i}`,
            durationMinutes: 15,
          })) as any,
        getCompletedQuests: jest.fn(() =>
          Array(100)
            .fill(null)
            .map((_, i) => ({ id: `quest-${i}`, durationMinutes: 15 }))
        ),
      });

      render(<AchievementsScreen />);

      // All 9 achievements should be unlocked
      expect(
        screen.getByText('Track your progress • 9/9 Unlocked')
      ).toBeOnTheScreen();
    });
  });

  describe('Accessibility', () => {
    it('renders achievement cards with accessible structure', () => {
      render(<AchievementsScreen />);

      const cards = screen.getAllByTestId('achievement-card');
      expect(cards.length).toBeGreaterThan(0);
    });

    it('shows clear progress labels', () => {
      render(<AchievementsScreen />);

      const progressLabels = screen.getAllByText('Progress');
      expect(progressLabels.length).toBeGreaterThan(0);
    });

    it('displays unlock dates for unlocked achievements', () => {
      useCharacterStore.setState({ dailyQuestStreak: 2 });

      render(<AchievementsScreen />);

      // Should show unlock date
      const datePattern = /Unlocked on/;
      const dateTexts = screen
        .getAllByText(datePattern)
        .filter((el) => el.props.children);
      expect(dateTexts.length).toBeGreaterThan(0);
    });
  });
});
