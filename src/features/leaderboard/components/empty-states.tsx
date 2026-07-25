/**
 * EmptyStates Component
 *
 * Displays appropriate empty state based on scope, type, and friend status.
 * Handles: no friends, sign in required, no data, invite friends prompts.
 */

import { Trophy, Users } from 'lucide-react-native';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/emberglow';
import {
  A11Y,
  STRINGS,
  UI_CONFIG,
} from '@/features/leaderboard/constants/leaderboard-constants';
import type { EmptyStateProps } from '@/features/leaderboard/types/leaderboard-types';
import { colors, fontFamily, radii, shadows, spacing } from '@/theme';

export function EmptyStates({
  scope,
  type,
  hasFriends,
  hasLeaderboardData,
  onInviteFriends,
}: EmptyStateProps) {
  // Friends scope - user needs to sign in
  if (scope === 'friends' && !hasLeaderboardData) {
    return (
      <View style={[styles.card, styles.cardSpacedTop]}>
        <View style={styles.content}>
          <Users
            size={UI_CONFIG.iconSizeEmpty}
            color={colors.text.muted}
            style={styles.icon}
          />
          <Text style={styles.title}>{STRINGS.emptySignInFriends}</Text>
          <Text style={styles.message}>{STRINGS.emptySignInMessage}</Text>
        </View>
      </View>
    );
  }

  // No data yet (either scope)
  if (!hasLeaderboardData) {
    return (
      <View style={[styles.card, styles.cardSpacedTop]}>
        <View style={styles.content}>
          <Trophy
            size={UI_CONFIG.iconSizeEmpty}
            color={colors.text.muted}
            style={styles.icon}
          />
          <Text style={styles.title}>{STRINGS.emptyNoData}</Text>
          <Text style={styles.message}>
            {scope === 'friends'
              ? STRINGS.emptyNoFriendsStarted
              : STRINGS.emptyCompleteQuests}
          </Text>
        </View>
      </View>
    );
  }

  // Friends scope - no friends yet, invite them
  if (scope === 'friends' && !hasFriends) {
    return (
      <View style={[styles.card, styles.cardSpacedBottom]}>
        <View style={styles.content}>
          <Users
            size={UI_CONFIG.iconSizeEmpty}
            color={colors.text.muted}
            style={styles.icon}
          />
          <Text style={styles.title}>{STRINGS.emptyInviteFriendsTitle}</Text>
          <Text style={styles.message}>
            {STRINGS.emptyInviteFriendsMessage}
          </Text>
        </View>
      </View>
    );
  }

  // Friends scope - has friends but no data for this metric
  if (scope === 'friends' && hasFriends && !hasLeaderboardData) {
    let message = '';
    switch (type) {
      case 'quests':
        message = STRINGS.emptyFriendsQuests;
        break;
      case 'minutes':
        message = STRINGS.emptyFriendsMinutes;
        break;
      case 'streak':
        message = STRINGS.emptyFriendsStreak;
        break;
    }

    return (
      <View style={[styles.card, styles.cardSpacedBottom]}>
        <View style={styles.content}>
          <Text style={styles.message}>{message}</Text>
        </View>
      </View>
    );
  }

  // Default: show invite friends button
  return (
    <View style={styles.inviteWrapper}>
      <View
        accessible
        accessibilityRole="button"
        accessibilityLabel={A11Y.labelInviteFriends}
        accessibilityHint={A11Y.hintInvite}
      >
        <Button
          label={
            hasFriends
              ? STRINGS.inviteButtonHasFriends
              : STRINGS.inviteButtonNoFriends
          }
          variant="primary"
          fullWidth
          onPress={onInviteFriends}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface.raised,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border.hairline,
    padding: spacing[6],
    ...shadows.card,
  },
  cardSpacedTop: {
    marginTop: spacing[8],
  },
  cardSpacedBottom: {
    marginBottom: spacing[4],
  },
  content: {
    alignItems: 'center',
  },
  icon: {
    marginBottom: spacing[3],
  },
  title: {
    marginBottom: spacing[2],
    fontFamily: fontFamily.bold,
    fontSize: 18,
    color: colors.text.primary,
  },
  message: {
    textAlign: 'center',
    fontFamily: fontFamily.regular,
    fontSize: 15,
    color: colors.text.secondary,
  },
  inviteWrapper: {
    marginTop: spacing[4],
    marginBottom: spacing[6],
  },
});
