import { ChevronRight } from 'lucide-react-native';
import React, { useMemo } from 'react';
import { Pressable, StyleSheet } from 'react-native';

import { Text, View } from '@/components/ui';
import { useQuestStore } from '@/store/quest-store';
import {
  colors,
  fontFamily,
  fontSize,
  radii,
  spacing,
  tracking,
} from '@/theme';

import {
  aggregateDailyMinutes,
  getWeeklyActivityLabel,
} from '../lib/daily-stats';
import { WeeklyActivityChart } from './weekly-activity-chart';

const DAYS_SHOWN = 7;

// Self-contained card: reads the quest store itself so profile.tsx stays thin.
export function WeeklyActivityCard({ onPress }: { onPress: () => void }) {
  const completedQuests = useQuestStore((state) => state.completedQuests);
  const dailyStats = useMemo(
    () => aggregateDailyMinutes(completedQuests, DAYS_SHOWN, Date.now()),
    [completedQuests]
  );

  // The Pressable below is an accessible={true} boundary, which on RN
  // collapses its whole subtree (including WeeklyActivityChart's own
  // accessibilityLabel) into one opaque element for VoiceOver/TalkBack — so
  // the chart's summary must be re-stated here, on the boundary that
  // actually gets announced. Mirrors StatsCard's one-explicit-label-per-
  // accessible-boundary pattern (stats-card.tsx).
  const accessibilityLabel = getWeeklyActivityLabel(dailyStats);

  return (
    <Pressable
      testID="weekly-activity-card"
      style={styles.card}
      onPress={onPress}
      accessible={true}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint="Tap to view your stats"
    >
      <View style={styles.headerRow}>
        <Text style={styles.caption}>LAST 7 DAYS</Text>
        <ChevronRight size={16} color={colors.text.muted} />
      </View>
      <WeeklyActivityChart
        stats={dailyStats}
        variant="compact"
        emptyMessage="Complete a quest to light up your week"
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface.raised,
    borderWidth: 1,
    borderColor: colors.border.hairline,
    borderRadius: radii.md,
    padding: spacing[4],
    marginHorizontal: spacing[4],
    marginTop: spacing[4],
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[3],
  },
  caption: {
    fontFamily: fontFamily.semibold,
    fontSize: fontSize.caption,
    letterSpacing: fontSize.caption * tracking.wide,
    color: colors.text.muted,
  },
});
