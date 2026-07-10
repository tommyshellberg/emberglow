/**
 * Profile Screen Sub-Components
 *
 * Extracted from profile.tsx to improve component composition and reusability.
 */

import { Award, ChevronRight, TrendingUp } from 'lucide-react-native';
import React from 'react';
import { StyleSheet, View } from 'react-native';

import { ListItem } from '@/components/emberglow';
import { colors, radii, shadows, spacing } from '@/theme';

/**
 * ActionCards - Compact link rows for leaderboard and achievements
 * navigation, wrapped in the raised "rowCard" pattern (see
 * src/app/cooperative-quest-menu.tsx) and matching the ProfileScreen
 * mockup's Links section (tabs.jsx ~82-90).
 */
export function ActionCards({
  onLeaderboardPress,
  onAchievementsPress,
}: {
  onLeaderboardPress: () => void;
  onAchievementsPress: () => void;
}) {
  return (
    <View style={styles.rowCard}>
      <ListItem
        title="View Leaderboard"
        subtitle="See how others are doing"
        leading={<TrendingUp size={19} color={colors.text.accent} />}
        trailing={<ChevronRight size={18} color={colors.text.muted} />}
        onPress={onLeaderboardPress}
      />
      <View style={styles.divider}>
        <ListItem
          title="My Achievements"
          subtitle="Track your progress"
          leading={<Award size={19} color={colors.text.accent} />}
          trailing={<ChevronRight size={18} color={colors.text.muted} />}
          onPress={onAchievementsPress}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  rowCard: {
    marginHorizontal: spacing[4],
    marginTop: spacing[4],
    backgroundColor: colors.surface.raised,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border.hairline,
    overflow: 'hidden',
    ...shadows.card,
  },
  divider: {
    borderTopWidth: 1,
    borderTopColor: colors.border.hairline,
  },
});
