import React from 'react';
import { ScrollView } from 'react-native';

import { PerkIcon } from '@/components/skill-tree/perk-icon';
import { Text, View } from '@/components/ui';
import { primary } from '@/components/ui/colors';

// Compact icon size matching the preview component style
const ICON_SIZE = 24;

interface PerkApplied {
  id: string;
  name: string;
  bonusXP: number;
  icon: string;
}

interface CompactRewardBreakdownProps {
  baseXP: number;
  adjustedXP: number;
  perksApplied: PerkApplied[];
}

export function CompactRewardBreakdown({
  baseXP,
  adjustedXP,
  perksApplied,
}: CompactRewardBreakdownProps) {
  const bonusXP = adjustedXP - baseXP;

  return (
    <View
      className="w-full rounded-xl border border-primary-300/30 bg-cardBackground/40 px-3 py-2"
      accessibilityLabel="Reward breakdown"
    >
      {/* Row 1: Label + Bonus XP */}
      <View className="mb-2 flex-row items-center justify-between">
        <Text className="text-sm font-semibold text-cream-500">
          Active Perks
        </Text>
        <Text
          className="text-sm font-bold"
          style={{ color: primary[400] }}
        >
          +{bonusXP} XP
        </Text>
      </View>

      {/* Row 2: Horizontally scrollable perk icons */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ alignItems: 'center', gap: 8 }}
      >
        {perksApplied.map((perk) => (
          <View
            key={perk.id}
            accessibilityLabel={`${perk.name}: +${perk.bonusXP} XP`}
            testID={`perk-badge-${perk.id}`}
          >
            <PerkIcon perkId={perk.id} isUnlocked size={ICON_SIZE} />
          </View>
        ))}
      </ScrollView>
    </View>
  );
}
