import React from 'react';
import { StyleSheet } from 'react-native';

import { Text, View } from '@/components/ui';
import {
  colors,
  fontFamily,
  fontSize,
  radii,
  spacing,
  tracking,
} from '@/theme';

import {
  type DailyStat,
  formatMinutes,
  getWeeklySummary,
} from '../lib/daily-stats';

export function WeeklySummary({ stats }: { stats: DailyStat[] }) {
  const { totalMinutes, bestDay } = getWeeklySummary(stats);

  return (
    <View style={styles.grid}>
      <View
        style={styles.tile}
        accessible={true}
        accessibilityRole="text"
        accessibilityLabel={`${formatMinutes(totalMinutes)} this week`}
      >
        <Text style={styles.tileNumber}>{formatMinutes(totalMinutes)}</Text>
        <Text style={styles.tileLabel}>This Week</Text>
      </View>
      <View
        style={styles.tile}
        accessible={true}
        accessibilityRole="text"
        accessibilityLabel={
          bestDay
            ? `Best day ${bestDay.dayShort}, ${formatMinutes(bestDay.minutes)}`
            : 'No best day yet'
        }
      >
        <Text style={styles.tileNumber}>
          {bestDay
            ? `${bestDay.dayShort} · ${formatMinutes(bestDay.minutes)}`
            : '—'}
        </Text>
        <Text style={styles.tileLabel}>Best Day</Text>
      </View>
    </View>
  );
}

// Mirrors the StatsCard tile styling (src/components/profile/stats-card.tsx),
// including the Erstoria lineHeight convention.
const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    gap: spacing[2],
  },
  tile: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface.raised,
    borderWidth: 1,
    borderColor: colors.border.hairline,
    borderRadius: radii.md,
    paddingVertical: spacing[4],
    paddingHorizontal: spacing[2],
  },
  tileNumber: {
    fontFamily: fontFamily.display,
    fontSize: fontSize.h3,
    lineHeight: fontSize.h3 * 1.15,
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
