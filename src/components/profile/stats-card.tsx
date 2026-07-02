import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Pressable } from 'react-native';
import {
  Easing,
  runOnJS,
  useAnimatedReaction,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { STATS_ANIMATION } from '@/features/profile/constants/profile-constants';
import { Card, Text, View } from '@/components/ui';

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
  style,
  className,
}: {
  value: number;
  duration?: number;
  delay?: number;
  style?: any;
  className?: string;
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

  return (
    <Text className={className} style={style}>
      {displayValue}
    </Text>
  );
}

export function StatsCard({
  questCount,
  minutesSaved,
  streakCount,
}: StatsCardProps) {
  return (
    <Card className="mx-4 mt-4 p-5">
      <View className="flex-row justify-around">
        <View
          className="items-center"
          accessible={true}
          accessibilityLabel={`${questCount} quests completed`}
          accessibilityRole="text"
        >
          <AnimatedNumber
            value={questCount}
            duration={STATS_ANIMATION.quests.duration}
            delay={STATS_ANIMATION.quests.delay}
            className="text-3xl font-bold text-secondary-100"
            style={{
              fontSize: 30,
              fontWeight: '700',
              textAlign: 'center',
            }}
          />
          <Text className="text-base text-neutral-200">Quests</Text>
        </View>

        <View className="h-4/5 w-px bg-neutral-300" />

        <View
          className="items-center"
          accessible={true}
          accessibilityLabel={`${minutesSaved} minutes saved`}
          accessibilityRole="text"
        >
          <AnimatedNumber
            value={minutesSaved}
            duration={STATS_ANIMATION.minutes.duration}
            delay={STATS_ANIMATION.minutes.delay}
            className="text-3xl font-bold text-secondary-100"
            style={{
              fontSize: 30,
              fontWeight: '700',
              textAlign: 'center',
            }}
          />
          <Text className="text-base text-neutral-200">Minutes Saved</Text>
        </View>

        <View className="h-4/5 w-px bg-neutral-300" />

        <Pressable
          testID="streak-display"
          className="items-center"
          onPress={() => router.push('/streak-celebration')}
          accessible={true}
          accessibilityRole="button"
          accessibilityLabel={`${streakCount} day streak`}
          accessibilityHint="Tap to view streak celebration"
        >
          <View className="flex-row items-center">
            <AnimatedNumber
              value={streakCount}
              duration={STATS_ANIMATION.streak.duration}
              delay={STATS_ANIMATION.streak.delay}
              className="text-3xl font-bold text-secondary-100"
              style={{
                fontSize: 30,
                fontWeight: '700',
                textAlign: 'center',
              }}
            />
          </View>
          <Text className="text-base text-neutral-200">Day Streak</Text>
        </Pressable>
      </View>
    </Card>
  );
}
