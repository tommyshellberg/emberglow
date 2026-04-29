import { render, screen } from '@testing-library/react-native';
import React from 'react';

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
});
