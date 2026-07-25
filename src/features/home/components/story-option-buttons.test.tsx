import { act, fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';
import { AccessibilityInfo } from 'react-native';

import { StoryOptionButtons } from './story-option-buttons';

// expo-haptics is a native module the jest environment can't load; the
// component references its enums at call sites, so stub the surface.
jest.mock('expo-haptics', () => ({
  selectionAsync: jest.fn(),
  impactAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy' },
}));

/** 650ms commit settle, per the decisionSlider README. */
const COMMIT_SETTLE_MS = 650;

function mockAccessibility({ screenReader = false } = {}) {
  jest
    .spyOn(AccessibilityInfo, 'isScreenReaderEnabled')
    .mockResolvedValue(screenReader);
  jest
    .spyOn(AccessibilityInfo, 'isReduceMotionEnabled')
    .mockResolvedValue(false);
  jest
    .spyOn(AccessibilityInfo, 'addEventListener')
    .mockReturnValue({ remove: jest.fn() } as any);
}

/** Flush the AccessibilityInfo promises DecisionSlider reads on mount. */
async function flushMountEffects() {
  await act(async () => {});
}

beforeEach(() => {
  mockAccessibility();
});

afterEach(() => {
  jest.restoreAllMocks();
  jest.useRealTimers();
});

describe('StoryOptionButtons', () => {
  // Issue #309: at the final story quest, two branching options were both
  // rendered with the literal label "Begin your journey" (the first-quest
  // override) instead of their actual `option.text`. Tapping still routed
  // to the correct quest, so the bug was purely in the rendered label.
  it('renders option.text on multi-option branches when storyline is at completion threshold', async () => {
    render(
      <StoryOptionButtons
        activeIndex={0}
        serverQuests={[]}
        storyOptions={[
          {
            id: 'opt-a',
            text: 'Take the amulet to the temple',
            nextQuestId: 'quest-30b',
          },
          {
            id: 'opt-b',
            text: 'Bury the amulet at the cliff',
            nextQuestId: 'quest-30c',
          },
        ]}
        hasStartedStoryline={true}
        hasPremiumAccess={true}
        onQuestSelect={jest.fn()}
        onShowPaywall={jest.fn()}
      />
    );
    await flushMountEffects();

    expect(screen.getByText('Take the amulet to the temple')).toBeTruthy();
    expect(screen.getByText('Bury the amulet at the cliff')).toBeTruthy();
    expect(screen.queryByText('Begin your journey')).toBeNull();
  });

  it('shows the "Begin your journey" CTA on the very first quest (no options, storyline not yet started)', async () => {
    render(
      <StoryOptionButtons
        activeIndex={0}
        serverQuests={[{ customId: 'quest-1', isPremium: false }]}
        storyOptions={[]}
        hasStartedStoryline={false}
        hasPremiumAccess={true}
        onQuestSelect={jest.fn()}
        onShowPaywall={jest.fn()}
      />
    );
    await flushMountEffects();

    expect(screen.getByText('Begin your journey')).toBeTruthy();
    expect(screen.queryByText('Start Quest')).toBeNull();
  });

  it('shows the generic "Start Quest" CTA on a single-quest screen once the storyline is underway', async () => {
    render(
      <StoryOptionButtons
        activeIndex={0}
        serverQuests={[{ customId: 'quest-15', isPremium: false }]}
        storyOptions={[]}
        hasStartedStoryline={true}
        hasPremiumAccess={true}
        onQuestSelect={jest.fn()}
        onShowPaywall={jest.fn()}
      />
    );
    await flushMountEffects();

    expect(screen.getByText('Start Quest')).toBeTruthy();
    expect(screen.queryByText('Begin your journey')).toBeNull();
  });

  describe('single-choice decision slider (no branching, not locked)', () => {
    it('commits the hold via the accessible tap path and selects the quest', async () => {
      mockAccessibility({ screenReader: true });
      jest.useFakeTimers();
      const onQuestSelect = jest.fn();
      render(
        <StoryOptionButtons
          activeIndex={0}
          serverQuests={[{ customId: 'quest-15', isPremium: false }]}
          storyOptions={[]}
          hasStartedStoryline={true}
          hasPremiumAccess={true}
          onQuestSelect={onQuestSelect}
          onShowPaywall={jest.fn()}
        />
      );
      await flushMountEffects();

      fireEvent.press(screen.getByRole('button', { name: 'Start Quest' }));
      act(() => jest.advanceTimersByTime(COMMIT_SETTLE_MS));

      expect(onQuestSelect).toHaveBeenCalledWith('quest-15');
    });
  });

  describe('single-option decision slider', () => {
    const singleOptionProps = {
      activeIndex: 0,
      serverQuests: [],
      storyOptions: [
        {
          id: 'opt-a',
          text: 'Continue onward',
          nextQuestId: 'quest-9',
        },
      ],
      hasStartedStoryline: true,
      hasPremiumAccess: true,
      onShowPaywall: jest.fn(),
    };

    it('renders the option text and the spec default eyebrow', async () => {
      render(
        <StoryOptionButtons {...singleOptionProps} onQuestSelect={jest.fn()} />
      );
      await flushMountEffects();

      expect(screen.getByText('Continue onward')).toBeTruthy();
      expect(screen.getByText('One path remains')).toBeTruthy();
    });

    it('commits via the accessible tap path and selects nextQuestId', async () => {
      mockAccessibility({ screenReader: true });
      jest.useFakeTimers();
      const onQuestSelect = jest.fn();
      render(
        <StoryOptionButtons
          {...singleOptionProps}
          onQuestSelect={onQuestSelect}
        />
      );
      await flushMountEffects();

      fireEvent.press(screen.getByRole('button', { name: 'Continue onward' }));
      act(() => jest.advanceTimersByTime(COMMIT_SETTLE_MS));

      expect(onQuestSelect).toHaveBeenCalledWith('quest-9');
    });

    it('disables the slider when the option has no nextQuestId', async () => {
      mockAccessibility({ screenReader: true });
      render(
        <StoryOptionButtons
          {...singleOptionProps}
          storyOptions={[
            { id: 'opt-a', text: 'Continue onward', nextQuestId: null },
          ]}
          onQuestSelect={jest.fn()}
        />
      );
      await flushMountEffects();

      expect(
        screen.getByRole('button', { name: 'Continue onward' })
      ).toBeDisabled();
    });
  });

  describe('two-choice decision slider', () => {
    const twoOptionsProps = {
      activeIndex: 0,
      serverQuests: [],
      storyOptions: [
        {
          id: 'opt-a',
          text: 'Take the amulet to the temple',
          nextQuestId: 'quest-30b',
        },
        {
          id: 'opt-b',
          text: 'Bury the amulet at the cliff',
          nextQuestId: 'quest-30c',
        },
      ],
      hasStartedStoryline: true,
      hasPremiumAccess: true,
      onShowPaywall: jest.fn(),
    };

    it('renders both options and the spec default eyebrow', async () => {
      render(
        <StoryOptionButtons {...twoOptionsProps} onQuestSelect={jest.fn()} />
      );
      await flushMountEffects();

      expect(screen.getByText('Take the amulet to the temple')).toBeTruthy();
      expect(screen.getByText('Bury the amulet at the cliff')).toBeTruthy();
      expect(screen.getByText('The path splits')).toBeTruthy();
    });

    it('commits the left option via the accessible tap path', async () => {
      mockAccessibility({ screenReader: true });
      jest.useFakeTimers();
      const onQuestSelect = jest.fn();
      render(
        <StoryOptionButtons
          {...twoOptionsProps}
          onQuestSelect={onQuestSelect}
        />
      );
      await flushMountEffects();

      fireEvent.press(
        screen.getByRole('button', { name: 'Take the amulet to the temple' })
      );
      act(() => jest.advanceTimersByTime(COMMIT_SETTLE_MS));

      expect(onQuestSelect).toHaveBeenCalledWith('quest-30b');
    });

    it('commits the right option via the accessible tap path', async () => {
      mockAccessibility({ screenReader: true });
      jest.useFakeTimers();
      const onQuestSelect = jest.fn();
      render(
        <StoryOptionButtons
          {...twoOptionsProps}
          onQuestSelect={onQuestSelect}
        />
      );
      await flushMountEffects();

      fireEvent.press(
        screen.getByRole('button', { name: 'Bury the amulet at the cliff' })
      );
      act(() => jest.advanceTimersByTime(COMMIT_SETTLE_MS));

      expect(onQuestSelect).toHaveBeenCalledWith('quest-30c');
    });

    // A branching quest option missing `nextQuestId` is a data-integrity
    // edge case (today's Button row renders just that side disabled).
    // DecisionSlider can't disable one side independently, so a commit
    // landing there must not route a null questId — and because a committed
    // slider instance locks, the no-op must also key-remount it so the
    // user can still take the live path afterwards (not just "nothing
    // happened", but "recoverable").
    it('treats a commit on the side missing nextQuestId as a no-op and recovers via remount', async () => {
      mockAccessibility({ screenReader: true });
      jest.useFakeTimers();
      const onQuestSelect = jest.fn();
      render(
        <StoryOptionButtons
          {...twoOptionsProps}
          storyOptions={[
            {
              id: 'opt-a',
              text: 'Take the amulet to the temple',
              nextQuestId: null,
            },
            {
              id: 'opt-b',
              text: 'Bury the amulet at the cliff',
              nextQuestId: 'quest-30c',
            },
          ]}
          onQuestSelect={onQuestSelect}
        />
      );
      await flushMountEffects();

      // Commit lands on the dead side: no quest selection.
      fireEvent.press(
        screen.getByRole('button', { name: 'Take the amulet to the temple' })
      );
      act(() => jest.advanceTimersByTime(COMMIT_SETTLE_MS));

      expect(onQuestSelect).not.toHaveBeenCalled();

      // The no-op remounted the slider — the live side must still commit.
      // (A slider left locked forever would fail here.)
      await flushMountEffects();
      fireEvent.press(
        screen.getByRole('button', { name: 'Bury the amulet at the cliff' })
      );
      act(() => jest.advanceTimersByTime(COMMIT_SETTLE_MS));

      expect(onQuestSelect).toHaveBeenCalledTimes(1);
      expect(onQuestSelect).toHaveBeenCalledWith('quest-30c');
    });
  });

  it('renders "Premium" (no emoji) on a locked single-quest CTA', async () => {
    render(
      <StoryOptionButtons
        activeIndex={0}
        serverQuests={[
          { customId: 'quest-11', isPremium: true, requiresPremium: true },
        ]}
        storyOptions={[]}
        hasStartedStoryline={true}
        hasPremiumAccess={false}
        onQuestSelect={jest.fn()}
        onShowPaywall={jest.fn()}
      />
    );
    await flushMountEffects();

    expect(screen.getByText('Premium')).toBeTruthy();
    expect(screen.queryByText('⭐ Premium')).toBeNull();
  });
});
