import React from 'react';

import { cleanup, render, screen, setup } from '@/lib/test-utils';

import { SegmentedControl } from './segmented-control';

afterEach(cleanup);

const OPTIONS = [
  { label: 'Public', value: 'public' },
  { label: 'Friends only', value: 'friends' },
] as const;

describe('SegmentedControl', () => {
  it('renders every option label', () => {
    render(
      <SegmentedControl options={OPTIONS} value="public" onChange={jest.fn()} />
    );
    expect(screen.getByText('Public')).toBeOnTheScreen();
    expect(screen.getByText('Friends only')).toBeOnTheScreen();
  });

  it('calls onChange with the value of the pressed option', async () => {
    const onChange = jest.fn();
    const { user } = setup(
      <SegmentedControl options={OPTIONS} value="public" onChange={onChange} />
    );
    await user.press(screen.getByText('Friends only'));
    expect(onChange).toHaveBeenCalledWith('friends');
  });

  it('marks only the selected option as selected for assistive tech', () => {
    render(
      <SegmentedControl
        testID="visibility"
        options={OPTIONS}
        value="public"
        onChange={jest.fn()}
      />
    );
    expect(
      screen.getByTestId('visibility-option-public').props.accessibilityState
        .selected
    ).toBe(true);
    expect(
      screen.getByTestId('visibility-option-friends').props.accessibilityState
        .selected
    ).toBe(false);
  });

  // The selected option carries the calm teal accent (dark label ~4.9:1); the
  // unselected option uses the muted card surface (cream label ~7:1). Orange is
  // reserved for the screen's single primary action, not selection state.
  it('styles the selected option teal and unselected options muted', () => {
    render(
      <SegmentedControl
        testID="visibility"
        options={OPTIONS}
        value="public"
        onChange={jest.fn()}
      />
    );
    expect(
      screen.getByTestId('visibility-option-public').props.className
    ).toContain('bg-secondary-400');
    expect(
      screen.getByTestId('visibility-option-friends').props.className
    ).toContain('bg-cardBackground');
  });

  it('supports numeric values', async () => {
    const onChange = jest.fn();
    const { user } = setup(
      <SegmentedControl
        options={[
          { label: '5', value: 5 },
          { label: '10', value: 10 },
        ]}
        value={10}
        onChange={onChange}
      />
    );
    await user.press(screen.getByText('5'));
    expect(onChange).toHaveBeenCalledWith(5);
  });
});
