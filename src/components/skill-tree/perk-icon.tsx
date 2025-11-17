import React from 'react';
import { View } from 'react-native';

import { Image } from '@/components/ui';
import colors from '@/components/ui/colors';

interface PerkIconProps {
  perkId: string;
  isUnlocked: boolean;
  size?: number;
}

// Map perk IDs to their corresponding icon files
const PERK_ICON_MAP: Record<string, any> = {
  // Alchemist-specific perks
  alchemist_alchemical_precision: require('@/../assets/icons/perks/alchemist_alchemical_precision.svg'),
  alchemist_crafting_prowess: require('@/../assets/icons/perks/alchemist_crafting_prowess.svg'),
  alchemist_philosophers_focus: require('@/../assets/icons/perks/alchemist_philosophers_focus.svg'),

  // Universal perks
  endurance_focus: require('@/../assets/icons/perks/endurance_focus.svg'),
  first_timer: require('@/../assets/icons/perks/first_timer.svg'),
  morning_ritual: require('@/../assets/icons/perks/morning_ritual.svg'),
  quick_break: require('@/../assets/icons/perks/quick_break.svg'),
  quick_start: require('@/../assets/icons/perks/quick_start.svg'),
  streak_god: require('@/../assets/icons/perks/streak_god.svg'),
  streak_master: require('@/../assets/icons/perks/streak_master.svg'),
  thoughtful_adventurer: require('@/../assets/icons/perks/thoughtful-adventurer.svg'),
  weekday_grind: require('@/../assets/icons/perks/weekday_grind.svg'),
  weekend_warrior: require('@/../assets/icons/perks/weekend_warrior.svg'),

  // Choice node variants
  quest_mastery_quick: require('@/../assets/icons/perks/quick_start.svg'),
  quest_mastery_endurance: require('@/../assets/icons/perks/endurance_focus.svg'),
};

export function PerkIcon({ perkId, isUnlocked, size = 32 }: PerkIconProps) {
  // Get the icon source, fallback to first_timer if not found
  const iconSource = PERK_ICON_MAP[perkId] || PERK_ICON_MAP.first_timer;

  const circleSize = size + 16; // Add padding around the icon
  const backgroundColor = isUnlocked
    ? colors.red[500] // Cyan with 30% opacity for unlocked
    : colors.neutral[300] + '50'; // Neutral with 40% opacity for locked/available

  return (
    <View
      style={{
        width: circleSize,
        height: circleSize,
        borderRadius: circleSize / 2,
        backgroundColor,
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <Image
        source={iconSource}
        style={{
          width: size,
          height: size,
          opacity: isUnlocked ? 1 : 0.6,
        }}
        contentFit="contain"
        tintColor={isUnlocked ? colors.white : colors.neutral[200]}
      />
    </View>
  );
}
