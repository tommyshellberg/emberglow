import { render, screen } from '@testing-library/react-native';
import React from 'react';
import { StyleSheet } from 'react-native';

import { StoryOptionButtons } from './story-option-buttons';

describe('StoryOptionButtons', () => {
  // Issue #309: at the final story quest, two branching options were both
  // rendered with the literal label "Begin your journey" (the first-quest
  // override) instead of their actual `option.text`. Tapping still routed
  // to the correct quest, so the bug was purely in the rendered label.
  it('renders option.text on multi-option branches when storyline is at completion threshold', () => {
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

    expect(screen.getByText('Take the amulet to the temple')).toBeTruthy();
    expect(screen.getByText('Bury the amulet at the cliff')).toBeTruthy();
    expect(screen.queryByText('Begin your journey')).toBeNull();
  });

  it('shows the "Begin your journey" CTA on the very first quest (no options, storyline not yet started)', () => {
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

    expect(screen.getByText('Begin your journey')).toBeTruthy();
    expect(screen.queryByText('Start Quest')).toBeNull();
  });

  it('shows the generic "Start Quest" CTA on a single-quest screen once the storyline is underway', () => {
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

    expect(screen.getByText('Start Quest')).toBeTruthy();
    expect(screen.queryByText('Begin your journey')).toBeNull();
  });

  // Two-option row: a label that wraps to 2 lines shouldn't make its pill
  // taller than its sibling. Both options stretch to equal width AND height
  // via row alignItems:stretch -> wrapper flex:1 -> Button containerStyle/
  // style flexGrow:1.
  describe('two-option row sizing', () => {
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
      onQuestSelect: jest.fn(),
      onShowPaywall: jest.fn(),
    };

    it('renders both options in an equal-width, stretched row', () => {
      render(<StoryOptionButtons {...twoOptionsProps} />);

      expect(screen.getByText('Take the amulet to the temple')).toBeTruthy();
      expect(screen.getByText('Bury the amulet at the cliff')).toBeTruthy();

      const wrapperA = screen.getByTestId('story-option-opt-a');
      const wrapperB = screen.getByTestId('story-option-opt-b');
      expect(StyleSheet.flatten(wrapperA.props.style).flex).toBe(1);
      expect(StyleSheet.flatten(wrapperB.props.style).flex).toBe(1);
    });

    it('stretches each button (not just its wrapper) to match the taller sibling', () => {
      render(<StoryOptionButtons {...twoOptionsProps} />);

      const buttonA = screen.getByTestId('story-option-opt-a-button');
      const buttonB = screen.getByTestId('story-option-opt-b-button');
      const styleA = StyleSheet.flatten(buttonA.props.style);
      const styleB = StyleSheet.flatten(buttonB.props.style);

      expect(styleA.flexGrow).toBe(1);
      expect(styleA.alignSelf).toBe('stretch');
      expect(styleB.flexGrow).toBe(1);
      expect(styleB.alignSelf).toBe('stretch');

      const buttonWrapperA = screen.getByTestId(
        'story-option-opt-a-button-wrapper'
      );
      expect(StyleSheet.flatten(buttonWrapperA.props.style).flexGrow).toBe(1);
    });
  });

  it('renders "Premium" (no emoji) on a locked single-quest CTA', () => {
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

    expect(screen.getByText('Premium')).toBeTruthy();
    expect(screen.queryByText('⭐ Premium')).toBeNull();
  });
});
