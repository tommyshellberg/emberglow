/**
 * LeaderboardTabs Component
 *
 * Tab navigation for switching between Quests, Minutes, and Streaks leaderboards.
 * Fully accessible with proper roles, labels, and states.
 *
 * No Emberglow segmented-control/icon-tabs primitive exists yet, so this
 * stays a bespoke `Pressable` row, retinted from `@/theme`.
 */

import { CheckCircle, Clock, TrendingUp } from 'lucide-react-native';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import {
  A11Y,
  STRINGS,
  UI_CONFIG,
} from '@/features/leaderboard/constants/leaderboard-constants';
import type {
  LeaderboardTab,
  LeaderboardTabsProps,
} from '@/features/leaderboard/types/leaderboard-types';
import { colors, fontFamily, radii, spacing } from '@/theme';

export function LeaderboardTabs({
  selectedType,
  onTypeChange,
}: LeaderboardTabsProps) {
  const tabs: LeaderboardTab[] = [
    {
      type: 'quests',
      label: STRINGS.tabQuests,
      icon: <CheckCircle size={UI_CONFIG.iconSizeMedium} />,
    },
    {
      type: 'minutes',
      label: STRINGS.tabMinutes,
      icon: <Clock size={UI_CONFIG.iconSizeMedium} />,
    },
    {
      type: 'streak',
      label: STRINGS.tabStreaks,
      icon: <TrendingUp size={UI_CONFIG.iconSizeMedium} />,
    },
  ];

  return (
    <View style={styles.container}>
      {tabs.map((tab) => {
        const isSelected = selectedType === tab.type;

        // Get accessibility label based on tab type
        const accessibilityLabel =
          tab.type === 'quests'
            ? A11Y.labelTabQuests
            : tab.type === 'minutes'
              ? A11Y.labelTabMinutes
              : A11Y.labelTabStreaks;

        return (
          <Pressable
            key={tab.type}
            onPress={() => onTypeChange(tab.type)}
            style={[styles.tab, isSelected && styles.tabSelected]}
            accessible
            accessibilityRole={A11Y.roleTab}
            accessibilityLabel={accessibilityLabel}
            accessibilityHint={A11Y.hintTabSwitch}
            accessibilityState={{ selected: isSelected }}
          >
            {/* Clone icon with correct color */}
            {React.cloneElement(tab.icon as React.ReactElement, {
              color: isSelected ? colors.text.accent : colors.text.muted,
            })}

            {/* Tab Label */}
            <Text style={[styles.label, isSelected && styles.labelSelected]}>
              {tab.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: spacing[4],
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    borderRadius: radii.md,
    padding: spacing[3],
  },
  tabSelected: {
    backgroundColor: colors.fill.subtle,
  },
  label: {
    marginTop: spacing[1],
    fontFamily: fontFamily.regular,
    fontSize: 14,
    color: colors.text.secondary,
  },
  labelSelected: {
    fontFamily: fontFamily.semibold,
    color: colors.text.accent,
  },
});
