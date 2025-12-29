/**
 * GuildCard Component
 *
 * Displays a guild summary card for use in lists.
 * Shows guild icon, name, tagline, and member count.
 */

import React from 'react';
import { Pressable } from 'react-native';

import { Card, Text, View } from '@/components/ui';

import { GUILD_A11Y } from '../constants/guild-strings';
import type { GuildCardProps } from '../types/guild-types';

import { GuildIcon } from './guild-icon';

export function GuildCard({ guild, onPress, isOwner }: GuildCardProps) {
  const memberCount = guild.members.length;
  const memberText = memberCount === 1 ? '1 member' : `${memberCount} members`;

  return (
    <Pressable
      testID="guild-card"
      onPress={onPress}
      accessible={true}
      accessibilityRole="button"
      accessibilityLabel={GUILD_A11Y.GUILD_CARD(guild.name, memberCount)}
      className="active:opacity-80"
    >
      <Card className="p-4">
        <View className="flex-row items-center">
          {/* Guild Icon */}
          <View className="mr-3">
            <GuildIcon icon={guild.icon} size={28} showBackground />
          </View>

          {/* Guild Info */}
          <View className="flex-1">
            <View className="flex-row items-center">
              <Text className="text-lg font-bold text-cream-500">
                {guild.name}
              </Text>
              {isOwner && (
                <View
                  testID="owner-badge"
                  className="ml-2 rounded-full bg-guild-300/30 px-2 py-0.5"
                >
                  <Text className="text-xs text-guild-200">Owner</Text>
                </View>
              )}
            </View>

            {guild.tagline && (
              <Text className="mt-0.5 text-sm italic text-neutral-200">
                {guild.tagline}
              </Text>
            )}

            <Text className="mt-1 text-sm text-muted-200">{memberText}</Text>
          </View>

          {/* Chevron indicator */}
          <Text className="text-neutral-300">&gt;</Text>
        </View>
      </Card>
    </Pressable>
  );
}
