import React from 'react';
import { Pressable, View } from 'react-native';
import { twMerge } from 'tailwind-merge';

import { Text } from './text';

export type SegmentedControlOption<T extends string | number> = {
  label: string;
  value: T;
};

type SegmentedControlProps<T extends string | number> = {
  options: readonly SegmentedControlOption<T>[];
  value: T;
  onChange: (value: T) => void;
  /** Base testID; each option is `${testID}-option-${value}`. */
  testID?: string;
  className?: string;
  /** Describes the group as a whole, e.g. "Visibility". */
  accessibilityLabel?: string;
};

/**
 * Single-select pill group. This is the one home for the "pick one of N"
 * pattern so screens stop hand-rolling selected/unselected styling.
 *
 * Selected = calm teal accent with a dark label (~4.9:1). Unselected = the
 * muted card surface with a cream label (~7:1). Orange stays reserved for a
 * screen's single primary action.
 */
export function SegmentedControl<T extends string | number>({
  options,
  value,
  onChange,
  testID,
  className = '',
  accessibilityLabel,
}: SegmentedControlProps<T>) {
  return (
    <View
      className={twMerge('flex-row', className)}
      accessibilityLabel={accessibilityLabel}
    >
      {options.map((option, index) => {
        const isSelected = option.value === value;
        return (
          <Pressable
            key={String(option.value)}
            testID={testID ? `${testID}-option-${option.value}` : undefined}
            onPress={() => onChange(option.value)}
            accessibilityRole="button"
            accessibilityLabel={option.label}
            accessibilityState={{ selected: isSelected }}
            className={twMerge(
              'items-center justify-center rounded-full px-4 py-2',
              index < options.length - 1 && 'mr-2',
              isSelected ? 'bg-secondary-400' : 'bg-cardBackground'
            )}
          >
            <Text
              className={isSelected ? 'font-semibold text-black' : 'text-white'}
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
