/* eslint-disable max-lines-per-function */
import React from 'react';

import { cleanup, screen, setup } from '@/lib/test-utils';

import { Switch } from './switch';

afterEach(cleanup);

describe('Switch', () => {
  it('toggles via press and calls onChange with the inverse of checked', async () => {
    const onChange = jest.fn();
    const { user } = setup(
      <Switch testID="switch" checked={false} onChange={onChange} />
    );

    await user.press(screen.getByTestId('switch'));

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith(true);
  });

  it('calls onChange(false) when pressed while checked', async () => {
    const onChange = jest.fn();
    const { user } = setup(
      <Switch testID="switch" checked={true} onChange={onChange} />
    );

    await user.press(screen.getByTestId('switch'));

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith(false);
  });

  it('reflects the checked prop in accessibilityState', () => {
    const { rerender } = setup(<Switch testID="switch" checked={false} />);

    expect(
      screen.getByTestId('switch').props.accessibilityState.checked
    ).toBe(false);

    rerender(<Switch testID="switch" checked={true} />);

    expect(
      screen.getByTestId('switch').props.accessibilityState.checked
    ).toBe(true);
  });

  it('exposes accessibilityRole="switch"', () => {
    setup(<Switch testID="switch" checked={false} />);

    expect(screen.getByTestId('switch').props.accessibilityRole).toBe(
      'switch'
    );
  });

  it('is inert and does not call onChange when disabled', async () => {
    const onChange = jest.fn();
    const { user } = setup(
      <Switch testID="switch" checked={false} onChange={onChange} disabled />
    );

    expect(screen.getByTestId('switch')).toBeDisabled();
    expect(
      screen.getByTestId('switch').props.accessibilityState.disabled
    ).toBe(true);

    await user.press(screen.getByTestId('switch'));

    expect(onChange).not.toHaveBeenCalled();
  });

  it('does not render a label by default', () => {
    setup(<Switch testID="switch" checked={false} />);

    expect(screen.queryByTestId('switch-label')).not.toBeOnTheScreen();
  });

  it('renders the label when provided', () => {
    setup(
      <Switch testID="switch" checked={false} label="Quest reminders" />
    );

    expect(screen.getByTestId('switch-label')).toBeOnTheScreen();
    expect(screen.getByTestId('switch-label')).toHaveTextContent(
      'Quest reminders'
    );
  });
});
