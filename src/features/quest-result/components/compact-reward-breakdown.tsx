import React from 'react';

import { XPBreakdownRow } from '@/components/quest-preview/xp-breakdown-row';
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
  lockBonus?: number;
}

export function CompactRewardBreakdown({
  baseXP,
  adjustedXP,
  perksApplied,
  lockBonus,
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
        <Text className="text-sm font-bold" style={{ color: primary[400] }}>
          +{bonusXP} XP
        </Text>
      </View>

      {/* One row per perk: name on the left, icon on the right */}
      <View>
        {perksApplied.map((perk) => (
          <View
            key={perk.id}
            accessibilityLabel={`${perk.name}: +${perk.bonusXP} XP`}
            testID={`perk-badge-${perk.id}`}
            className="flex-row items-center justify-between py-1"
          >
            <Text className="text-sm text-white">{perk.name}</Text>
            <PerkIcon perkId={perk.id} isUnlocked size={ICON_SIZE} />
          </View>
        ))}
      </View>

      {/* Row 3: Locked-focus bonus (presence runs only; server-provided value) */}
      {!!lockBonus && lockBonus > 0 && (
        <XPBreakdownRow label="Lock bonus" value={lockBonus} isBonus />
      )}
    </View>
  );
}
