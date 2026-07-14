import React from 'react';

import { fireEvent, render, screen } from '@/lib/test-utils';

import { DateTimeField } from './date-time-field';

jest.mock('@react-native-community/datetimepicker', () => 'DateTimePicker');

const timeLabel = (value: Date) =>
  value.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

describe('DateTimeField', () => {
  it('shows a formatted trigger button for time mode', () => {
    const value = new Date('2026-07-07T10:35:00');
    render(<DateTimeField value={value} mode="time" onChange={jest.fn()} />);
    expect(screen.getByText(timeLabel(value))).toBeTruthy();
  });

  it('shows a formatted trigger button for date mode', () => {
    const value = new Date('2026-07-07T10:35:00');
    render(<DateTimeField value={value} mode="date" onChange={jest.fn()} />);
    expect(screen.getByText(value.toLocaleDateString())).toBeTruthy();
  });

  it('does not render the native picker until the trigger is pressed', () => {
    const value = new Date('2026-07-07T10:35:00');
    const { UNSAFE_queryByType } = render(
      <DateTimeField value={value} mode="time" onChange={jest.fn()} />
    );
    expect(UNSAFE_queryByType('DateTimePicker' as any)).toBeNull();
  });

  it('reveals a compact-display native picker on press and reports the picked date', () => {
    const value = new Date('2026-07-07T10:35:00');
    const onChange = jest.fn();
    render(<DateTimeField value={value} mode="time" onChange={onChange} />);

    fireEvent.press(screen.getByText(timeLabel(value)));

    const picker = screen.UNSAFE_getByType('DateTimePicker' as any);
    expect(picker.props.display).toBe('compact');
    expect(picker.props.mode).toBe('time');

    const picked = new Date('2026-07-07T10:45:00');
    picker.props.onChange({}, picked);

    expect(onChange).toHaveBeenCalledWith(picked);
    // the picker hides again and the trigger button reappears
    expect(screen.getByText(timeLabel(value))).toBeTruthy();
  });

  it('passes minimumDate and minuteInterval through to the native picker', () => {
    const value = new Date('2026-07-07T10:35:00');
    const minimumDate = new Date('2026-07-01T00:00:00');
    render(
      <DateTimeField
        value={value}
        mode="time"
        onChange={jest.fn()}
        minimumDate={minimumDate}
        minuteInterval={15}
      />
    );

    fireEvent.press(screen.getByText(timeLabel(value)));

    const picker = screen.UNSAFE_getByType('DateTimePicker' as any);
    expect(picker.props.minimumDate).toBe(minimumDate);
    expect(picker.props.minuteInterval).toBe(15);
  });
});
