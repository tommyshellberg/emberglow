import { fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';

import { NoAccountView } from './no-account-view';

const props = {
  intent: 'signin' as const,
  email: 'tommy@gmail.com',
  onBeginJourney: jest.fn(),
  onTryAnotherAccount: jest.fn(),
};

beforeEach(() => jest.clearAllMocks());

it('names the address the user just authorized', () => {
  render(<NoAccountView {...props} />);
  // getByText, not queryByText — RNTL matches hidden elements, so a presence
  // check on an unrendered subtree can still pass.
  expect(screen.getByText(/tommy@gmail\.com/)).toBeOnTheScreen();
});

it('runs the primary action', () => {
  render(<NoAccountView {...props} />);
  fireEvent.press(screen.getByTestId('no-account-begin-button'));
  expect(props.onBeginJourney).toHaveBeenCalledTimes(1);
});

it('offers a retry on the signin framing', () => {
  render(<NoAccountView {...props} />);
  fireEvent.press(screen.getByTestId('no-account-retry-button'));
  expect(props.onTryAnotherAccount).toHaveBeenCalledTimes(1);
});

it('withholds the retry on the convert framing', () => {
  render(<NoAccountView {...props} intent="convert" />);
  expect(screen.queryByTestId('no-account-retry-button')).toBeNull();
});
