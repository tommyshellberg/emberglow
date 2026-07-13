/**
 * GuildsSection Component
 *
 * Section component for displaying user's guilds on the Profile screen.
 * Shows guild rows or empty state with actions.
 */

import { useRouter } from 'expo-router';
import {
  Axe,
  Coffee,
  Compass,
  Flag,
  Flame,
  Gem,
  Hammer,
  Scroll,
  Tent,
  Wand,
} from 'lucide-react-native';
import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet } from 'react-native';

import { Badge, Button, EyebrowLabel, ListItem } from '@/components/emberglow';
import { Text, View } from '@/components/ui';
import { useGuildStore } from '@/store/guild-store';
import { useUserStore } from '@/store/user-store';
import { colors, radii, shadows, spacing } from '@/theme';

import { GUILD_A11Y, GUILD_LIMITS } from '../constants/guild-strings';
import { useGuilds, useJoinByInviteCode } from '../hooks/use-guilds';
import type { GuildIcon } from '../types/guild-types';
import { mapJoinGuildError } from '../utils/map-join-guild-error';
import { GuildEmptyState } from './guild-empty-state';
import { JoinGuildModal } from './modals/join-guild-modal';

const ROW_ICON_SIZE = 19;

// Line-art Lucide equivalents for each guild icon — the design drops the
// colored SVG-in-circle `GuildIcon` in favor of a neutral rounded-square
// tile (ListItem's own leading container) with a sandy line-art icon.
// `typeof Flag` stands in for lucide-react-native's internal (unexported)
// `LucideIcon` type — every icon in the package shares that same signature.
const GUILD_ROW_ICONS: Record<GuildIcon, typeof Flag> = {
  axe: Axe,
  hammer: Hammer,
  camping: Tent,
  mug: Coffee,
  flame: Flame,
  explorer: Compass,
  magic: Wand,
  banner: Flag,
  scroll: Scroll,
  diamond: Gem,
};

function GuildRowIcon({ icon }: { icon: GuildIcon }) {
  const IconComponent = GUILD_ROW_ICONS[icon] ?? Flag;
  return <IconComponent size={ROW_ICON_SIZE} color={colors.text.accent} />;
}

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
      <View style={styles.wrapper}>
        {/* Section header — outside any card, sandy eyebrow + trailing action */}
        {guildCount > 0 && (
          <View style={styles.sectionHeader}>
            <EyebrowLabel tone="warm">
              {`Guilds · ${guildCount} of ${maxGuilds}`}
            </EyebrowLabel>
            <Button
              variant="ghost"
              size="sm"
              label="+ Create"
              onPress={handleCreatePress}
              disabled={!canCreateMore}
              accessibilityLabel="Create a new guild"
              testID="add-guild-button"
            />
          </View>
        )}

        {/* Content */}
        {isLoading ? (
          <View style={styles.statusBlock}>
            <ActivityIndicator size="small" color={colors.text.accent} />
            <Text style={styles.statusText}>Loading guilds...</Text>
          </View>
        ) : error ? (
          <View style={styles.statusBlock}>
            <Text style={[styles.statusText, styles.errorText]}>
              Unable to load guilds. Pull to refresh.
            </Text>
          </View>
        ) : guildCount === 0 ? (
          <GuildEmptyState
            onCreatePress={handleCreatePress}
            onJoinPress={handleJoinPress}
          />
        ) : (
          <>
            <View style={styles.rowCard}>
              {guilds?.map((guild, index) => {
                const memberCount = guild.members.length;
                const memberLabel =
                  memberCount === 1 ? '1 member' : `${memberCount} members`;
                const subtitle = guild.tagline
                  ? `${guild.tagline} · ${memberLabel}`
                  : memberLabel;
                const isOwner = guild.owner.id === currentUserId;

                return (
                  <View
                    key={guild.id}
                    style={index > 0 ? styles.divider : null}
                  >
                    <ListItem
                      testID="guild-row"
                      title={guild.name}
                      subtitle={subtitle}
                      leading={<GuildRowIcon icon={guild.icon} />}
                      trailing={
                        isOwner ? (
                          <View testID="owner-badge">
                            <Badge tone="neutral">Owner</Badge>
                          </View>
                        ) : undefined
                      }
                      onPress={() => handleGuildPress(guild.id)}
                      accessibilityLabel={GUILD_A11Y.GUILD_CARD(
                        guild.name,
                        memberCount
                      )}
                    />
                  </View>
                );
              })}
            </View>

            {/* Join with code link */}
            <Pressable
              testID="join-with-code-link"
              onPress={handleJoinPress}
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel="Join a guild with invite code"
              style={styles.joinLink}
            >
              <Text style={styles.joinLinkText}>Join with a code</Text>
            </Pressable>
          </>
        )}
      </View>

      {/* Join Guild Modal */}
      <JoinGuildModal
        visible={isJoinModalOpen}
        onClose={closeJoinModal}
        onSubmit={handleJoinSubmit}
        isLoading={joinGuildMutation.isPending}
        error={
          joinGuildMutation.error
            ? mapJoinGuildError(joinGuildMutation.error)
            : undefined
        }
      />
    </>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginHorizontal: spacing[4],
    marginTop: spacing[6],
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing[2],
  },
  rowCard: {
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
  statusBlock: {
    alignItems: 'center',
    paddingVertical: spacing[8],
    gap: spacing[2],
  },
  statusText: {
    fontSize: 14,
    color: colors.text.secondary,
  },
  errorText: {
    color: colors.status.danger,
  },
  joinLink: {
    alignItems: 'center',
    paddingVertical: spacing[2],
    marginTop: spacing[2],
  },
  joinLinkText: {
    fontSize: 14,
    color: colors.text.accent,
    textDecorationLine: 'underline',
  },
});
