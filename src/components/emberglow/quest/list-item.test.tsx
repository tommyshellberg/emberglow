import * as React from 'react';
import { Text } from 'react-native';

import { render, screen, setup } from '@/lib/test-utils';

import { ListItem } from './list-item';

describe('ListItem', () => {
  it('renders the title and subtitle', () => {
    render(
      <ListItem title="Collecting Firewood" subtitle="Yesterday · 15 min" />
    );

    expect(screen.getByText('Collecting Firewood')).toBeOnTheScreen();
    expect(screen.getByText('Yesterday · 15 min')).toBeOnTheScreen();
  });

  it('renders without a subtitle', () => {
    render(<ListItem title="Collecting Firewood" />);

    expect(screen.getByText('Collecting Firewood')).toBeOnTheScreen();
    expect(screen.queryByText('Yesterday · 15 min')).not.toBeOnTheScreen();
  });

  it('renders leading and trailing content', () => {
    render(
      <ListItem
        title="Collecting Firewood"
        leading={<Text>icon</Text>}
        trailing={<Text>+72 XP</Text>}
      />
    );

    expect(screen.getByText('icon')).toBeOnTheScreen();
    expect(screen.getByText('+72 XP')).toBeOnTheScreen();
  });

  it('fires onPress when pressed', async () => {
    const onPress = jest.fn();
    const { user } = setup(
      <ListItem title="Collecting Firewood" onPress={onPress} />
    );

    await user.press(screen.getByText('Collecting Firewood'));

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('exposes the button role when onPress is provided', () => {
    render(
      <ListItem title="Collecting Firewood" onPress={jest.fn()} testID="row" />
    );

    expect(screen.getByTestId('row').props.accessibilityRole).toBe('button');
  });

  it('does not expose a button role when onPress is absent', () => {
    render(<ListItem title="Collecting Firewood" testID="row" />);

    expect(screen.getByTestId('row').props.accessibilityRole).toBeUndefined();
  });

  it('truncates the title to a single line', () => {
    render(<ListItem title="A very long quest title that should truncate" />);

    const title = screen.getByText(
      'A very long quest title that should truncate'
    );
    expect(title.props.numberOfLines).toBe(1);
  });
});
