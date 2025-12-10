import { Clock } from 'lucide-react-native';
import React from 'react';
import { View } from 'react-native';

import colors from './colors';
import { Text } from './text';

interface DurationBadgeProps {
  /** Original duration in minutes */
  duration: number;
  /** Adjusted duration after perk effects (optional) */
  adjustedDuration?: number | null;
  /** Icon size - defaults to 16 */
  iconSize?: number;
  /** Icon color - defaults to secondary[300] */
  iconColor?: string;
}

/**
 * DurationBadge component
 *
 * Displays quest duration with optional strikethrough when a perk
 * has reduced the duration. Used in both solo and cooperative quest previews.
 *
 * @example
 * // Normal duration
 * <DurationBadge duration={30} />
 *
 * @example
 * // With Quick Start perk (10% reduction)
 * <DurationBadge duration={30} adjustedDuration={27} />
 */
export function DurationBadge({
  duration,
  adjustedDuration,
  iconSize = 16,
  iconColor = colors.secondary[300],
}: DurationBadgeProps) {
  // Only show reduction if adjusted is different AND less than original
  const hasDurationReduction =
    adjustedDuration != null &&
    adjustedDuration !== duration &&
    adjustedDuration < duration;

  return (
    <View className="flex-row items-center">
      <Clock size={iconSize} color={iconColor} />
      {hasDurationReduction ? (
        <View className="ml-1 flex-row items-baseline">
          <Text
            className="text-sm text-neutral-400"
            style={{ textDecorationLine: 'line-through' }}
            accessibilityLabel={`Original duration: ${duration} minutes`}
          >
            {duration}
          </Text>
          <Text
            className="mx-1 text-sm font-semibold"
            style={{ color: colors.primary[400] }}
            accessibilityLabel={`Reduced duration: ${adjustedDuration} minutes`}
          >
            {adjustedDuration} min
          </Text>
        </View>
      ) : (
        <Text
          className="ml-1 text-sm text-neutral-200"
          accessibilityLabel={`Duration: ${duration} minutes`}
        >
          {duration} min
        </Text>
      )}
    </View>
  );
}
