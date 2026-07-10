import React from 'react';

import { levels } from '@/app/data/level-progression';
import { XPBar } from '@/components/emberglow';
import { Card, Text, View } from '@/components/ui';
import { type Character } from '@/store/types';

type ExperienceCardProps = {
  character: Character;
};

export function ExperienceCard({ character }: ExperienceCardProps) {
  // Get current and next level data from static file
  const currentLevelData = levels.find((l) => l.level === character.level);
  const nextLevelData = levels.find((l) => l.level === character.level + 1);

  // character.currentXP from server is TOTAL XP, not progress toward next level
  const totalXP = character.currentXP;

  // Calculate current progress toward next level
  const xpProgressTowardNext =
    totalXP - (currentLevelData?.totalXPRequired || 0);

  // Calculate XP needed for next level
  const xpForNextLevel = nextLevelData
    ? nextLevelData.totalXPRequired - totalXP
    : 0;

  // XP required from current level to next level
  const xpRequiredForCurrentToNext = nextLevelData
    ? nextLevelData.totalXPRequired - (currentLevelData?.totalXPRequired || 0)
    : 100; // fallback

  const nextLevel = character.level + 1;

  return (
    <Card className="mx-4 mt-4 p-5">
      <View className="mb-3 flex-row items-center justify-between">
        <Text className="text-lg font-bold text-white">Experience</Text>
        <Text className="text-sm font-semibold text-brown">
          Total: {totalXP.toLocaleString()} XP
        </Text>
      </View>

      <View className="mb-3">
        <Text className="text-center text-sm text-neutral-200">
          {xpForNextLevel} XP to Level {nextLevel}
        </Text>
      </View>

      {/* Emberglow XPBar — level/xp/xpNext already match the values computed above */}
      <XPBar
        level={character.level}
        xp={xpProgressTowardNext}
        xpNext={xpRequiredForCurrentToNext}
      />
    </Card>
  );
}
