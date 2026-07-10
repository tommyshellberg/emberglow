/**
 * LeaderboardHeader Component
 *
 * Displays the top-ranked user in a featured card with trophy background.
 * Fully accessible with proper labels.
 */

import { Crown, Trophy } from 'lucide-react-native';
import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';

import CHARACTERS from '@/app/data/characters';
import { UI_CONFIG } from '@/features/leaderboard/constants/leaderboard-constants';
import type { LeaderboardHeaderProps } from '@/features/leaderboard/types/leaderboard-types';
import { getMetricLabelFull } from '@/features/leaderboard/utils/leaderboard-utils';
import {
  colors,
  fontFamily,
  palette,
  radii,
  shadows,
  spacing,
  withAlpha,
} from '@/theme';

export function LeaderboardHeader({ topUser, type }: LeaderboardHeaderProps) {
  const character = CHARACTERS.find((c) => c.id === topUser.characterType);
  const metricLabel = getMetricLabelFull(type);

  return (
    <View style={styles.card}>
      {/* Background Trophy watermark */}
      <View
        style={styles.trophyBackground}
        accessibilityElementsHidden
        importantForAccessibility="no"
      >
        <Trophy
          size={UI_CONFIG.iconSizeTrophy}
          color={palette.sandy}
          style={{
            transform: [{ rotate: UI_CONFIG.trophyBackgroundRotation }],
          }}
        />
      </View>

      <View style={styles.content}>
        {/* Crown icon above avatar */}
        <Crown
          size={UI_CONFIG.iconSizeLarge}
          color={palette.sandy}
          style={styles.crown}
          accessibilityLabel="First place crown"
        />

        {/* Character Avatar */}
        <Image
          source={character?.profileImage}
          style={styles.avatar}
          accessibilityLabel={`${topUser.username}'s character avatar`}
        />

        {/* Username */}
        <Text style={styles.username}>{topUser.username}</Text>

        {/* Metric Value */}
        <Text style={styles.metric}>{topUser.metric}</Text>

        {/* Metric Label */}
        <Text style={styles.metricLabel}>{metricLabel}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    position: 'relative',
    overflow: 'hidden',
    marginBottom: spacing[4],
    backgroundColor: colors.surface.raised,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: withAlpha(palette.sandy, 0.3),
    ...shadows.card,
  },
  trophyBackground: {
    position: 'absolute',
    right: UI_CONFIG.trophyBackgroundOffset,
    top: UI_CONFIG.trophyBackgroundOffset,
    opacity: 0.1,
  },
  content: {
    alignItems: 'center',
    padding: spacing[6],
  },
  crown: {
    marginBottom: spacing[2],
  },
  avatar: {
    width: UI_CONFIG.avatarSizeLarge,
    height: UI_CONFIG.avatarSizeLarge,
    borderRadius: radii.pill,
    backgroundColor: colors.fill.faint,
  },
  username: {
    marginTop: spacing[3],
    fontFamily: fontFamily.bold,
    fontSize: 20,
    color: colors.text.primary,
  },
  metric: {
    marginTop: spacing[1],
    fontFamily: fontFamily.bold,
    fontSize: 30,
    color: colors.text.accent,
  },
  metricLabel: {
    fontFamily: fontFamily.regular,
    fontSize: 14,
    color: colors.text.secondary,
  },
});
