import React from 'react';

import { Text, View } from '@/components/ui';
import { primary } from '@/components/ui/colors';

interface XPBreakdownRowProps {
  label: string;
  value: number;
  isBonus?: boolean;
  isTotal?: boolean;
}

/**
 * Row component for displaying XP breakdown information.
 * Supports formatting for bonus values and bold styling for totals.
 */
export function XPBreakdownRow({
  label,
  value,
  isBonus = false,
  isTotal = false,
}: XPBreakdownRowProps) {
  const formattedValue = isBonus && value >= 0 ? `+${value}` : value.toString();
  const textClass = isTotal ? 'font-bold' : '';
  const bonusColor = isBonus ? primary[400] : undefined;

  return (
    <View className="flex-row justify-between py-1">
      <Text className={`text-sm ${textClass} text-cream-500`}>{label}</Text>
      <Text
        className={`text-sm ${textClass} text-cream-500`}
        style={bonusColor ? { color: bonusColor } : undefined}
      >
        {formattedValue}
      </Text>
    </View>
  );
}
