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
// This must be manually maintained since React Native doesn't support dynamic require()
export const PERK_ICON_MAP: Record<string, any> = {
  // Alchemist perks
  alchemist_alchemical_precision: require('@/../assets/icons/perks/alchemist_alchemical_precision.svg'),
  alchemist_crafting_prowess: require('@/../assets/icons/perks/alchemist_crafting_prowess.svg'),
  alchemist_philosophers_focus: require('@/../assets/icons/perks/alchemist_philosophers_focus.svg'),

  // Bard perks
  bard_charismatic_flair: require('@/../assets/icons/perks/bard_charismatic_flair.svg'),
  bard_inspiring_presence: require('@/../assets/icons/perks/bard_inspiring_presence.svg'),
  bard_master_performer: require('@/../assets/icons/perks/bard_master_performer.svg'),

  // Druid perks
  druid_harmony: require('@/../assets/icons/perks/druid_harmony.svg'),
  druid_natures_touch: require('@/../assets/icons/perks/druid_natures_touch.svg'),
  druid_vitality: require('@/../assets/icons/perks/druid_vitality.svg'),

  // Knight perks
  knight_champions_endurance: require('@/../assets/icons/perks/knight_champions_endurance.svg'),
  knight_tactical_discipline: require('@/../assets/icons/perks/knight_tactical_discipline.svg'),
  knight_warriors_might: require('@/../assets/icons/perks/knight_warriors_might.svg'),

  // Scout perks
  scout_lone_wanderer: require('@/../assets/icons/perks/scout_lone_wanderer.svg'),
  scout_master_tracker: require('@/../assets/icons/perks/scout_master_tracker.svg'),
  scout_survivalist: require('@/../assets/icons/perks/scout_survivalist.svg'),

  // Wizard perks
  fire_path: require('@/../assets/icons/perks/fire_path.svg'),
  water_path: require('@/../assets/icons/perks/water-path.svg'),
  wizard_arcane_focus: require('@/../assets/icons/perks/wizard_arcane_focus.svg'),
  wizard_scholars_mind: require('@/../assets/icons/perks/wizard_scholars_mind.svg'),

  // Universal perks
  endurance_focus: require('@/../assets/icons/perks/endurance_focus.svg'),
  first_timer: require('@/../assets/icons/perks/first_timer.svg'),
  morning_ritual: require('@/../assets/icons/perks/morning_ritual.svg'),
  quick_break: require('@/../assets/icons/perks/quick_break.svg'),
  quick_start: require('@/../assets/icons/perks/quick_start.svg'),
  streak_god: require('@/../assets/icons/perks/streak-god.svg'),
  streak_master: require('@/../assets/icons/perks/streak_master.svg'),
  thoughtful_adventurer: require('@/../assets/icons/perks/thoughtful-adventurer.svg'),
  weekday_grind: require('@/../assets/icons/perks/weekday_grind.svg'),
  weekend_warrior: require('@/../assets/icons/perks/weekend_warrior.svg'),

  // Aliases (same icon, different unlock paths)
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
