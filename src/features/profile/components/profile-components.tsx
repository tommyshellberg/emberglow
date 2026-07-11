/**
 * Profile Screen Sub-Components
 *
 * Extracted from profile.tsx to improve component composition and reusability.
 */

import { Award, ChevronRight, Sparkles, TrendingUp } from 'lucide-react-native';
import React from 'react';
import { StyleSheet, View } from 'react-native';

import { ListItem } from '@/components/emberglow';
import { useSkillTreeStore } from '@/store/skill-tree-store';
import { colors, radii, shadows, spacing } from '@/theme';

const ICON_SIZE = 19;
const CHEVRON_SIZE = 18;

/**
 * ActionCards - Links section: Skills & Perks, Leaderboard, Achievements,
 * wrapped in the raised "rowCard" pattern (see
 * src/app/cooperative-quest-menu.tsx) and matching the ProfileScreen
 * mockup's Links section (tabs.jsx ~82-90). Titles drop the "View …"/
 * "My …" prefixes per the design.
 *
 * The Skills & Perks subtitle is computed here (the row's parent) from the
 * skill-tree store — the row itself stays presentation-only — reusing the
 * same counts `skills-card.tsx` used to compute before it was folded into
 * this card.
 */
export function ActionCards({
  onSkillsPress,
  onLeaderboardPress,
  onAchievementsPress,
}: {
  onSkillsPress: () => void;
  onLeaderboardPress: () => void;
  onAchievementsPress: () => void;
}) {
  const { skillTreeData, getUnlockedPerks, getAvailablePerksToUnlock } =
    useSkillTreeStore();

  const unlockedCount = getUnlockedPerks().length;
  const availablePoints = getAvailablePerksToUnlock().length;
  const totalPerks = skillTreeData?.availablePerks.length ?? 0;

  const skillsSubtitle =
    unlockedCount === 0
      ? 'Unlock your first perk'
      : availablePoints > 0
        ? `${availablePoints} point${availablePoints === 1 ? '' : 's'} to spend`
        : `${unlockedCount} of ${totalPerks} unlocked`;

  return (
    <View style={styles.rowCard}>
      <ListItem
        title="Skills & Perks"
        subtitle={skillsSubtitle}
        leading={<Sparkles size={ICON_SIZE} color={colors.text.accent} />}
        trailing={
          <ChevronRight size={CHEVRON_SIZE} color={colors.text.muted} />
        }
        onPress={onSkillsPress}
      />
      <View style={styles.divider}>
        <ListItem
          title="Leaderboard"
          subtitle="See how others are doing"
          leading={<TrendingUp size={ICON_SIZE} color={colors.text.accent} />}
          trailing={
            <ChevronRight size={CHEVRON_SIZE} color={colors.text.muted} />
          }
          onPress={onLeaderboardPress}
        />
      </View>
      <View style={styles.divider}>
        <ListItem
          title="Achievements"
          subtitle="Track your progress"
          leading={<Award size={ICON_SIZE} color={colors.text.accent} />}
          trailing={
            <ChevronRight size={CHEVRON_SIZE} color={colors.text.muted} />
          }
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
