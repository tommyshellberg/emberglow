import { BottomTabBarHeightContext } from '@react-navigation/bottom-tabs';
import { NavigationRouteContext } from '@react-navigation/native';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { router } from 'expo-router';
import React from 'react';
import { StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useQuestStore } from '@/store/quest-store';
import { useUserStore } from '@/store/user-store';

import type { QuestWithMode } from './quest-complete/types';
import { QuestComplete } from './QuestComplete';

// Mock the router
jest.mock('expo-router', () => ({
  router: {
    push: jest.fn(),
  },
}));

// Mock the stores
jest.mock('@/store/quest-store');

// Mock the custom hook
jest.mock('@/hooks/useCustomQuestStory', () => ({
  useCustomQuestStory: jest.fn(() => null),
}));

// Mock sub-components — the real Header/Story/Actions get their own
// dedicated test files; here we only verify QuestComplete wires the right
// props through to each (fromJournal, onBack, hasReflection, etc).
jest.mock('./quest-complete/QuestCompleteHeader', () => ({
  QuestCompleteHeader: ({ quest, fromJournal, onBack }: any) => {
    const { View, Text, Pressable } = require('react-native');
    return (
      <View testID="quest-complete-header">
        {quest.title && <Text>{quest.title}</Text>}
        <Text>{fromJournal ? 'journal-header' : 'flow-header'}</Text>
        <Pressable testID="header-back-button" onPress={onBack}>
          <Text>Back</Text>
        </Pressable>
      </View>
    );
  },
}));

jest.mock('./quest-complete/QuestCompleteStory', () => ({
  QuestCompleteStory: ({ story }: any) => {
    const { View, Text } = require('react-native');
    return (
      <View testID="quest-complete-story">
        <Text>{story}</Text>
      </View>
    );
  },
}));

jest.mock('./quest-complete/QuestCompleteActions', () => ({
  QuestCompleteActions: ({
    continueText,
    onContinue,
    fromJournal,
    hasReflection,
  }: any) => {
    const { View, Pressable, Text } = require('react-native');
    const { useQuestStore } = require('@/store/quest-store');

    return (
      <View testID="quest-complete-actions">
        <Text>{hasReflection ? 'has-reflection' : 'no-reflection'}</Text>
        {!fromJournal && (
          <Pressable
            onPress={() => {
              const clearRecentCompletedQuest = useQuestStore(
                (state: any) => state.clearRecentCompletedQuest
              );
              clearRecentCompletedQuest();
              if (onContinue) {
                onContinue();
              } else {
                require('expo-router').router.push('/(app)');
              }
            }}
          >
            <Text>{continueText}</Text>
          </Pressable>
        )}
      </View>
    );
  },
}));

describe('QuestComplete', () => {
  const mockClearRecentCompletedQuest = jest.fn();

  const mockStoryQuest: QuestWithMode = {
    id: 'quest-1',
    mode: 'story',
    title: 'Story Quest',
    durationMinutes: 5,
    reward: { xp: 10 },
    status: 'completed',
  };

  const mockCustomQuest: QuestWithMode = {
    id: 'custom-1',
    mode: 'custom',
    category: 'fitness',
    title: 'Custom Quest',
    durationMinutes: 30,
    reward: { xp: 50 },
    status: 'completed',
  };

  const mockCooperativeQuest: QuestWithMode = {
    id: 'coop-1',
    mode: 'cooperative',
    category: 'cooperative',
    title: 'Team Quest',
    durationMinutes: 45,
    reward: { xp: 75 },
    status: 'completed',
  };

  beforeEach(() => {
    jest.clearAllMocks();

    (useQuestStore as unknown as jest.Mock).mockImplementation((selector) => {
      const state = {
        clearRecentCompletedQuest: mockClearRecentCompletedQuest,
      };
      return selector(state);
    });
  });

  describe('Component Composition', () => {
    it('should render all sub-components', () => {
      const { getByTestId } = render(
        <QuestComplete quest={mockStoryQuest} story="Test story" />
      );

      expect(getByTestId('quest-complete-header')).toBeTruthy();
      expect(getByTestId('quest-complete-story')).toBeTruthy();
      expect(getByTestId('quest-complete-actions')).toBeTruthy();
    });

    it('should hide actions when showActionButton is false', () => {
      const { queryByTestId, getByTestId } = render(
        <QuestComplete
          quest={mockStoryQuest}
          story="Test story"
          showActionButton={false}
        />
      );

      expect(getByTestId('quest-complete-header')).toBeTruthy();
      expect(getByTestId('quest-complete-story')).toBeTruthy();
      expect(queryByTestId('quest-complete-actions')).toBeNull();
    });
  });

  describe('fromJournal context (quest-flow.jsx fromJournal flag)', () => {
    it('defaults to the quest-flow context (fromJournal=false) when unset', () => {
      const { getByText } = render(
        <QuestComplete quest={mockStoryQuest} story="Test story" />
      );
      expect(getByText('flow-header')).toBeTruthy();
    });

    it('passes fromJournal through to the header', () => {
      const { getByText } = render(
        <QuestComplete quest={mockStoryQuest} story="Test story" fromJournal />
      );
      expect(getByText('journal-header')).toBeTruthy();
    });

    it('passes hasReflection through to actions', () => {
      const { getByText } = render(
        <QuestComplete
          quest={mockStoryQuest}
          story="Test story"
          hasReflection
        />
      );
      expect(getByText('has-reflection')).toBeTruthy();
    });
  });

  describe('Back navigation', () => {
    it('calls the provided onBack handler when the back button is pressed', () => {
      const onBack = jest.fn();
      const { getByTestId } = render(
        <QuestComplete
          quest={mockStoryQuest}
          story="Test story"
          onBack={onBack}
        />
      );

      fireEvent.press(getByTestId('header-back-button'));
      expect(onBack).toHaveBeenCalledTimes(1);
    });

    it('falls back to onContinue when onBack is not provided (matches quest-flow.jsx:125)', () => {
      const onContinue = jest.fn();
      const { getByTestId } = render(
        <QuestComplete
          quest={mockStoryQuest}
          story="Test story"
          onContinue={onContinue}
        />
      );

      fireEvent.press(getByTestId('header-back-button'));
      expect(onContinue).toHaveBeenCalledTimes(1);
    });
  });

  describe('Story Display', () => {
    it('should display provided story for story quests', () => {
      const { getByText } = render(
        <QuestComplete quest={mockStoryQuest} story="Once upon a time..." />
      );

      expect(getByText('Once upon a time...')).toBeTruthy();
    });

    it('should display custom story for custom quests', () => {
      const { useCustomQuestStory } = require('@/hooks/useCustomQuestStory');
      useCustomQuestStory.mockReturnValue('Custom quest story');

      const { getByText } = render(
        <QuestComplete quest={mockCustomQuest} story="Fallback story" />
      );

      expect(getByText('Custom quest story')).toBeTruthy();
    });

    it('should use provided story when custom story hook returns null', () => {
      const { useCustomQuestStory } = require('@/hooks/useCustomQuestStory');
      useCustomQuestStory.mockReturnValue(null);

      const { getByText } = render(
        <QuestComplete quest={mockStoryQuest} story="Provided story" />
      );

      expect(getByText('Provided story')).toBeTruthy();
    });
  });

  describe('Navigation', () => {
    it('should navigate to home screen by default', () => {
      const { getByText } = render(
        <QuestComplete quest={mockStoryQuest} story="Test story" />
      );

      fireEvent.press(getByText('Continue'));

      expect(mockClearRecentCompletedQuest).toHaveBeenCalled();
      expect(router.push).toHaveBeenCalledWith('/(app)');
    });

    it('should call onContinue callback when provided', () => {
      const onContinue = jest.fn();

      const { getByText } = render(
        <QuestComplete
          quest={mockStoryQuest}
          story="Test story"
          onContinue={onContinue}
        />
      );

      fireEvent.press(getByText('Continue'));

      expect(mockClearRecentCompletedQuest).toHaveBeenCalled();
      expect(onContinue).toHaveBeenCalled();
      expect(router.push).not.toHaveBeenCalled();
    });
  });

  describe('Continue Button Text', () => {
    it('should use default continue text', () => {
      const { getByText } = render(
        <QuestComplete quest={mockStoryQuest} story="Test story" />
      );

      expect(getByText('Continue')).toBeTruthy();
    });

    it('should use custom continue text', () => {
      const { getByText } = render(
        <QuestComplete
          quest={mockStoryQuest}
          story="Test story"
          continueText="Next Adventure"
        />
      );

      expect(getByText('Next Adventure')).toBeTruthy();
    });
  });

  describe('Different Quest Modes', () => {
    it('should render for story quest', () => {
      const { getByTestId, getByText } = render(
        <QuestComplete quest={mockStoryQuest} story="Story quest text" />
      );

      expect(getByTestId('quest-complete-header')).toBeTruthy();
      expect(getByText('Story Quest')).toBeTruthy();
    });

    it('should render for custom quest', () => {
      const { getByTestId, getByText } = render(
        <QuestComplete quest={mockCustomQuest} story="Custom quest text" />
      );

      expect(getByTestId('quest-complete-header')).toBeTruthy();
      expect(getByText('Custom Quest')).toBeTruthy();
    });

    it('should render for cooperative quest', () => {
      const { getByTestId, getByText } = render(
        <QuestComplete quest={mockCooperativeQuest} story="Coop quest text" />
      );

      expect(getByTestId('quest-complete-header')).toBeTruthy();
      expect(getByText('Team Quest')).toBeTruthy();
    });
  });

  describe('Animations', () => {
    it('should pass disableEnteringAnimations to sub-components', () => {
      const { getByTestId } = render(
        <QuestComplete
          quest={mockStoryQuest}
          story="Test story"
          disableEnteringAnimations={true}
        />
      );

      // Sub-components should receive the prop (we can't easily test internal behavior)
      expect(getByTestId('quest-complete-header')).toBeTruthy();
      expect(getByTestId('quest-complete-story')).toBeTruthy();
      expect(getByTestId('quest-complete-actions')).toBeTruthy();
    });
  });

  describe('Layout', () => {
    it('does not force-spread content across the full screen height, so short content (e.g. no story card) does not leave a big gap below the image', () => {
      const { UNSAFE_getByType } = render(
        <QuestComplete quest={mockCooperativeQuest} story="Coop quest text" />
      );

      const { ScrollView } = require('react-native');
      const scrollView = UNSAFE_getByType(ScrollView);
      expect(scrollView.props.contentContainerStyle?.justifyContent).not.toBe(
        'space-between'
      );
    });
  });

  // The app runs edge-to-edge on Android, so content draws behind the
  // navigation bar. This screen renders from two places and NEITHER has a
  // visible tab bar below it to span the inset: (app)/quest/[id] inside the
  // tab navigator with the bar hidden, and first-quest-result.tsx on the root
  // stack. Without the inset, "Add reflection" sits under the nav bar.
  describe('Bottom safe area', () => {
    /** A 3-button-nav Android device. The global mock defaults every inset to
     * 0, which would make these assertions vacuous — 0 + 24 is also the
     * broken value — so each test must override it. */
    const BOTTOM_INSET = 48;
    const CONTENT_GAP = 24;

    const paddingBottomOf = (el: any) =>
      StyleSheet.flatten(el.props.style).paddingBottom;

    beforeEach(() => {
      jest.mocked(useSafeAreaInsets).mockReturnValue({
        top: 24,
        right: 0,
        bottom: BOTTOM_INSET,
        left: 0,
      });
    });

    it('reserves the inset on a tab route that hides the tab bar', () => {
      const { getByTestId } = render(
        <BottomTabBarHeightContext.Provider value={104}>
          <NavigationRouteContext.Provider
            value={{ key: 'quest-key', name: 'quest/[id]' }}
          >
            <QuestComplete quest={mockStoryQuest} story="Test story" />
          </NavigationRouteContext.Provider>
        </BottomTabBarHeightContext.Provider>
      );

      expect(paddingBottomOf(getByTestId('quest-complete-content'))).toBe(
        BOTTOM_INSET + CONTENT_GAP
      );
    });

    it('reserves the inset outside the tab navigator', () => {
      const { getByTestId } = render(
        <QuestComplete quest={mockStoryQuest} story="Test story" />
      );

      expect(paddingBottomOf(getByTestId('quest-complete-content'))).toBe(
        BOTTOM_INSET + CONTENT_GAP
      );
    });

    it('omits the inset under a visible tab bar, which already spans it', () => {
      const { getByTestId } = render(
        <BottomTabBarHeightContext.Provider value={104}>
          <NavigationRouteContext.Provider
            value={{ key: 'journal-key', name: 'journal' }}
          >
            <QuestComplete quest={mockStoryQuest} story="Test story" />
          </NavigationRouteContext.Provider>
        </BottomTabBarHeightContext.Provider>
      );

      expect(paddingBottomOf(getByTestId('quest-complete-content'))).toBe(
        CONTENT_GAP
      );
    });
  });

  describe('Reward Breakdown (lock bonus)', () => {
    const currentUserId = 'user-123';

    beforeEach(() => {
      useUserStore.setState({
        user: { id: currentUserId, email: 'test@example.com' } as any,
      });
    });

    afterEach(() => {
      useUserStore.setState({ user: null });
    });

    it('shows a "+N lock bonus" line for a completed presence run with rewards.lockBonus > 0', () => {
      const presenceQuest: QuestWithMode = {
        ...mockStoryQuest,
        participants: [
          {
            userId: currentUserId,
            ready: true,
            status: 'completed',
            rewards: {
              baseXP: 15,
              adjustedXP: 15,
              multiplier: 1,
              perksApplied: [],
              lockBonus: 12,
            },
          },
        ],
      };

      render(<QuestComplete quest={presenceQuest} story="Test story" />);

      expect(screen.getByLabelText('Reward breakdown')).toBeTruthy();
      expect(screen.getByText('Lock bonus')).toBeTruthy();
      expect(screen.getByText('+12')).toBeTruthy();
    });

    it('shows no lock-bonus line and no breakdown for a watched completion with lockBonus 0/absent and no perks', () => {
      const watchedQuest: QuestWithMode = {
        ...mockStoryQuest,
        participants: [
          {
            userId: currentUserId,
            ready: true,
            status: 'completed',
            rewards: {
              baseXP: 15,
              adjustedXP: 15,
              multiplier: 1,
              perksApplied: [],
              lockBonus: 0,
            },
          },
        ],
      };

      render(<QuestComplete quest={watchedQuest} story="Test story" />);

      expect(screen.queryByText(/lock bonus/i)).toBeNull();
      expect(screen.queryByLabelText('Reward breakdown')).toBeNull();
    });

    it('still shows the reward breakdown for a presence run with a lock bonus but no perks (widened guard)', () => {
      const presenceQuestNoPerks: QuestWithMode = {
        ...mockStoryQuest,
        participants: [
          {
            userId: currentUserId,
            ready: true,
            status: 'completed',
            rewards: {
              baseXP: 15,
              adjustedXP: 15,
              multiplier: 1,
              perksApplied: [],
              lockBonus: 8,
            },
          },
        ],
      };

      render(<QuestComplete quest={presenceQuestNoPerks} story="Test story" />);

      // The breakdown container renders even though there are no perks,
      // because the widened guard checks for a positive lock bonus too.
      expect(screen.getByLabelText('Reward breakdown')).toBeTruthy();
      expect(screen.getByText('Lock bonus')).toBeTruthy();
    });
  });
});
