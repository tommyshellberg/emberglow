import { Sparkles } from 'lucide-react-native';
import React from 'react';
import { Pressable } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { PerkIcon } from '@/components/skill-tree';
import { Card, Text, View } from '@/components/ui';
import { useSkillTreeStore } from '@/store/skill-tree-store';
import type { Character } from '@/store/types';

interface SkillsCardProps {
  character: Character;
  onPress: () => void;
}

export function SkillsCard({ character, onPress }: SkillsCardProps) {
  const { skillTreeData, getUnlockedPerks, getAvailablePerksToUnlock } =
    useSkillTreeStore();

  // Get unlocked perks and sort by unlock date (most recent first)
  const unlockedPerks = getUnlockedPerks().sort((a, b) => {
    if (!a.unlockedAt || !b.unlockedAt) return 0;
    return (
      new Date(b.unlockedAt).getTime() - new Date(a.unlockedAt).getTime()
    );
  });

  // Get available perks to unlock
  const availablePerksToUnlock = getAvailablePerksToUnlock();

  // Show only the 3 most recent unlocked perks
  const recentPerks = unlockedPerks.slice(0, 3);

  // Calculate available skill points
  const availablePoints = availablePerksToUnlock.length;
  const hasAvailablePoints = availablePoints > 0;

  return (
    <Card className="mx-4 mt-4 p-5">
      {/* Header */}
      <View className="mb-4 flex-row items-center justify-between">
        <View className="flex-row items-center">
          <View className="mr-2 rounded-full bg-primary-400/20 p-2">
            <Sparkles size={20} color="#E55838" strokeWidth={2.5} />
          </View>
          <Text className="text-lg font-bold text-white">Skills & Perks</Text>
        </View>

        {/* Available Points Badge */}
        {hasAvailablePoints && (
          <Animated.View
            entering={FadeInDown.duration(400)}
            className="rounded-full bg-primary-400 px-3 py-1"
          >
            <Text className="text-xs font-bold text-white">
              {availablePoints} Point{availablePoints !== 1 ? 's' : ''} Available
            </Text>
          </Animated.View>
        )}
      </View>

      {/* Unlocked Perks Preview */}
      {unlockedPerks.length > 0 ? (
        <View className="mb-4 gap-2">
          {recentPerks.map((perk, index) => (
            <Animated.View
              key={perk.id}
              entering={FadeInDown.delay(100 * index).duration(300)}
              className="flex-row items-center rounded-full border-2 border-primary-400 bg-primary-400/20 px-3 py-1.5"
            >
              <View className="mr-2">
                <PerkIcon
                  perkId={perk.selectedChoice || perk.id}
                  isUnlocked={true}
                  size={24}
                />
              </View>
              <Text className="flex-1 text-xs font-semibold text-cream-500">
                {perk.name}
              </Text>
            </Animated.View>
          ))}
          {unlockedPerks.length > 3 && (
            <Text className="mt-1 text-xs text-neutral-200">
              +{unlockedPerks.length - 3} more perk
              {unlockedPerks.length - 3 !== 1 ? 's' : ''}
            </Text>
          )}
        </View>
      ) : (
        <View className="mb-4 rounded-lg border border-dashed border-neutral-400/30 bg-neutral-400/10 p-4">
          <Text className="text-center text-sm text-neutral-200">
            Unlock your first perk to enhance your journey
          </Text>
        </View>
      )}

      {/* CTA Button */}
      <Pressable
        onPress={onPress}
        className="items-center justify-center rounded-lg bg-primary-400 py-3 active:bg-primary-500"
      >
        <Text className="text-base font-semibold text-white">
          {hasAvailablePoints ? 'Spend Points' : 'View Skills'}
        </Text>
      </Pressable>
    </Card>
  );
}
