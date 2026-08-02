import React, { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { Text, View } from '@/components/ui';
import { colors, fontFamily, fontSize, radii, spacing } from '@/theme';

import { formatMinutes } from '../lib/daily-stats';
import { getMilestoneProgress } from '../lib/milestones';

export function MilestoneProgress({ totalMinutes }: { totalMinutes: number }) {
  const progress = getMilestoneProgress(totalMinutes);
  const fill = useSharedValue(0);

  useEffect(() => {
    fill.value = withTiming(progress.fraction, {
      duration: 800,
      easing: Easing.out(Easing.cubic),
    });
  }, [fill, progress.fraction]);

  const fillStyle = useAnimatedStyle(() => ({
    width: `${fill.value * 100}%`,
  }));

  if (totalMinutes === 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.teaser}>
          Your first milestone: 1 hour reclaimed
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{progress.label}</Text>
      <View style={styles.track}>
        <Animated.View
          testID="milestone-bar"
          style={[styles.fill, fillStyle]}
        />
      </View>
      <Text style={styles.sublabel}>
        {formatMinutes(totalMinutes)} reclaimed so far
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface.raised,
    borderWidth: 1,
    borderColor: colors.border.hairline,
    borderRadius: radii.md,
    padding: spacing[4],
  },
  label: {
    fontFamily: fontFamily.display,
    fontSize: fontSize.body,
    lineHeight: fontSize.body * 1.15,
    color: colors.text.primary,
  },
  teaser: {
    fontFamily: fontFamily.display,
    fontSize: fontSize.body,
    lineHeight: fontSize.body * 1.15,
    color: colors.text.primary,
  },
  track: {
    marginTop: spacing[3],
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.border.hairline,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 5,
    backgroundColor: colors.accent.primary,
  },
  sublabel: {
    marginTop: spacing[2],
    fontSize: fontSize.caption,
    color: colors.text.muted,
  },
});
