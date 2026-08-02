import { fireEvent, screen } from '@testing-library/react-native';
import React from 'react';

import { render } from '@/lib/test-utils';

import { ReminderOptIn } from './reminder-opt-in';

// The real iOS native module wraps onChange into a single-arg NativeEventIOS
// handler (see @react-native-community/datetimepicker/src/datetimepicker.ios.js),
// which fireEvent's two-arg (event, date) call convention can't satisfy.
// Mocked to a plain host stub so `onChange` on the queried testID node is our
// own handler — same pattern as src/components/ui/date-time-field.test.tsx.
jest.mock('@react-native-community/datetimepicker', () => 'DateTimePicker');

describe('ReminderOptIn', () => {
  const initialTime = { hour: 14, minute: 15 };

  it('renders the mockup copy', () => {
    render(
      <ReminderOptIn
        initialTime={initialTime}
        onAccept={jest.fn()}
        onDecline={jest.fn()}
      />
    );
    expect(screen.getByText('When will you quest each day?')).toBeTruthy();
    expect(
      screen.getByText(
        'A quiet nudge at the same time each day keeps the streak alive.'
      )
    ).toBeTruthy();
    expect(screen.getByText('Set daily reminder')).toBeTruthy();
    expect(screen.getByText('Skip for now')).toBeTruthy();
  });

  it('accepts with the initial time when the picker is untouched', () => {
    const onAccept = jest.fn();
    render(
      <ReminderOptIn
        initialTime={initialTime}
        onAccept={onAccept}
        onDecline={jest.fn()}
      />
    );
    fireEvent.press(screen.getByText('Set daily reminder'));
    expect(onAccept).toHaveBeenCalledWith({ hour: 14, minute: 15 });
  });

  it('accepts with the picked time after a picker change', () => {
    const onAccept = jest.fn();
    render(
      <ReminderOptIn
        initialTime={initialTime}
        onAccept={onAccept}
        onDecline={jest.fn()}
      />
    );
    const picked = new Date(2026, 7, 1, 20, 45, 0, 0);
    fireEvent(
      screen.getByTestId('reminder-time-picker'),
      'onChange',
      { type: 'set' },
      picked
    );
    fireEvent.press(screen.getByText('Set daily reminder'));
    expect(onAccept).toHaveBeenCalledWith({ hour: 20, minute: 45 });
  });

  it('calls onDecline from the skip link and never onAccept', () => {
    const onAccept = jest.fn();
    const onDecline = jest.fn();
    render(
      <ReminderOptIn
        initialTime={initialTime}
        onAccept={onAccept}
        onDecline={onDecline}
      />
    );
    fireEvent.press(screen.getByText('Skip for now'));
    expect(onDecline).toHaveBeenCalledTimes(1);
    expect(onAccept).not.toHaveBeenCalled();
  });
});
