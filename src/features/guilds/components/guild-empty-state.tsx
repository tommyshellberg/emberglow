/**
 * GuildEmptyState Component
 *
 * Displayed when user has no guilds.
 * Encourages creating or joining a guild.
 */

import React from 'react';
import { Pressable } from 'react-native';

import { Text, View } from '@/components/ui';

import { GUILD_BUTTONS, GUILD_EMPTY_STATE } from '../constants/guild-strings';
import type { GuildEmptyStateProps } from '../types/guild-types';

export function GuildEmptyState({
  onCreatePress,
  onJoinPress,
}: GuildEmptyStateProps) {
  return (
    <View className="items-center px-8 py-10">
      {/* Flame icon representing "shared flame" */}
      <View
        testID="empty-state-icon"
        className="mb-4 h-16 w-16 items-center justify-center rounded-full bg-guild-300/20"
      >
        <Text className="text-4xl">{'\uD83D\uDD25'}</Text>
      </View>

      {/* Title */}
      <Text className="mb-2 text-center text-xl font-bold text-cream-500">
        {GUILD_EMPTY_STATE.TITLE}
      </Text>

      {/* Description */}
      <Text className="mb-6 text-center text-base text-neutral-200">
        {GUILD_EMPTY_STATE.DESCRIPTION}
      </Text>

      {/* Action buttons */}
      <View className="w-full gap-3">
        <Pressable
          testID="create-guild-button"
          onPress={onCreatePress}
          accessible={true}
          accessibilityRole="button"
          accessibilityLabel="Create a new guild"
          className="w-full items-center rounded-xl bg-guild-300 py-3 active:bg-guild-400"
        >
          <Text className="text-base font-semibold text-richBlack-500">
            {GUILD_BUTTONS.CREATE}
          </Text>
        </Pressable>

        <Pressable
          testID="join-guild-button"
          onPress={onJoinPress}
          accessible={true}
          accessibilityRole="button"
          accessibilityLabel="Join an existing guild with invite code"
          className="w-full items-center rounded-xl border border-guild-300 py-3 active:bg-guild-300/10"
        >
          <Text className="text-base font-semibold text-guild-300">
            {GUILD_BUTTONS.JOIN}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
