import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import {
  Easing,
  runOnJS,
  useAnimatedReaction,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { Text, View } from '@/components/ui';
import { STATS_ANIMATION } from '@/features/profile/constants/profile-constants';
import {
  colors,
  fontFamily,
  fontSize,
  radii,
  spacing,
  tracking,
} from '@/theme';

type StatsCardProps = {
  questCount: number;
  minutesSaved: number;
  streakCount: number;
};

// Custom component for animated number
function AnimatedNumber({
  value,
  duration = 1500,
  delay = 0,
}: {
  value: number;
  duration?: number;
  delay?: number;
}) {
  const [displayValue, setDisplayValue] = useState(0);
  const animatedValue = useSharedValue(0);

  useEffect(() => {
    const timeout = setTimeout(() => {
      animatedValue.value = withTiming(value, {
        duration,
        easing: Easing.out(Easing.cubic),
      });
    }, delay);

    return () => clearTimeout(timeout);
  }, [value, duration, delay, animatedValue]);

  useAnimatedReaction(
    () => animatedValue.value,
    (currentValue) => {
      runOnJS(setDisplayValue)(Math.round(currentValue));
    }
  );

  return <Text style={styles.tileNumber}>{displayValue}</Text>;
}

export function StatsCard({
  questCount,
  minutesSaved,
  streakCount,
}: StatsCardProps) {
  return (
    <View className="mx-4 mt-4" style={styles.grid}>
      <View
        style={styles.tile}
        accessible={true}
        accessibilityLabel={`${questCount} quests completed`}
        accessibilityRole="text"
      >
        <AnimatedNumber
          value={questCount}
          duration={STATS_ANIMATION.quests.duration}
          delay={STATS_ANIMATION.quests.delay}
        />
        <Text style={styles.tileLabel}>Quests</Text>
      </View>

      <View
        style={styles.tile}
        accessible={true}
        accessibilityLabel={`${minutesSaved} minutes saved`}
        accessibilityRole="text"
      >
        <AnimatedNumber
          value={minutesSaved}
          duration={STATS_ANIMATION.minutes.duration}
          delay={STATS_ANIMATION.minutes.delay}
        />
        <Text style={styles.tileLabel}>Minutes Saved</Text>
      </View>

      <Pressable
        style={styles.tile}
        onPress={() => router.push('/streak-celebration')}
        accessible={true}
        accessibilityRole="button"
        accessibilityLabel={`${streakCount} day streak`}
        accessibilityHint="Tap to view streak celebration"
      >
        <AnimatedNumber
          value={streakCount}
          duration={STATS_ANIMATION.streak.duration}
          delay={STATS_ANIMATION.streak.delay}
        />
        <Text style={styles.tileLabel}>Day Streak</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    gap: spacing[2],
  },
  tile: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: colors.surface.raised,
    borderWidth: 1,
    borderColor: colors.border.hairline,
    borderRadius: radii.md,
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[2],
  },
  tileNumber: {
    fontFamily: fontFamily.display,
    fontSize: fontSize.h2,
    color: colors.text.primary,
    textAlign: 'center',
  },
  tileLabel: {
    marginTop: spacing[1],
    fontFamily: fontFamily.semibold,
    fontSize: fontSize.caption,
    letterSpacing: fontSize.caption * tracking.wide,
    textTransform: 'uppercase',
    color: colors.text.muted,
    textAlign: 'center',
  },
});
