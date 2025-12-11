import React, { useEffect } from 'react';
import {
  useSharedValue,
  withDelay,
  withSpring,
} from 'react-native-reanimated';

import type { QuestRewardPreviewParticipant } from '@/api/quest-runs/types';
import { Text, View } from '@/components/ui';
import { primary } from '@/components/ui/colors';

import { PerkBadge } from './perk-badge';

// Animation constants (matching streak-celebration pattern)
const ANIMATION_START_DELAY = 400;
const ANIMATION_STAGGER = 200;
const SPRING_CONFIG = {
  damping: 12,
  stiffness: 150,
};

interface RewardPreviewCardProps {
  participant: QuestRewardPreviewParticipant;
}

/**
 * Card displaying quest reward preview with XP breakdown and active perks.
 * Perks animate in one-at-a-time with spring bounce effect.
 */
export function RewardPreviewCard({
  participant,
}: RewardPreviewCardProps) {
  const { baseXP, adjustedXP, perksApplied } = participant;
  const bonusXP = adjustedXP - baseXP;
  const hasBonus = bonusXP !== 0;

  // Create shared values for perk badge animations
  const perkAnimations = perksApplied.map(() => useSharedValue(0));

  useEffect(() => {
    // Trigger staggered animations for perk badges
    perksApplied.forEach((_, index) => {
      perkAnimations[index].value = withDelay(
        ANIMATION_START_DELAY + index * ANIMATION_STAGGER,
        withSpring(1, SPRING_CONFIG)
      );
    });
  }, [perksApplied, perkAnimations]);

  return (
    <View className="rounded-2xl p-4" style={{ backgroundColor: '#2A475433' }}>
      {/* Title */}
      <Text className="mb-3 text-lg font-bold text-cream-500">
        Quest Rewards
      </Text>

      {/* XP - Inline Format */}
      <View className="mb-4 rounded-xl p-3" style={{ backgroundColor: '#02111a50' }}>
        <Text className="text-center text-sm text-cream-500">
          {hasBonus ? (
            <>
              <Text>{baseXP} Base XP</Text>
              <Text> + </Text>
              <Text style={{ color: primary[400] }}>{bonusXP} Bonus XP</Text>
              <Text> = </Text>
              <Text className="font-bold">{adjustedXP} Total XP</Text>
            </>
          ) : (
            <Text className="font-bold">{adjustedXP} Total XP</Text>
          )}
        </Text>
      </View>

      {/* Active Perks - Icons Only */}
      {perksApplied.length > 0 && (
        <View>
          <Text className="mb-2 text-sm font-semibold text-cream-500">
            Active Perks
          </Text>
          <View className="flex-row flex-wrap gap-2">
            {perksApplied.map((perkId, index) => (
              <PerkBadge
                key={`${perkId}-${index}`}
                perkId={perkId}
                animationValue={perkAnimations[index]}
                iconOnly
              />
            ))}
          </View>
        </View>
      )}
    </View>
  );
}
