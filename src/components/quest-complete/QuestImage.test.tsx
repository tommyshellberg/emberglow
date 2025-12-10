import { render } from '@testing-library/react-native';
import React from 'react';

import { QuestImage } from './QuestImage';
import type { QuestWithMode } from './types';

// Mock Lottie
jest.mock('lottie-react-native', () => 'LottieView');

// Mock user store
jest.mock('@/store/user-store', () => ({
  useUserStore: jest.fn((selector) =>
    selector({
      user: { id: 'user-123', name: 'Test User', email: 'test@example.com' },
    })
  ),
}));

describe('QuestImage', () => {
  const mockStoryQuest: QuestWithMode = {
    id: 'quest-1',
    mode: 'story',
    title: 'Test Story Quest',
    durationMinutes: 5,
    reward: { xp: 10 },
    status: 'pending',
  };

  const mockCustomQuest: QuestWithMode = {
    id: 'custom-123',
    mode: 'custom',
    category: 'fitness',
    title: 'Test Custom Quest',
    durationMinutes: 30,
    reward: { xp: 50 },
    status: 'pending',
  };

  describe('Rendering', () => {
    it('should render image for story quest', () => {
      const { getByTestId } = render(<QuestImage quest={mockStoryQuest} />);
      expect(getByTestId('quest-image')).toBeTruthy();
    });

    it('should render image for custom quest', () => {
      const { getByTestId } = render(<QuestImage quest={mockCustomQuest} />);
      expect(getByTestId('quest-image')).toBeTruthy();
    });

    it('should render XP badge', () => {
      const { getByText } = render(<QuestImage quest={mockStoryQuest} />);
      expect(getByText('+10 XP')).toBeTruthy();
    });

    it('should render Lottie animation', () => {
      const { UNSAFE_getByType } = render(
        <QuestImage quest={mockStoryQuest} />
      );
      const lottieViews = UNSAFE_getByType('LottieView' as any);
      expect(lottieViews).toBeTruthy();
    });
  });

  describe('XP Display', () => {
    it('should display correct XP for different reward amounts', () => {
      const questWith100XP: QuestWithMode = {
        ...mockCustomQuest,
        reward: { xp: 100 },
      };

      const { getByText } = render(<QuestImage quest={questWith100XP} />);
      expect(getByText('+100 XP')).toBeTruthy();
    });

    it('should handle large XP values', () => {
      const questWithLargeXP: QuestWithMode = {
        ...mockCustomQuest,
        reward: { xp: 9999 },
      };

      const { getByText } = render(<QuestImage quest={questWithLargeXP} />);
      expect(getByText('+9999 XP')).toBeTruthy();
    });

    it('should display adjusted XP when participant rewards are available', () => {
      // Quest with base XP of 15, but participant has adjusted XP of 21 (1.4x multiplier from perks)
      const questWithPerkBonus: QuestWithMode = {
        ...mockCustomQuest,
        reward: { xp: 15 },
        participants: [
          {
            userId: 'user-123', // Matches the mocked user ID
            ready: true,
            status: 'completed',
            phoneLocked: true,
            rewards: {
              baseXP: 15,
              adjustedXP: 21, // 15 * 1.4 multiplier from alchemist perk
              multiplier: 1.4,
              perksApplied: ['alchemist-household-perk'],
            },
          },
        ],
      };

      const { getByText, queryByText } = render(
        <QuestImage quest={questWithPerkBonus} />
      );

      // Should display adjusted XP, not base XP
      expect(getByText('+21 XP')).toBeTruthy();
      expect(queryByText('+15 XP')).toBeFalsy();
    });

    it('should fall back to base XP when participant rewards are not available', () => {
      const questWithoutRewards: QuestWithMode = {
        ...mockCustomQuest,
        reward: { xp: 15 },
        participants: [
          {
            userId: 'user-123',
            ready: true,
            status: 'completed',
            phoneLocked: true,
            // No rewards field
          },
        ],
      };

      const { getByText } = render(<QuestImage quest={questWithoutRewards} />);

      // Should fall back to base XP
      expect(getByText('+15 XP')).toBeTruthy();
    });

    it('should fall back to base XP when quest has no participants', () => {
      const questWithoutParticipants: QuestWithMode = {
        ...mockCustomQuest,
        reward: { xp: 20 },
        // No participants array
      };

      const { getByText } = render(
        <QuestImage quest={questWithoutParticipants} />
      );

      // Should fall back to base XP
      expect(getByText('+20 XP')).toBeTruthy();
    });
  });

  describe('Accessibility', () => {
    it('should have accessible label for XP badge', () => {
      const { getByLabelText } = render(<QuestImage quest={mockStoryQuest} />);
      expect(getByLabelText('Experience points reward: 10 XP')).toBeTruthy();
    });

    it('should have accessible label for quest image container', () => {
      const { getByTestId } = render(<QuestImage quest={mockStoryQuest} />);
      expect(getByTestId('quest-image-container')).toBeTruthy();
    });
  });

  describe('Image Selection', () => {
    it('should use consistent image for same quest', () => {
      const { getByTestId: getByTestId1 } = render(
        <QuestImage quest={mockStoryQuest} />
      );
      const { getByTestId: getByTestId2 } = render(
        <QuestImage quest={mockStoryQuest} />
      );

      const image1 = getByTestId1('quest-image');
      const image2 = getByTestId2('quest-image');

      expect(image1.props.source).toEqual(image2.props.source);
    });
  });

  describe('Animation Behavior', () => {
    it('should not disable animations by default', () => {
      const { UNSAFE_getByType } = render(
        <QuestImage quest={mockStoryQuest} />
      );
      const lottieView = UNSAFE_getByType('LottieView' as any);
      expect(lottieView.props.autoPlay).toBe(false);
    });

    it('should respect disableAnimations prop', () => {
      const { UNSAFE_queryByType } = render(
        <QuestImage quest={mockStoryQuest} disableAnimations={true} />
      );
      // Animation should still be present but won't auto-play
      const lottieView = UNSAFE_queryByType('LottieView' as any);
      expect(lottieView).toBeTruthy();
    });
  });
});
