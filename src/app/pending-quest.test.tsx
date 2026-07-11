import { fireEvent, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';
import React from 'react';

import { render } from '@/lib/test-utils';
import { useQuestStore } from '@/store/quest-store';
import { useSkillTreeStore } from '@/store/skill-tree-store';
import { useUserStore } from '@/store/user-store';

import PendingQuestScreen from './pending-quest';

// Mock dependencies
jest.mock('expo-router');

// Mock the quest reward preview hook
jest.mock('@/api/quest-runs', () => ({
  useQuestRewardPreview: jest.fn(() => ({
    data: undefined,
    isLoading: false,
    error: null,
  })),
}));

// Mock PerkIcon — same pattern as compact-reward-breakdown.test.tsx and
// perk-card.test.tsx — to avoid SVG/image loading issues in tests.
jest.mock('@/components/skill-tree/perk-icon', () => ({
  PerkIcon: ({ perkId }: { perkId: string }) => {
    const { View, Text } = require('react-native');
    return (
      <View testID={`perk-icon-${perkId}`}>
        <Text>{perkId}</Text>
      </View>
    );
  },
}));

// Mock `@/components/ui`, but only for `BackgroundImage` — the real one
// doesn't forward `testID`/`source` onto a host view (see
// `src/components/ui/background-image.tsx`), which this suite asserts on
// directly, so it still needs a stub.
jest.mock('@/components/ui', () => {
  const React = jest.requireActual('react');
  const RN = jest.requireActual('react-native');

  return {
    BackgroundImage: ({ testID, source }: any) =>
      React.createElement(RN.View, { testID, source }),
  };
});

describe('PendingQuestScreen', () => {
  const mockStoryQuest = {
    id: 'quest-1',
    title: 'The Beginning',
    durationMinutes: 5,
    mode: 'story' as const,
    poiSlug: 'tavern',
    story: 'Your adventure begins...',
    recap: 'You started your journey',
    options: [],
    reward: { xp: 20 },
  };

  const mockCustomQuest = {
    id: 'custom-1',
    title: 'Morning Run',
    durationMinutes: 30,
    mode: 'custom' as const,
    category: 'fitness',
    reward: { xp: 50 },
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Reset stores
    useQuestStore.setState({
      pendingQuest: mockStoryQuest,
      cancelQuest: jest.fn(),
    });

    useUserStore.setState({
      user: {
        id: 'test-user-id',
        email: 'test@example.com',
      },
    });

    useSkillTreeStore.setState({ skillTreeData: null });

    (router.back as jest.Mock).mockImplementation(() => {});
  });

  it('shows loading when no pending quest', () => {
    useQuestStore.setState({
      pendingQuest: null,
      cancelQuest: jest.fn(),
    });

    const { getByTestId } = render(<PendingQuestScreen />);

    expect(() => getByTestId('activity-indicator')).toBeTruthy();
  });

  it('uses the knight card art as the background (better text contrast)', () => {
    const { getByTestId } = render(<PendingQuestScreen />);

    const backgroundImage = getByTestId('background-image');
    expect(backgroundImage.props.source).toBe(
      require('@/../assets/images/background/card-background-alt.jpg')
    );
  });

  describe('Header', () => {
    it('renders the quest title as the heading', () => {
      const { getByText } = render(<PendingQuestScreen />);

      expect(getByText('The Beginning')).toBeTruthy();
    });

    it('displays the eyebrow with the quest mode for story quests', () => {
      const { getByText } = render(<PendingQuestScreen />);

      expect(getByText('Story Quest')).toBeTruthy();
    });

    it('displays the eyebrow with the quest mode for custom quests', () => {
      useQuestStore.setState({
        pendingQuest: mockCustomQuest,
        cancelQuest: jest.fn(),
      });

      const { getByText } = render(<PendingQuestScreen />);

      expect(getByText('Custom Quest')).toBeTruthy();
    });

    it('does not render the old generic "Start Quest" title', () => {
      const { queryByText } = render(<PendingQuestScreen />);

      expect(queryByText('Start Quest')).toBeNull();
    });
  });

  describe('Badges', () => {
    it('shows the XP badge, falling back to the base reward while no preview is loaded', () => {
      const { getByText } = render(<PendingQuestScreen />);

      expect(getByText('+20 XP')).toBeTruthy();
    });

    it('uses the reward preview adjusted XP once loaded', () => {
      const { useQuestRewardPreview } = require('@/api/quest-runs');
      (useQuestRewardPreview as jest.Mock).mockReturnValueOnce({
        data: {
          participantRewards: [
            {
              userId: 'test-user-id',
              baseXP: 20,
              adjustedXP: 28,
              multiplier: 1.4,
              perksApplied: ['quick_break'],
            },
          ],
          effects: {},
        },
        isLoading: false,
        error: null,
      });

      const { getByText } = render(<PendingQuestScreen />);

      expect(getByText('+28 XP')).toBeTruthy();
    });

    it('shows a duration badge in "N min offline" form', () => {
      const { getByText } = render(<PendingQuestScreen />);

      expect(getByText('5 min offline')).toBeTruthy();
    });

    it('shows a Vaedros badge for story quests', () => {
      const { getByText } = render(<PendingQuestScreen />);

      expect(getByText('Vaedros')).toBeTruthy();
    });

    it('shows the quest category badge for custom quests', () => {
      useQuestStore.setState({
        pendingQuest: mockCustomQuest,
        cancelQuest: jest.fn(),
      });

      const { getByText, queryByText } = render(<PendingQuestScreen />);

      expect(getByText('fitness')).toBeTruthy();
      expect(queryByText('Vaedros')).toBeNull();
    });

    it('omits the third badge for custom quests without a category', () => {
      useQuestStore.setState({
        pendingQuest: { ...mockCustomQuest, category: '' },
        cancelQuest: jest.fn(),
      });

      const { queryByText } = render(<PendingQuestScreen />);

      expect(queryByText('Vaedros')).toBeNull();
      expect(queryByText('fitness')).toBeNull();
    });
  });

  describe('Body copy', () => {
    it('renders the hero body copy', () => {
      const { getByText } = render(<PendingQuestScreen />);

      expect(
        getByText(
          'Your hero stands ready. The story continues the moment you step away.'
        )
      ).toBeTruthy();
    });
  });

  describe('Active perks card', () => {
    it('renders the "Active perks" card header', () => {
      const { getByText } = render(<PendingQuestScreen />);

      expect(getByText('Active perks')).toBeTruthy();
    });

    it('shows the empty-state line while no reward preview is loaded', () => {
      const { getByText } = render(<PendingQuestScreen />);

      expect(
        getByText('No active perks yet. Unlock perks in the skill tree.')
      ).toBeTruthy();
    });

    it('renders a row for each perk applied once the preview loads', () => {
      const { useQuestRewardPreview } = require('@/api/quest-runs');
      (useQuestRewardPreview as jest.Mock).mockReturnValueOnce({
        data: {
          participantRewards: [
            {
              userId: 'test-user-id',
              baseXP: 20,
              adjustedXP: 28,
              multiplier: 1.4,
              perksApplied: ['quick_break'],
            },
          ],
          effects: {},
        },
        isLoading: false,
        error: null,
      });

      const { getByText, getByTestId } = render(<PendingQuestScreen />);

      expect(getByText('Quick Break')).toBeTruthy();
      expect(getByTestId('perk-icon-quick_break')).toBeTruthy();
    });
  });

  describe('Hero art regression', () => {
    it('does not render the old hero card art block', () => {
      const { queryByTestId } = render(<PendingQuestScreen />);

      expect(queryByTestId('pending-quest-hero-art')).toBeNull();
    });

    it('does not render the redundant "on return" XP badge', () => {
      const { queryByText } = render(<PendingQuestScreen />);

      expect(queryByText(/on return/i)).toBeNull();
    });
  });

  describe('Lock instructions', () => {
    it('displays lock instructions', () => {
      const { getByTestId } = render(<PendingQuestScreen />);

      expect(getByTestId('lock-instructions')).toBeTruthy();
    });

    it('displays lock instructions text', () => {
      const { getByText } = render(<PendingQuestScreen />);

      expect(getByText('Lock your phone to begin')).toBeTruthy();
    });
  });

  describe('Back button', () => {
    it('renders a back button that cancels the quest and navigates back on press', () => {
      const mockCancelQuest = jest.fn();
      useQuestStore.setState({
        pendingQuest: mockStoryQuest,
        cancelQuest: mockCancelQuest,
      });

      const { getByTestId } = render(<PendingQuestScreen />);

      fireEvent.press(getByTestId('pending-quest-back-button'));

      expect(mockCancelQuest).toHaveBeenCalledTimes(1);
      expect(router.back).toHaveBeenCalledTimes(1);
    });
  });

  describe('Cancel quest', () => {
    it('displays a ghost "Cancel quest" button in sentence case', () => {
      const { getByText } = render(<PendingQuestScreen />);

      expect(getByText('Cancel quest')).toBeTruthy();
    });

    it('calls cancelQuest and navigates back on press', () => {
      const mockCancelQuest = jest.fn();
      useQuestStore.setState({
        pendingQuest: mockStoryQuest,
        cancelQuest: mockCancelQuest,
      });

      const { getByText } = render(<PendingQuestScreen />);

      fireEvent.press(getByText('Cancel quest'));

      expect(mockCancelQuest).toHaveBeenCalledTimes(1);
      expect(router.back).toHaveBeenCalledTimes(1);
    });
  });

  describe('Regression: no tap-to-start affordance', () => {
    it('never renders a "Begin quest" button — quests start when the phone locks', () => {
      const { queryByText } = render(<PendingQuestScreen />);

      expect(queryByText('Begin quest')).toBeNull();
      expect(queryByText('Begin Quest')).toBeNull();
    });
  });

  describe('Edge Cases', () => {
    it('handles quest with very long title', () => {
      useQuestStore.setState({
        pendingQuest: {
          ...mockStoryQuest,
          title:
            'This is a very long quest title that should still render correctly without breaking the layout',
        },
        cancelQuest: jest.fn(),
      });

      const { getByText } = render(<PendingQuestScreen />);

      expect(
        getByText(
          'This is a very long quest title that should still render correctly without breaking the layout'
        )
      ).toBeTruthy();
    });

    it('handles quest with 0 duration', () => {
      useQuestStore.setState({
        pendingQuest: {
          ...mockStoryQuest,
          durationMinutes: 0,
        },
        cancelQuest: jest.fn(),
      });

      const { getByText } = render(<PendingQuestScreen />);

      expect(getByText('0 min offline')).toBeTruthy();
    });

    it('handles quest with large duration', () => {
      useQuestStore.setState({
        pendingQuest: {
          ...mockStoryQuest,
          durationMinutes: 120,
        },
        cancelQuest: jest.fn(),
      });

      const { getByText } = render(<PendingQuestScreen />);

      expect(getByText('120 min offline')).toBeTruthy();
    });
  });

  it('triggers animations on mount', async () => {
    const { getByTestId } = render(<PendingQuestScreen />);

    await waitFor(() => {
      expect(getByTestId('lock-instructions')).toBeTruthy();
    });
  });
});
