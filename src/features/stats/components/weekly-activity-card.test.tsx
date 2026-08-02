import React from 'react';

import { fireEvent, render, screen } from '@/lib/test-utils';
import { useQuestStore } from '@/store/quest-store';

import { WeeklyActivityCard } from './weekly-activity-card';

jest.mock('lucide-react-native', () => ({
  ChevronRight: () => null,
}));

describe('WeeklyActivityCard', () => {
  it('renders the compact chart with 7 bars from store data', () => {
    useQuestStore.setState({ completedQuests: [] });
    render(<WeeklyActivityCard onPress={jest.fn()} />);
    expect(screen.getAllByTestId(/^activity-bar-/)).toHaveLength(7);
    expect(screen.getByText('LAST 7 DAYS')).toBeOnTheScreen();
  });

  it('fires onPress when tapped', () => {
    useQuestStore.setState({ completedQuests: [] });
    const onPress = jest.fn();
    render(<WeeklyActivityCard onPress={onPress} />);
    fireEvent.press(screen.getByTestId('weekly-activity-card'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  // The outer Pressable has accessible={true}, which on RN collapses its
  // subtree into one opaque accessibility element — so the chart's own
  // summary label (built in weekly-activity-chart.tsx) becomes unreachable
  // to VoiceOver/TalkBack unless the boundary carries an explicit label of
  // its own. Use a non-empty week so the label can't accidentally match the
  // "no activity" fallback string.
  it('exposes the chart summary as the pressable accessibility label', () => {
    useQuestStore.setState({
      completedQuests: [{ id: '1', durationMinutes: 42, stopTime: Date.now() }],
    });
    render(<WeeklyActivityCard onPress={jest.fn()} />);
    const card = screen.getByTestId('weekly-activity-card');
    expect(card.props.accessibilityLabel).toContain(
      '42m across 1 days this week'
    );
  });
});
