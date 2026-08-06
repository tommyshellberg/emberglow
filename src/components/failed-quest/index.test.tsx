import React from 'react';
import { StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { render, screen } from '@/lib/test-utils';
import type { Quest } from '@/store/types';

import { FailedQuest } from './index';

const baseQuest = {
  id: 'quest-1',
  title: 'The Beginning',
  durationMinutes: 5,
  poiSlug: 'tavern',
  story: 'Your adventure begins...',
  recap: 'You started your journey',
  options: [],
  reward: { xp: 20 },
  status: 'failed' as const,
} as unknown as Quest;

describe('FailedQuest', () => {
  it('renders the headline and quest title', () => {
    render(
      <FailedQuest
        quest={{ ...baseQuest, mode: 'story' } as Quest}
        onRetry={jest.fn()}
      />
    );

    expect(screen.getByText('Quest Failed')).toBeOnTheScreen();
    expect(screen.getByText('The Beginning')).toBeOnTheScreen();
  });

  it('shows the eyebrow with the quest mode label for story quests', () => {
    render(
      <FailedQuest
        quest={{ ...baseQuest, mode: 'story' } as Quest}
        onRetry={jest.fn()}
      />
    );

    expect(screen.getByText('STORY QUEST')).toBeOnTheScreen();
  });

  it('shows the eyebrow with the quest mode label for custom quests', () => {
    render(
      <FailedQuest
        quest={
          {
            ...baseQuest,
            mode: 'custom',
            category: 'fitness',
          } as unknown as Quest
        }
        onRetry={jest.fn()}
      />
    );

    expect(screen.getByText('CUSTOM QUEST')).toBeOnTheScreen();
  });

  // "Try Again" is a full-width primary CTA sitting directly above the Android
  // navigation bar, so it needs real thumb clearance, not the 8px gap
  // ScreenContainer gives ordinary screens. The screen asks for 32 via
  // `paddingVertical`, but Yoga resolves padding by edge specificity rather
  // than source order: ScreenContainer's `paddingBottom` wins over a later
  // `paddingVertical`, so that 32 never reached the bottom edge. The value has
  // to travel through `bottomPadding` instead.
  describe('Bottom safe area', () => {
    /** A 3-button-nav Android device. The global mock defaults every inset to
     * 0, which would make this vacuous. 48 also differs from both the wanted
     * gap (32) and the ScreenContainer default (8), so no two of the three can
     * be confused for one another in the sum. */
    const BOTTOM_INSET = 48;
    const WANTED_GAP = 32;

    beforeEach(() => {
      jest.mocked(useSafeAreaInsets).mockReturnValue({
        top: 24,
        right: 0,
        bottom: BOTTOM_INSET,
        left: 0,
      });
    });

    it('clears the navigation bar by the gap the screen asks for', () => {
      render(
        <FailedQuest
          quest={{ ...baseQuest, mode: 'story' } as Quest}
          onRetry={jest.fn()}
        />
      );

      const padding = StyleSheet.flatten(
        screen.getByTestId('failed-quest-content').props.style
      ).paddingBottom;

      expect(padding).toBe(BOTTOM_INSET + WANTED_GAP);
    });
  });
});
