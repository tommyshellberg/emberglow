import * as React from 'react';
import { StyleSheet } from 'react-native';

import { colors, palette, withAlpha } from '@/theme';
import { cleanup, fireEvent, render, screen, setup } from '@/lib/test-utils';

import { Input } from './input';

afterEach(cleanup);

describe('Input', () => {
  it('renders the label', () => {
    render(<Input label="Hero name" />);

    expect(screen.getByText('Hero name')).toBeOnTheScreen();
  });

  it('renders the hint', () => {
    render(<Input hint="You can change this later." />);

    expect(screen.getByText('You can change this later.')).toBeOnTheScreen();
  });

  it('omits the label and hint when not provided', () => {
    render(<Input testID="input" placeholder="What shall we call you?" />);

    expect(screen.queryByText('Hero name')).not.toBeOnTheScreen();
    expect(screen.getByTestId('input')).toBeOnTheScreen();
  });

  it('calls onChangeText as the user types', async () => {
    const onChangeText = jest.fn();
    const { user } = setup(
      <Input testID="input" onChangeText={onChangeText} />
    );

    await user.type(screen.getByTestId('input'), 'Aria');

    expect(onChangeText).toHaveBeenCalledWith('Aria');
  });

  it('uses the subtle border color while blurred', () => {
    render(<Input testID="input" />);

    const style = StyleSheet.flatten(screen.getByTestId('input').props.style);
    expect(style.borderColor).toBe(colors.border.subtle);
  });

  it('switches to the sandy focus border color on focus, and back on blur', () => {
    render(<Input testID="input" />);
    const field = screen.getByTestId('input');

    fireEvent(field, 'focus');
    let style = StyleSheet.flatten(field.props.style);
    expect(style.borderColor).toBe(withAlpha(palette.sandy, 0.55));

    fireEvent(field, 'blur');
    style = StyleSheet.flatten(field.props.style);
    expect(style.borderColor).toBe(colors.border.subtle);
  });

  it('still forwards user-provided onFocus/onBlur handlers', () => {
    const onFocus = jest.fn();
    const onBlur = jest.fn();
    render(<Input testID="input" onFocus={onFocus} onBlur={onBlur} />);
    const field = screen.getByTestId('input');

    fireEvent(field, 'focus');
    expect(onFocus).toHaveBeenCalledTimes(1);

    fireEvent(field, 'blur');
    expect(onBlur).toHaveBeenCalledTimes(1);
  });

  it('sets textAlignVertical to top and a minHeight of 96 when multiline', () => {
    render(<Input testID="input" multiline />);

    const style = StyleSheet.flatten(screen.getByTestId('input').props.style);
    expect(style.textAlignVertical).toBe('top');
    expect(style.minHeight).toBe(96);
  });

  it('does not set a minHeight for single-line fields', () => {
    render(<Input testID="input" />);

    const style = StyleSheet.flatten(screen.getByTestId('input').props.style);
    expect(style.minHeight).toBeUndefined();
  });
});
