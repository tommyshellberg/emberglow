import React from 'react';

import { Text, View } from '@/components/ui';
import { primary } from '@/components/ui/colors';

interface DurationDisplayProps {
  baseDuration: number;
  adjustedDuration: number;
}

/**
 * Displays quest duration with optional adjustment indicator.
 * Shows "30 min" if no change, or "30 min → 27 min (-10%)" if adjusted.
 */
export function DurationDisplay({
  baseDuration,
  adjustedDuration,
}: DurationDisplayProps) {
  const isDifferent = baseDuration !== adjustedDuration;

  if (!isDifferent) {
    return (
      <View className="flex-row items-center">
        <Text className="text-sm text-cream-500">{baseDuration} min</Text>
      </View>
    );
  }

  const percentageChange =
    ((adjustedDuration - baseDuration) / baseDuration) * 100;
  const formattedPercentage =
    percentageChange > 0
      ? `(+${Math.round(percentageChange)}%)`
      : `(${Math.round(percentageChange)}%)`;

  return (
    <View className="flex-row items-center gap-1">
      <Text className="text-sm text-cream-500">{baseDuration} min →</Text>
      <Text className="text-sm font-semibold" style={{ color: primary[400] }}>
        {adjustedDuration} min
      </Text>
      <Text className="text-xs" style={{ color: primary[400] }}>
        {formattedPercentage}
      </Text>
    </View>
  );
}
