import * as React from 'react';
import { StyleSheet, Text } from 'react-native';

import { colors, palette, withAlpha } from '@/theme';
import { render, screen, setup } from '@/lib/test-utils';

import { IconButton } from './icon-button';

/** Stand-in for a lucide-react-native icon: renders the color/size it was cloned with. */
function MockIcon({ color, size }: { color?: string; size?: number }) {
  return <Text testID="mock-icon">{`${color ?? 'none'}|${size ?? 'none'}`}</Text>;
}

describe('IconButton', () => {
  it('sets accessibilityLabel from the label prop', () => {
    render(
      <IconButton label="Settings">
        <MockIcon />
      </IconButton>
    );

    expect(screen.getByLabelText('Settings')).toBeOnTheScreen();
  });

  it('calls onPress when pressed', async () => {
    const onPress = jest.fn();
    const { user } = setup(
      <IconButton label="Settings" onPress={onPress}>
        <MockIcon />
      </IconButton>
    );

    await user.press(screen.getByLabelText('Settings'));

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('does not recolor the icon with the warm tint when inactive', () => {
    render(
      <IconButton label="Settings">
        <MockIcon />
      </IconButton>
    );

    expect(screen.getByTestId('mock-icon')).toHaveTextContent(
      colors.text.secondary,
      { exact: false }
    );
  });

  it('marks accessibilityState.selected and recolors the icon with the warm tint when active', () => {
    render(
      <IconButton label="Settings" active>
        <MockIcon />
      </IconButton>
    );

    const button = screen.getByLabelText('Settings');
    expect(button.props.accessibilityState).toEqual(
      expect.objectContaining({ selected: true })
    );
    expect(screen.getByTestId('mock-icon')).toHaveTextContent(
      colors.text.accent,
      { exact: false }
    );
  });

  it('applies a warm Sandy border and background tint when active', () => {
    render(
      <IconButton label="Settings" active>
        <MockIcon />
      </IconButton>
    );

    const style = StyleSheet.flatten(
      screen.getByLabelText('Settings').props.style
    );
    expect(style.borderColor).toBe(withAlpha(palette.sandy, 0.5));
    expect(style.backgroundColor).toBe(withAlpha(palette.sandy, 0.12));
  });

  it('is inert when disabled: onPress does not fire and accessibilityState.disabled is true', async () => {
    const onPress = jest.fn();
    const { user } = setup(
      <IconButton label="Settings" disabled onPress={onPress}>
        <MockIcon />
      </IconButton>
    );

    const button = screen.getByLabelText('Settings');
    expect(button.props.accessibilityState).toEqual(
      expect.objectContaining({ disabled: true })
    );

    await user.press(button);

    expect(onPress).not.toHaveBeenCalled();
  });

  it('reduces opacity when disabled', () => {
    render(
      <IconButton label="Settings" disabled>
        <MockIcon />
      </IconButton>
    );

    const style = StyleSheet.flatten(
      screen.getByLabelText('Settings').props.style
    );
    expect(style.opacity).toBe(0.4);
  });

  it('sizes the icon to half the button diameter when the child sets no size', () => {
    render(
      <IconButton label="Settings" size={44}>
        <MockIcon />
      </IconButton>
    );

    expect(screen.getByTestId('mock-icon')).toHaveTextContent('|22', {
      exact: false,
    });
  });

  it('preserves an explicit size already set on the child icon', () => {
    render(
      <IconButton label="Settings" size={44}>
        <MockIcon size={18} />
      </IconButton>
    );

    expect(screen.getByTestId('mock-icon')).toHaveTextContent('|18', {
      exact: false,
    });
  });
});
