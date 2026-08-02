import React, { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

import { Text, View } from '@/components/ui';
import {
  colors,
  fontFamily,
  fontSize,
  spacing,
  tracking,
  withAlpha,
} from '@/theme';

import {
  type DailyStat,
  getWeeklyActivityLabel,
  getWeeklySummary,
} from '../lib/daily-stats';

export type WeeklyActivityChartProps = {
  stats: DailyStat[];
  variant: 'compact' | 'full';
  emptyMessage?: string;
  testID?: string;
};

const BAR_AREA_HEIGHT = { full: 96, compact: 56 } as const;
const ZERO_STUB_HEIGHT = 4;

function Bar({
  stat,
  maxMinutes,
  areaHeight,
  index,
}: {
  stat: DailyStat;
  maxMinutes: number;
  areaHeight: number;
  index: number;
}) {
  const targetHeight =
    stat.minutes === 0 || maxMinutes === 0
      ? ZERO_STUB_HEIGHT
      : Math.max((stat.minutes / maxMinutes) * areaHeight, ZERO_STUB_HEIGHT);
  const height = useSharedValue(ZERO_STUB_HEIGHT);

  useEffect(() => {
    height.value = withDelay(
      index * 60,
      withTiming(targetHeight, {
        duration: 600,
        easing: Easing.out(Easing.cubic),
      })
    );
  }, [height, index, targetHeight]);

  const animatedStyle = useAnimatedStyle(() => ({ height: height.value }));

  const backgroundColor =
    stat.minutes === 0
      ? colors.border.hairline
      : stat.isToday
        ? colors.accent.primary
        : withAlpha(colors.accent.primary, 0.45);

  return (
    <View style={styles.barColumn}>
      <View style={[styles.barTrack, { height: areaHeight }]}>
        <Animated.View
          testID={`activity-bar-${stat.date}`}
          style={[styles.bar, { backgroundColor }, animatedStyle]}
        />
      </View>
      <Text style={styles.dayLabel}>{stat.dayInitial}</Text>
    </View>
  );
}

export function WeeklyActivityChart({
  stats,
  variant,
  emptyMessage,
  testID,
}: WeeklyActivityChartProps) {
  const { totalMinutes } = getWeeklySummary(stats);
  const maxMinutes = Math.max(...stats.map((s) => s.minutes), 0);
  const areaHeight = BAR_AREA_HEIGHT[variant];
  const accessibilityLabel = getWeeklyActivityLabel(stats);

  return (
    <View
      testID={testID}
      accessible={true}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="image"
    >
      <View style={styles.row}>
        {stats.map((stat, index) => (
          <Bar
            key={stat.date}
            stat={stat}
            maxMinutes={maxMinutes}
            areaHeight={areaHeight}
            index={index}
          />
        ))}
      </View>
      {totalMinutes === 0 && emptyMessage ? (
        <Text style={styles.emptyMessage}>{emptyMessage}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing[2],
  },
  barColumn: {
    flex: 1,
    alignItems: 'center',
  },
  barTrack: {
    width: '100%',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  bar: {
    width: '60%',
    borderRadius: 3,
  },
  dayLabel: {
    marginTop: spacing[1],
    fontFamily: fontFamily.semibold,
    fontSize: fontSize.caption,
    letterSpacing: fontSize.caption * tracking.wide,
    color: colors.text.muted,
  },
  emptyMessage: {
    marginTop: spacing[3],
    fontSize: fontSize.caption,
    color: colors.text.muted,
    textAlign: 'center',
  },
});
