import { Check, Users } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet } from 'react-native';

import { Pressable, ScrollView, Text, View } from '@/components/ui';
import { type Guild, GuildIcon, useGuilds } from '@/features/guilds';
import { colors, fontFamily, radii, spacing } from '@/theme';

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
  // `maxSelections` is part of the public prop contract (callers, e.g.
  // create-cooperative-quest.tsx, pass it explicitly) but this component has
  // always been single-select only regardless of its value — pre-existing,
  // not something this presentation-only pass changes (ground rule 1).
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
      <View style={styles.centeredPad}>
        <ActivityIndicator color={colors.accent.primary} />
      </View>
    );
  }

  if (!guilds || guilds.length === 0) {
    return (
      <View style={styles.centeredPad}>
        <Text style={styles.emptyText}>
          No guilds to invite. Create or join a guild to invite your guildmates
          to quests!
        </Text>
      </View>
    );
  }

  return (
    <View>
      {/* This is a bespoke composition, not `ListItem`: a guild row shows
          three independently-queried metadata pieces (name, member count,
          tagline) and `ListItem`'s `subtitle` only accepts one string —
          merging them would collapse `guild-selector.test.tsx`'s exact-text
          assertions (e.g. `getByText('A test guild')`) into a single
          combined string and break that behavioral contract (ground rule 2). */}
      <ScrollView style={styles.list} showsVerticalScrollIndicator={true}>
        {guilds.map((guild, index) => {
          const isSelected = selectedGuildId === guild.id;
          const invitableMembers = guild.members.filter(
            (m) => m.id !== currentUserId
          ).length;
          const isLastItem = index === guilds.length - 1;

          return (
            <Pressable
              key={guild.id}
              onPress={() => selectGuild(guild.id)}
              style={[
                styles.row,
                isSelected && styles.rowSelected,
                !isLastItem && styles.rowDivider,
              ]}
            >
              {/* Guild Icon */}
              <GuildIcon
                icon={guild.icon}
                size={18}
                showBackground
                backgroundColor={
                  isSelected ? colors.fill.subtle : colors.fill.faint
                }
              />

              {/* Guild Info */}
              <View style={styles.info}>
                <Text style={styles.name}>{guild.name}</Text>
                <View style={styles.metaRow}>
                  <Users size={14} color={colors.text.muted} />
                  <Text style={styles.metaText}>
                    {invitableMembers} member{invitableMembers !== 1 ? 's' : ''}{' '}
                    to invite
                  </Text>
                </View>
                {guild.tagline && (
                  <Text style={styles.tagline} numberOfLines={1}>
                    {guild.tagline}
                  </Text>
                )}
              </View>

              {/* Selection indicator - radio style */}
              <View
                style={[
                  styles.selectionCircle,
                  isSelected
                    ? styles.selectionCircleSelected
                    : styles.selectionCircleUnselected,
                ]}
              >
                {isSelected && (
                  <Check
                    size={13}
                    color={colors.palette.richBlack}
                    strokeWidth={3}
                  />
                )}
              </View>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  centeredPad: {
    paddingVertical: spacing[4],
  },
  emptyText: {
    textAlign: 'center',
    fontFamily: fontFamily.regular,
    color: colors.text.muted,
  },
  list: {
    maxHeight: 288,
    borderRadius: radii.lg,
    backgroundColor: colors.surface.raised,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[4],
  },
  rowSelected: {
    backgroundColor: colors.fill.faint,
  },
  rowDivider: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border.hairline,
  },
  info: {
    marginLeft: spacing[3],
    flex: 1,
  },
  name: {
    fontFamily: fontFamily.semibold,
    fontSize: 16,
    color: colors.text.primary,
  },
  metaRow: {
    marginTop: spacing[1],
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
  },
  metaText: {
    fontFamily: fontFamily.regular,
    fontSize: 13,
    color: colors.text.muted,
  },
  tagline: {
    marginTop: spacing[1],
    fontFamily: fontFamily.regular,
    fontSize: 13,
    color: colors.text.secondary,
  },
  selectionCircle: {
    height: 24,
    width: 24,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectionCircleSelected: {
    backgroundColor: colors.text.accent,
  },
  selectionCircleUnselected: {
    borderWidth: 2,
    borderColor: colors.border.strong,
  },
});
