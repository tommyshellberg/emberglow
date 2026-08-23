import React from 'react';
import { StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { act, fireEvent, render, screen } from '@/lib/test-utils';
import type { Quest } from '@/store/types';

import { FailedQuest } from './index';

const mockUseNextAvailableQuests = jest.fn();
jest.mock('@/api/quest', () => ({
  useNextAvailableQuests: (...args: unknown[]) =>
    mockUseNextAvailableQuests(...args),
}));

const offering = (ids: string[]) => {
  const data = { quests: ids.map((customId) => ({ customId })) };
  return {
    data,
    isFetching: false,
    refetch: jest.fn().mockResolvedValue({ data }),
  };
};

/** The request is in flight and has not answered yet. */
const pending = (data?: { quests: { customId: string }[] }) => ({
  data,
  isFetching: true,
  refetch: jest.fn(() => new Promise<{ data: undefined }>(() => {})),
});

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
  beforeEach(() => {
    mockUseNextAvailableQuests.mockReturnValue(offering(['quest-1']));
  });

  it('renders the headline and quest title', async () => {
    render(
      <FailedQuest
        quest={{ ...baseQuest, mode: 'story' } as Quest}
        onRetry={jest.fn()}
      />
    );

    expect(await screen.findByText('Quest Failed')).toBeOnTheScreen();
    expect(screen.getByText('The Beginning')).toBeOnTheScreen();
  });

  it('shows the eyebrow with the quest mode label for story quests', async () => {
    render(
      <FailedQuest
        quest={{ ...baseQuest, mode: 'story' } as Quest}
        onRetry={jest.fn()}
      />
    );

    expect(await screen.findByText('STORY QUEST')).toBeOnTheScreen();
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

    it('clears the navigation bar by the gap the screen asks for', async () => {
      render(
        <FailedQuest
          quest={{ ...baseQuest, mode: 'story' } as Quest}
          onRetry={jest.fn()}
        />
      );

      const padding = StyleSheet.flatten(
        (await screen.findByTestId('failed-quest-content')).props.style
      ).paddingBottom;

      expect(padding).toBe(BOTTOM_INSET + WANTED_GAP);
    });
  });
});

describe('FailedQuest story outcome', () => {
  beforeEach(() => {
    // Each test asserts what this screen asked for, so no earlier render's
    // call may leak into `toHaveBeenCalledWith`.
    mockUseNextAvailableQuests.mockClear();
  });

  it('offers Try Again while the failed quest is still available', async () => {
    mockUseNextAvailableQuests.mockReturnValue(offering(['quest-1']));
    const onRetry = jest.fn();
    render(
      <FailedQuest
        quest={{ ...baseQuest, mode: 'story' } as Quest}
        onRetry={onRetry}
      />
    );
    fireEvent.press(await screen.findByText('Try Again'));
    expect(onRetry).toHaveBeenCalled();
    expect(screen.queryByText(/The story moves on/)).toBeNull();
    expect(mockUseNextAvailableQuests).toHaveBeenCalledWith({
      enabled: true,
    });
  });

  it('shows the consequence and Continue when the story has moved on', async () => {
    const questOffering = offering(['quest-1a', 'quest-1b']);
    mockUseNextAvailableQuests.mockReturnValue(questOffering);
    const onRetry = jest.fn();
    render(
      <FailedQuest
        quest={{ ...baseQuest, mode: 'story' } as Quest}
        onRetry={onRetry}
      />
    );
    expect(
      await screen.findByText(
        'The story moves on. What you couldn\u2019t finish will follow you.'
      )
    ).toBeOnTheScreen();
    expect(screen.queryByText('Try Again')).toBeNull();
    expect(screen.queryByText('Resist unlocking out of boredom.')).toBeNull();
    fireEvent.press(screen.getByText('Continue'));
    expect(onRetry).toHaveBeenCalled();
    expect(questOffering.refetch).toHaveBeenCalledTimes(1);
  });

  it('shows neither button while the first answer is still in flight', () => {
    mockUseNextAvailableQuests.mockReturnValue(pending());
    render(
      <FailedQuest
        quest={{ ...baseQuest, mode: 'story' } as Quest}
        onRetry={jest.fn()}
      />
    );
    expect(screen.queryByText('Try Again')).toBeNull();
    expect(screen.queryByText('Continue')).toBeNull();
    expect(screen.getByTestId('failed-quest-loading')).toBeOnTheScreen();
  });

  // A cached answer from before this quest failed cannot be trusted: the
  // server marked the run failed after that cache was filled.
  it('ignores a stale cached answer that is still being refetched', () => {
    mockUseNextAvailableQuests.mockReturnValue(
      pending({ quests: [{ customId: 'quest-1' }] })
    );
    render(
      <FailedQuest
        quest={{ ...baseQuest, mode: 'story' } as Quest}
        onRetry={jest.fn()}
      />
    );
    expect(screen.queryByText('Try Again')).toBeNull();
    expect(screen.queryByText('Continue')).toBeNull();
    expect(screen.getByTestId('failed-quest-loading')).toBeOnTheScreen();
  });

  it('custom quests always offer Try Again and never consult the story', () => {
    mockUseNextAvailableQuests.mockReturnValue(offering([]));
    render(
      <FailedQuest
        quest={{ ...baseQuest, mode: 'custom' } as Quest}
        onRetry={jest.fn()}
      />
    );
    expect(screen.getByText('Try Again')).toBeOnTheScreen();
    expect(mockUseNextAvailableQuests).toHaveBeenCalledWith({
      enabled: false,
    });
  });
});

describe('FailedQuest when the answer never arrives', () => {
  it('offers Try Again when the request fails', async () => {
    mockUseNextAvailableQuests.mockReturnValue({
      data: undefined,
      isFetching: false,
      isError: true,
      refetch: jest.fn().mockResolvedValue({ data: undefined }),
    });
    render(
      <FailedQuest
        quest={{ ...baseQuest, mode: 'story' } as Quest}
        onRetry={jest.fn()}
      />
    );

    expect(await screen.findByText('Try Again')).toBeOnTheScreen();
    expect(screen.queryByText(/The story moves on/)).toBeNull();
  });

  it('stops waiting and offers Try Again when the answer takes too long', () => {
    jest.useFakeTimers();
    try {
      mockUseNextAvailableQuests.mockReturnValue({
        data: undefined,
        isFetching: true,
        refetch: jest.fn(() => new Promise(() => {})),
      });
      render(
        <FailedQuest
          quest={{ ...baseQuest, mode: 'story' } as Quest}
          onRetry={jest.fn()}
        />
      );

      expect(screen.getByTestId('failed-quest-loading')).toBeOnTheScreen();

      act(() => {
        jest.advanceTimersByTime(5000);
      });

      expect(screen.getByText('Try Again')).toBeOnTheScreen();
      expect(screen.queryByTestId('failed-quest-loading')).toBeNull();
    } finally {
      jest.useRealTimers();
    }
  });
});
