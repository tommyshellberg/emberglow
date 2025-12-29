/**
 * GuildsSection Component
 *
 * Section component for displaying user's guilds on the Profile screen.
 * Shows guild cards or empty state with actions.
 */

import { useRouter } from 'expo-router';
import React from 'react';
import { ActivityIndicator, Pressable } from 'react-native';

import { Card, Text, View } from '@/components/ui';

import { GUILD_LIMITS, GUILD_TITLES } from '../constants/guild-strings';
import { useGuilds, useJoinByInviteCode } from '../hooks/use-guilds';
import { useGuildStore } from '@/store/guild-store';
import { useUserStore } from '@/store/user-store';

import { GuildCard } from './guild-card';
import { GuildEmptyState } from './guild-empty-state';
import { JoinGuildModal } from './modals/join-guild-modal';

export function GuildsSection() {
  const router = useRouter();
  const { data: guilds, isLoading, error } = useGuilds();
  const user = useUserStore((state) => state.user);
  const currentUserId = user?.id;

  const openJoinModal = useGuildStore((state) => state.openJoinModal);
  const isJoinModalOpen = useGuildStore((state) => state.isJoinModalOpen);
  const closeJoinModal = useGuildStore((state) => state.closeJoinModal);

  // Join guild mutation
  const joinGuildMutation = useJoinByInviteCode();

  const handleJoinSubmit = (code: string) => {
    joinGuildMutation.mutate(code, {
      onSuccess: (guild) => {
        closeJoinModal();
        // Navigate to the newly joined guild
        router.push(`/guild/${guild.id}` as any);
      },
    });
  };

  const handleGuildPress = (guildId: string) => {
    router.push(`/guild/${guildId}` as any);
  };

  const handleCreatePress = () => {
    router.push('/guild/create');
  };

  const handleJoinPress = () => {
    openJoinModal();
  };

  // Calculate guild count display
  const guildCount = guilds?.length ?? 0;
  const maxGuilds = GUILD_LIMITS.MAX_GUILDS_PER_USER;
  const canCreateMore = guildCount < maxGuilds;

  return (
    <>
    <Card className="mx-4 mt-4 p-4">
      {/* Section Header */}
      <View className="mb-3 flex-row items-center justify-between">
        <View className="flex-row items-center">
          <Text className="text-lg font-bold text-cream-500">
            {GUILD_TITLES.SECTION_TITLE}
          </Text>
          {guildCount > 0 && (
            <Text className="ml-2 text-sm text-neutral-200">
              ({guildCount}/{maxGuilds})
            </Text>
          )}
        </View>

        {/* Add button - only show if user has guilds and can create more */}
        {guildCount > 0 && canCreateMore && (
          <Pressable
            testID="add-guild-button"
            onPress={handleCreatePress}
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel="Create a new guild"
            className="rounded-lg bg-guild-300/20 px-3 py-1"
          >
            <Text className="text-sm font-semibold text-guild-300">
              + Create
            </Text>
          </Pressable>
        )}
      </View>

      {/* Content */}
      {isLoading ? (
        <View className="items-center py-8">
          <ActivityIndicator size="small" color="#D4A574" />
          <Text className="mt-2 text-sm text-neutral-200">
            Loading guilds...
          </Text>
        </View>
      ) : error ? (
        <View className="items-center py-8">
          <Text className="text-sm text-red-300">
            Unable to load guilds. Pull to refresh.
          </Text>
        </View>
      ) : guildCount === 0 ? (
        <GuildEmptyState
          onCreatePress={handleCreatePress}
          onJoinPress={handleJoinPress}
        />
      ) : (
        <View className="gap-3">
          {guilds?.map((guild) => (
            <GuildCard
              key={guild.id}
              guild={guild}
              onPress={() => handleGuildPress(guild.id)}
              isOwner={guild.owner.id === currentUserId}
            />
          ))}

          {/* Join with code link */}
          <Pressable
            testID="join-with-code-link"
            onPress={handleJoinPress}
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel="Join a guild with invite code"
            className="mt-2 items-center py-2"
          >
            <Text className="text-sm text-guild-300 underline">
              Join with Code
            </Text>
          </Pressable>
        </View>
      )}
    </Card>

    {/* Join Guild Modal */}
    <JoinGuildModal
      visible={isJoinModalOpen}
      onClose={closeJoinModal}
      onSubmit={handleJoinSubmit}
      isLoading={joinGuildMutation.isPending}
      error={joinGuildMutation.error?.message}
    />
    </>
  );
}
