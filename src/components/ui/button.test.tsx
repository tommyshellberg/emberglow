/* eslint-disable max-lines-per-function */
import React from 'react';
import { Text } from 'react-native';

import { cleanup, render, screen, setup } from '@/lib/test-utils';

import { Button } from './button';

afterEach(cleanup);

describe('Button component ', () => {
  it('should render correctly ', () => {
    render(<Button testID="button" />);
    expect(screen.getByTestId('button')).toBeOnTheScreen();
  });
  it('should render correctly if we add explicit child ', () => {
    render(
      <Button testID="button">
        <Text> Custom child </Text>
      </Button>
    );
    expect(screen.getByText('Custom child')).toBeOnTheScreen();
  });
  it('should render the label correctly', () => {
    render(<Button testID="button" label="Submit" />);
    expect(screen.getByTestId('button')).toBeOnTheScreen();
    expect(screen.getByText('Submit')).toBeOnTheScreen();
  });
  it('should render the loading indicator correctly', () => {
    render(<Button testID="button" loading={true} />);
    expect(screen.getByTestId('button')).toBeOnTheScreen();
    expect(screen.getByTestId('button-activity-indicator')).toBeOnTheScreen();
  });
  it('should call onClick handler when clicked', async () => {
    const onClick = jest.fn();
    const { user } = setup(
      <Button testID="button" label="Click the button" onPress={onClick} />
    );
    expect(screen.getByTestId('button')).toBeOnTheScreen();
    await user.press(screen.getByTestId('button'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });
  it('should be disabled when loading', async () => {
    const onClick = jest.fn();
    const { user } = setup(
      <Button
        testID="button"
        loading={true}
        label="Click the button"
        onPress={onClick}
      />
    );
    expect(screen.getByTestId('button')).toBeOnTheScreen();
    expect(screen.getByTestId('button-activity-indicator')).toBeOnTheScreen();
    expect(screen.getByTestId('button')).toBeDisabled();
    await user.press(screen.getByTestId('button'));
    expect(onClick).toHaveBeenCalledTimes(0);
  });
  it('should be disabled when disabled prop is true', () => {
    render(<Button testID="button" disabled={true} />);
    expect(screen.getByTestId('button')).toBeDisabled();
  });
  it("shouldn't call onClick when disabled", async () => {
    const onClick = jest.fn();
    const { user } = setup(
      <Button
        testID="button"
        label="Click the button"
        disabled={true}
        onPress={onClick}
        variant="secondary"
      />
    );
    expect(screen.getByTestId('button')).toBeOnTheScreen();
    await user.press(screen.getByTestId('button'));

    expect(screen.getByTestId('button')).toBeDisabled();

    expect(onClick).toHaveBeenCalledTimes(0);
  });
  it('should apply appropriate classes for different variants', () => {
    render(<Button testID="button" size="lg" />);
    expect(screen.getByTestId('button').props.className).toContain('h-12');

    render(<Button testID="button" variant="secondary" label="Submit" />);
    expect(screen.getByTestId('button').props.className).toContain(
      'bg-primary-300'
    );

    render(<Button testID="button" label="Submit" disabled />);
    expect(screen.getByTestId('button').props.className).toContain(
      'opacity-50'
    );
  });

  // The default (primary) button is the single bold action on a screen. It uses
  // the vivid brand orange with a dark label so it stays legible (~5.2:1) rather
  // than the muddy deep-orange + cream it used before (~3.85:1, below AA).
  it('default variant is the vivid brand orange with a dark label', () => {
    render(<Button testID="button" label="Go" />);
    expect(screen.getByTestId('button').props.className).toContain(
      'bg-primary-400'
    );
    expect(screen.getByTestId('button-label').props.className).toContain(
      'text-black'
    );
  });

  // The muted variant is the reusable low-emphasis surface (~7:1 cream on the
  // card blue) for secondary actions and unselected states, replacing the
  // off-palette bg-neutral-800 hand-styling.
  it('muted variant uses the card surface with a cream label', () => {
    render(<Button testID="button" variant="muted" label="Go" />);
    expect(screen.getByTestId('button').props.className).toContain(
      'bg-cardBackground'
    );
    expect(screen.getByTestId('button-label').props.className).toContain(
      'text-white'
    );
  });
});
