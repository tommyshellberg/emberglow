import { Check, Users } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator } from 'react-native';

import { Pressable, ScrollView, Text, View } from '@/components/ui';
import colors from '@/components/ui/colors';
import { Guild, GuildIcon, useGuilds } from '@/features/guilds';

interface GuildSelectorProps {
  /**
   * Callback when guild selection changes
   * @param selectedGuildIds - Array of selected guild IDs (single item for single select)
   * @param selectedGuilds - Full guild objects for selected guilds
   * @param allMemberIds - All unique member IDs from selected guilds (excluding current user)
   */
  onSelectionChange: (
    selectedGuildIds: string[],
    selectedGuilds: Guild[],
    allMemberIds: string[]
  ) => void;
  /** Maximum number of guilds that can be selected (default 1 for single select) */
  maxSelections?: number;
  /** Current user ID to exclude from member lists */
  currentUserId?: string;
}

export function GuildSelector({
  onSelectionChange,
  maxSelections = 1,
  currentUserId,
}: GuildSelectorProps) {
  const [selectedGuildId, setSelectedGuildId] = useState<string | null>(null);

  const { data: guilds, isLoading } = useGuilds();

  // Extract all unique member IDs from selected guild (excluding current user)
  const getMemberIds = (guild: Guild | undefined): string[] => {
    if (!guild) return [];

    return guild.members
      .filter((member) => member.id !== currentUserId)
      .map((member) => member.id);
  };

  useEffect(() => {
    if (!guilds) return;

    const selectedGuild = guilds.find((g) => g.id === selectedGuildId);
    const memberIds = getMemberIds(selectedGuild);

    onSelectionChange(
      selectedGuildId ? [selectedGuildId] : [],
      selectedGuild ? [selectedGuild] : [],
      memberIds
    );
  }, [selectedGuildId, guilds]);

  const selectGuild = (guildId: string) => {
    // Toggle off if already selected, otherwise select
    if (selectedGuildId === guildId) {
      setSelectedGuildId(null);
    } else {
      setSelectedGuildId(guildId);
    }
  };

  if (isLoading) {
    return (
      <View className="py-4">
        <ActivityIndicator />
      </View>
    );
  }

  if (!guilds || guilds.length === 0) {
    return (
      <View className="py-4">
        <Text className="text-center" style={{ color: colors.neutral[200] }}>
          No guilds to invite. Create or join a guild to invite your guildmates
          to quests!
        </Text>
      </View>
    );
  }

  return (
    <View>
      <ScrollView
        className="max-h-72 rounded-lg"
        style={{ backgroundColor: colors.cardBackground }}
        showsVerticalScrollIndicator={true}
      >
        {guilds.map((guild, index) => {
          const isSelected = selectedGuildId === guild.id;
          const memberCount = guild.members.length;
          const invitableMembers = guild.members.filter(
            (m) => m.id !== currentUserId
          ).length;
          const isLastItem = index === guilds.length - 1;

          return (
            <Pressable
              key={guild.id}
              onPress={() => selectGuild(guild.id)}
              className="flex-row items-center px-4 py-4"
              style={{
                backgroundColor: isSelected
                  ? colors.primary[500]
                  : 'transparent',
                borderBottomWidth: isLastItem ? 0 : 1,
                borderBottomColor: colors.neutral[500],
              }}
            >
              {/* Guild Icon */}
              <GuildIcon
                icon={guild.icon}
                size={28}
                showBackground
                backgroundColor={
                  isSelected ? colors.primary[300] : colors.primary[100]
                }
              />

              {/* Guild Info */}
              <View className="ml-3 flex-1">
                <Text
                  className="text-base font-semibold text-white"
                  style={{ fontWeight: '600' }}
                >
                  {guild.name}
                </Text>
                <View className="mt-1 flex-row items-center">
                  <Users size={14} color={colors.neutral[200]} />
                  <Text
                    className="ml-1 text-sm"
                    style={{ color: colors.neutral[200] }}
                  >
                    {invitableMembers} member{invitableMembers !== 1 ? 's' : ''}{' '}
                    to invite
                  </Text>
                </View>
                {guild.tagline && (
                  <Text
                    className="mt-1 text-sm"
                    style={{ color: colors.neutral[300] }}
                    numberOfLines={1}
                  >
                    {guild.tagline}
                  </Text>
                )}
              </View>

              {/* Selection indicator - radio style */}
              <View
                className="size-6 items-center justify-center rounded-full"
                style={{
                  backgroundColor: isSelected
                    ? colors.white
                    : 'transparent',
                  borderWidth: isSelected ? 0 : 2,
                  borderColor: colors.neutral[300],
                }}
              >
                {isSelected && (
                  <Check size={16} color={colors.primary[500]} strokeWidth={3} />
                )}
              </View>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}
