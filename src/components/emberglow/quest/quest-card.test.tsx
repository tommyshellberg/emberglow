import * as React from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import { StyleSheet } from 'react-native';

import { render, screen, setup } from '@/lib/test-utils';
import { palette, withAlpha } from '@/theme';

import { QuestCard } from './quest-card';

describe('QuestCard', () => {
  it('renders the title and description', () => {
    render(
      <QuestCard title="Collecting Firewood" description="Night falls." />
    );

    expect(screen.getByText('Collecting Firewood')).toBeOnTheScreen();
    expect(screen.getByText('Night falls.')).toBeOnTheScreen();
  });

  it('maps status to the matching badge tone', () => {
    // Badge container is two composite hops up from the status Text: the
    // host Text's `.parent` is the composite `Text` wrapper, and that
    // wrapper's `.parent` is Badge's host `View`.
    const badgeContainerStyle = (label: string) => {
      const node = screen.getByText(label).parent?.parent as unknown as {
        props: { style?: StyleProp<ViewStyle> };
      };
      return StyleSheet.flatten(node.props.style);
    };

    const { rerender } = render(
      <QuestCard title="Quest" status="In progress" />
    );
    expect(badgeContainerStyle('In progress').backgroundColor).toBe(
      withAlpha(palette.cinnabar, 0.18)
    );

    rerender(<QuestCard title="Quest" status="Complete" />);
    expect(badgeContainerStyle('Complete').backgroundColor).toBe(
      withAlpha('#7da87b', 0.15)
    );

    rerender(<QuestCard title="Quest" status="Available" />);
    expect(badgeContainerStyle('Available').backgroundColor).toBe(
      withAlpha(palette.bone, 0.06)
    );
  });

  it('renders an XP badge reading "+40 XP" when xp is given', () => {
    render(<QuestCard title="Quest" xp={40} />);

    expect(screen.getByText('+40 XP')).toBeOnTheScreen();
  });

  it('calls onPress when pressed', async () => {
    const onPress = jest.fn();
    const { user } = setup(
      <QuestCard title="Quest" onPress={onPress} testID="quest-card" />
    );

    await user.press(screen.getByTestId('quest-card'));

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('renders no scrim gradient when there is no image', () => {
    render(<QuestCard title="Quest" testID="quest-card" />);

    expect(screen.queryByTestId('quest-card-scrim')).not.toBeOnTheScreen();
  });

  it('renders the scrim gradient when an image is given', () => {
    render(
      <QuestCard
        title="Quest"
        image={{ uri: 'https://example.com/a.jpg' }}
        testID="quest-card"
      />
    );

    expect(screen.getByTestId('quest-card-scrim')).toBeOnTheScreen();
  });

  it('uses a warm border on the inner layer when glow is set', () => {
    const { rerender } = render(
      <QuestCard title="Quest" testID="quest-card" />
    );

    let inner = screen.getByTestId('quest-card-inner');
    let style = StyleSheet.flatten(inner.props.style);
    expect(style.borderColor).not.toBe(withAlpha(palette.sandy, 0.35));

    rerender(<QuestCard title="Quest" testID="quest-card" glow />);

    inner = screen.getByTestId('quest-card-inner');
    style = StyleSheet.flatten(inner.props.style);
    expect(style.borderColor).toBe(withAlpha(palette.sandy, 0.35));
  });
});
