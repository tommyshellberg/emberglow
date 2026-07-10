import DateTimePicker from '@react-native-community/datetimepicker';
import React, { useState } from 'react';
import { TouchableOpacity } from 'react-native';

import { Text } from './text';

// Matches @react-native-community/datetimepicker's (unexported) MinuteInterval type.
type MinuteInterval = 1 | 2 | 3 | 4 | 5 | 6 | 10 | 12 | 15 | 20 | 30;

type DateTimeFieldProps = {
  value: Date;
  mode: 'date' | 'time';
  onChange: (date: Date) => void;
  minimumDate?: Date;
  minuteInterval?: MinuteInterval;
  testID?: string;
};

const formatValue = (value: Date, mode: 'date' | 'time') =>
  mode === 'date'
    ? value.toLocaleDateString()
    : value.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

/**
 * Shared date/time picker trigger: a styled button showing the current value
 * that reveals the native compact-display picker on press, then hides it
 * again once a value is picked. Keeps every screen's picker UI consistent
 * instead of each one wiring up DateTimePicker with its own display mode.
 */
export function DateTimeField({
  value,
  mode,
  onChange,
  minimumDate,
  minuteInterval,
  testID,
}: DateTimeFieldProps) {
  const [showPicker, setShowPicker] = useState(false);

  const handleChange = (_event: unknown, date?: Date) => {
    setShowPicker(false);
    if (date) onChange(date);
  };

  if (showPicker) {
    // DateTimePicker's props are a union discriminated by a literal `mode`,
    // so a variable typed 'date' | 'time' can't be passed directly - each
    // branch needs its own literal for the prop types to line up.
    return mode === 'date' ? (
      <DateTimePicker
        value={value}
        mode="date"
        display="compact"
        minimumDate={minimumDate}
        onChange={handleChange}
      />
    ) : (
      <DateTimePicker
        value={value}
        mode="time"
        display="compact"
        minimumDate={minimumDate}
        minuteInterval={minuteInterval}
        onChange={handleChange}
      />
    );
  }

  return (
    <TouchableOpacity
      testID={testID}
      onPress={() => setShowPicker(true)}
      className="rounded-lg bg-neutral-400 px-4 py-2"
    >
      <Text className="text-center font-medium text-white">
        {formatValue(value, mode)}
      </Text>
    </TouchableOpacity>
  );
}
