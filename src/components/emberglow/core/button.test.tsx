import * as React from 'react';
import { StyleSheet, Text } from 'react-native';

import { cleanup, render, screen, setup } from '@/lib/test-utils';
import { colors } from '@/theme';

import { Button } from './button';

afterEach(cleanup);

describe('Button', () => {
  it('renders the label', () => {
    render(<Button testID="button" label="Begin quest" />);
    expect(screen.getByText('Begin quest')).toBeOnTheScreen();
  });

  it('renders children instead of the label when provided', () => {
    render(
      <Button testID="button" label="Begin quest">
        <Text>Custom child</Text>
      </Button>
    );
    expect(screen.getByText('Custom child')).toBeOnTheScreen();
    expect(screen.queryByText('Begin quest')).not.toBeOnTheScreen();
  });

  it('fires onPress when pressed', async () => {
    const onPress = jest.fn();
    const { user } = setup(
      <Button testID="button" label="Begin quest" onPress={onPress} />
    );
    await user.press(screen.getByTestId('button'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('blocks onPress and marks accessibilityState.disabled when disabled', async () => {
    const onPress = jest.fn();
    const { user } = setup(
      <Button testID="button" label="Begin quest" disabled onPress={onPress} />
    );
    const button = screen.getByTestId('button');
    expect(button.props.accessibilityState.disabled).toBe(true);
    await user.press(button);
    expect(onPress).not.toHaveBeenCalled();
  });

  it('exposes the button accessibility role', () => {
    render(<Button testID="button" label="Begin quest" />);
    expect(screen.getByTestId('button').props.accessibilityRole).toBe('button');
  });

  describe('variant styling at rest', () => {
    it('primary: cinnabar background, transparent border, on-accent text', () => {
      render(<Button testID="button" label="Begin quest" variant="primary" />);
      const style = StyleSheet.flatten(
        screen.getByTestId('button').props.style
      );
      expect(style.backgroundColor).toBe(colors.accent.primary);
      expect(style.borderColor).toBe('transparent');

      const textStyle = StyleSheet.flatten(
        screen.getByText('Begin quest').props.style
      );
      expect(textStyle.color).toBe(colors.text.onAccent);
    });

    it('secondary: faint fill, subtle border, primary text', () => {
      render(
        <Button testID="button" label="Begin quest" variant="secondary" />
      );
      const style = StyleSheet.flatten(
        screen.getByTestId('button').props.style
      );
      expect(style.backgroundColor).toBe(colors.fill.faint);
      expect(style.borderColor).toBe(colors.border.subtle);

      const textStyle = StyleSheet.flatten(
        screen.getByText('Begin quest').props.style
      );
      expect(textStyle.color).toBe(colors.text.primary);
    });

    it('ghost: transparent background and border, secondary text', () => {
      render(<Button testID="button" label="Begin quest" variant="ghost" />);
      const style = StyleSheet.flatten(
        screen.getByTestId('button').props.style
      );
      expect(style.backgroundColor).toBe('transparent');
      expect(style.borderColor).toBe('transparent');

      const textStyle = StyleSheet.flatten(
        screen.getByText('Begin quest').props.style
      );
      expect(textStyle.color).toBe(colors.text.secondary);
    });

    it('outline: transparent background, strong border, primary text', () => {
      render(<Button testID="button" label="Begin quest" variant="outline" />);
      const style = StyleSheet.flatten(
        screen.getByTestId('button').props.style
      );
      expect(style.backgroundColor).toBe('transparent');
      expect(style.borderColor).toBe(colors.border.strong);

      const textStyle = StyleSheet.flatten(
        screen.getByText('Begin quest').props.style
      );
      expect(textStyle.color).toBe(colors.text.primary);
    });
  });

  describe('size styling', () => {
    it('sm: 8x16 padding, 14pt text, 36pt min height', () => {
      render(<Button testID="button" label="Begin quest" size="sm" />);
      const style = StyleSheet.flatten(
        screen.getByTestId('button').props.style
      );
      expect(style.paddingVertical).toBe(8);
      expect(style.paddingHorizontal).toBe(16);
      expect(style.minHeight).toBe(36);
      const textStyle = StyleSheet.flatten(
        screen.getByText('Begin quest').props.style
      );
      expect(textStyle.fontSize).toBe(14);
    });

    it('md: 12x22 padding, 16pt text, 48pt min height', () => {
      render(<Button testID="button" label="Begin quest" size="md" />);
      const style = StyleSheet.flatten(
        screen.getByTestId('button').props.style
      );
      expect(style.paddingVertical).toBe(12);
      expect(style.paddingHorizontal).toBe(22);
      expect(style.minHeight).toBe(48);
      const textStyle = StyleSheet.flatten(
        screen.getByText('Begin quest').props.style
      );
      expect(textStyle.fontSize).toBe(16);
    });

    it('lg: 14x26 padding, 17pt text, 54pt min height', () => {
      render(<Button testID="button" label="Begin quest" size="lg" />);
      const style = StyleSheet.flatten(
        screen.getByTestId('button').props.style
      );
      expect(style.paddingVertical).toBe(14);
      expect(style.paddingHorizontal).toBe(26);
      expect(style.minHeight).toBe(54);
      const textStyle = StyleSheet.flatten(
        screen.getByText('Begin quest').props.style
      );
      expect(textStyle.fontSize).toBe(17);
    });
  });

  it('stretches to fill its container when fullWidth is set', () => {
    render(<Button testID="button" label="Begin quest" fullWidth />);
    const style = StyleSheet.flatten(screen.getByTestId('button').props.style);
    expect(style.alignSelf).toBe('stretch');
  });

  it('defaults to alignSelf flex-start when not fullWidth', () => {
    render(<Button testID="button" label="Begin quest" />);
    const style = StyleSheet.flatten(screen.getByTestId('button').props.style);
    expect(style.alignSelf).toBe('flex-start');
  });

  it('does not stretch the outer glow wrapper beyond its content when not fullWidth', () => {
    render(<Button testID="button" label="Begin quest" />);
    const wrapperStyle = StyleSheet.flatten(
      screen.getByTestId('button-wrapper').props.style
    );
    expect(wrapperStyle.alignSelf).toBe('flex-start');
  });

  it('stretches the outer glow wrapper when fullWidth is set', () => {
    render(<Button testID="button" label="Begin quest" fullWidth />);
    const wrapperStyle = StyleSheet.flatten(
      screen.getByTestId('button-wrapper').props.style
    );
    expect(wrapperStyle.alignSelf).toBe('stretch');
  });

  it('applies containerStyle to the outer wrapper', () => {
    render(
      <Button
        testID="button"
        label="Begin quest"
        containerStyle={{ flexGrow: 1 }}
      />
    );
    const wrapperStyle = StyleSheet.flatten(
      screen.getByTestId('button-wrapper').props.style
    );
    expect(wrapperStyle.flexGrow).toBe(1);
  });

  it('centers wrapped label text so a two-line label centers under the button', () => {
    render(<Button testID="button" label="Begin quest" />);
    const textStyle = StyleSheet.flatten(
      screen.getByText('Begin quest').props.style
    );
    expect(textStyle.textAlign).toBe('center');
  });

  it('applies opacity 0.4 when disabled', () => {
    render(<Button testID="button" label="Begin quest" disabled />);
    const style = StyleSheet.flatten(screen.getByTestId('button').props.style);
    expect(style.opacity).toBe(0.4);
  });

  it('renders without error when glow is toggled on and off', () => {
    const { rerender } = render(
      <Button testID="button" label="Begin quest" glow />
    );
    expect(screen.getByTestId('button')).toBeOnTheScreen();
    rerender(<Button testID="button" label="Begin quest" glow={false} />);
    expect(screen.getByTestId('button')).toBeOnTheScreen();
  });

  it('stays inert when disabled even with glow set', async () => {
    const onPress = jest.fn();
    const { user } = setup(
      <Button
        testID="button"
        label="Begin quest"
        glow
        disabled
        onPress={onPress}
      />
    );
    const button = screen.getByTestId('button');
    expect(button.props.accessibilityState.disabled).toBe(true);
    await user.press(button);
    expect(onPress).not.toHaveBeenCalled();
  });

  it('merges custom style last', () => {
    render(
      <Button testID="button" label="Begin quest" style={{ marginTop: 12 }} />
    );
    const style = StyleSheet.flatten(screen.getByTestId('button').props.style);
    expect(style.marginTop).toBe(12);
  });
});
