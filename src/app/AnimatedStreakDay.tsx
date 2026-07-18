import { Flame } from 'lucide-react-native';
import React from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
  interpolateColor,
  type SharedValue,
  useAnimatedStyle,
} from 'react-native-reanimated';

import { Text, View } from '@/components/ui';
import { colors, fontFamily, radii, shadows } from '@/theme';

import { LAYOUT } from './streak-celebration.constants';
import { type StreakDay } from './streak-visualization.util';

interface AnimatedStreakDayProps {
  day: StreakDay;
  /** 0 -> 1 ignition progress, drives the lit background/border/glow. */
  litProgress: SharedValue<number>;
  /** 1 -> BOUNCE_SCALE -> 1 punch on ignite. */
  scale: SharedValue<number>;
}

/**
 * A single day circle in the streak week row. Unlit days show a faint
 * flame outline; lit days ease to the Cinnabar accent with an ember glow
 * and a brief punch of scale as they ignite.
 */
export function AnimatedStreakDay({
  day,
  litProgress,
  scale,
}: AnimatedStreakDayProps) {
  const scaleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const litStyle = useAnimatedStyle(() => {
    const backgroundColor = interpolateColor(
      litProgress.value,
      [0, 1],
      [colors.fill.faint, colors.accent.primary]
    );
    const borderColor = interpolateColor(
      litProgress.value,
      [0, 1],
      [colors.border.hairline, colors.accent.glow]
    );

    return {
      backgroundColor,
      borderColor,
      shadowOpacity: shadows.glowEmber.shadowOpacity * litProgress.value,
    };
  });

  const flameColor = day.isCompleted ? colors.text.onAccent : colors.text.muted;

  return (
    <View style={styles.container}>
      <Text style={[styles.dayName, day.isToday && styles.dayNameToday]}>
        {day.name}
      </Text>
      <Animated.View
        testID="flame-container"
        style={[styles.circle, scaleStyle, litStyle]}
      >
        <Flame size={19} color={flameColor} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: 8,
    width: LAYOUT.DAY_CIRCLE_SIZE,
  },
  dayName: {
    fontFamily: fontFamily.semibold,
    fontSize: 12,
    letterSpacing: 12 * 0.04,
    color: colors.text.muted,
  },
  dayNameToday: {
    color: colors.text.accent,
  },
  circle: {
    width: LAYOUT.DAY_CIRCLE_SIZE,
    height: LAYOUT.DAY_CIRCLE_SIZE,
    borderRadius: radii.pill,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: shadows.glowEmber.shadowColor,
    shadowOffset: shadows.glowEmber.shadowOffset,
    shadowRadius: shadows.glowEmber.shadowRadius,
    elevation: 0,
  },
});
