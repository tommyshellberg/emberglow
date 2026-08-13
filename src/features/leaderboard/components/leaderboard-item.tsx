/**
 * LeaderboardItem Component
 *
 * Displays a single leaderboard entry with rank, avatar, username, and metric.
 * Fully accessible with proper labels and roles.
 */

import { Trophy } from 'lucide-react-native';
import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';

import CHARACTERS from '@/app/data/characters';
import { ListItem } from '@/components/emberglow';
import {
  STRINGS,
  UI_CONFIG,
} from '@/features/leaderboard/constants/leaderboard-constants';
import type { LeaderboardItemProps } from '@/features/leaderboard/types/leaderboard-types';
import { getMetricLabel } from '@/features/leaderboard/utils/leaderboard-utils';
import {
  colors,
  fontFamily,
  palette,
  radii,
  spacing,
  withAlpha,
} from '@/theme';

const CURRENT_USER_HIGHLIGHT = withAlpha(palette.sandy, 0.08);

export function LeaderboardItem({ entry, type }: LeaderboardItemProps) {
  const character = CHARACTERS.find((c) => c.id === entry.characterType);
  const metricLabel = getMetricLabel(type, entry.metric);

  const isTopThree = !!entry.rank && entry.rank <= 3;

  return (
    <View
      // The row sets `accessible`, so nothing inside it reaches the
      // accessibility tree — the id has to sit on the row itself.
      testID="leaderboard-row"
      style={styles.row}
      accessible
      accessibilityLabel={`${entry.rank ? `Rank ${entry.rank}` : 'Your position'}, ${entry.username}${entry.isCurrentUser ? ', you' : ''}${entry.isFriend ? ', friend' : ''}, ${metricLabel}`}
    >
      {/* Rank Number */}
      <Text style={[styles.rank, isTopThree && styles.rankTop]}>
        {entry.rank || ''}
      </Text>

      <View style={styles.itemWrapper}>
        <ListItem
          style={entry.isCurrentUser ? styles.currentUserItem : undefined}
          leading={
            <Image
              source={character?.profileImage}
              style={styles.avatar}
              accessibilityLabel={`${entry.username}'s character avatar`}
            />
          }
          title={
            entry.isCurrentUser
              ? `${entry.username}${STRINGS.currentUserSuffix}`
              : entry.username
          }
          subtitle={
            entry.isFriend && !entry.isCurrentUser
              ? STRINGS.friendLabel
              : undefined
          }
          trailing={
            <View style={styles.trailing}>
              <Text style={styles.metric}>{metricLabel}</Text>
              {entry.rank === 1 && (
                <Trophy
                  size={UI_CONFIG.iconSizeSmall}
                  color={palette.sandy}
                  accessibilityLabel="First place trophy"
                />
              )}
            </View>
          }
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rank: {
    width: 32,
    textAlign: 'center',
    fontFamily: fontFamily.bold,
    fontSize: 18,
    color: colors.text.secondary,
  },
  rankTop: {
    color: palette.sandy,
  },
  itemWrapper: {
    flex: 1,
  },
  currentUserItem: {
    backgroundColor: CURRENT_USER_HIGHLIGHT,
  },
  avatar: {
    width: '100%',
    height: '100%',
    borderRadius: radii.md,
  },
  trailing: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  metric: {
    fontFamily: fontFamily.semibold,
    fontSize: 18,
    color: colors.text.secondary,
  },
});
