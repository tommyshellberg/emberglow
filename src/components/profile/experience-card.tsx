import React, { useEffect } from 'react';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { levels } from '@/app/data/level-progression';
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

  const progress = xpProgressTowardNext / xpRequiredForCurrentToNext;
  const nextLevel = character.level + 1;

  // Animation for progress bar
  const animatedProgress = useSharedValue(0);

  useEffect(() => {
    // Animate from 0 to current progress when component mounts or progress changes
    animatedProgress.value = 0;
    animatedProgress.value = withTiming(progress, {
      duration: 1000,
      easing: Easing.out(Easing.exp),
    });
  }, [progress, animatedProgress]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      width: `${animatedProgress.value * 100}%`,
    };
  });

  return (
    <Card className="mx-4 mt-4 p-5">
      <View className="mb-3 flex-row items-center justify-between">
        <Text className="text-lg font-bold text-white">Experience</Text>
        <Text testID="xp-display" className="text-sm font-semibold text-brown">
          Total: {totalXP.toLocaleString()} XP
        </Text>
      </View>

      <View className="mb-2">
        <Text className="text-center text-sm text-neutral-200">
          {xpForNextLevel} XP to Level {nextLevel}
        </Text>
      </View>

      <View className="mt-2 h-3 w-full overflow-hidden rounded-full bg-neutral-400">
        <Animated.View
          className="h-full bg-secondary-300"
          style={animatedStyle}
        />
      </View>

      <View className="mt-2 flex-row justify-between">
        <View className="flex-row items-center">
          <Text testID="level-display" className="font-semibold text-white">
            Level {character.level}
          </Text>
          <Text className="ml-2 text-sm text-neutral-200">
            ({xpProgressTowardNext}/{xpRequiredForCurrentToNext})
          </Text>
        </View>
        <Text className="text-sm text-neutral-200">Level {nextLevel}</Text>
      </View>
    </Card>
  );
}
