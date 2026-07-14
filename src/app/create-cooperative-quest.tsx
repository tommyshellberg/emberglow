import { useRouter } from 'expo-router';
import { ArrowLeft, Info, Users } from 'lucide-react-native';
import { usePostHog } from 'posthog-react-native';
import React, { useEffect, useState } from 'react';
import { StyleSheet } from 'react-native';

import { cooperativeQuestApi } from '@/api/cooperative-quest';
import { Button } from '@/components/emberglow';
import { CombinedQuestInput } from '@/components/QuestForm/combined-quest-input';
import { FriendSelector } from '@/components/QuestForm/friend-selector';
import { GuildSelector } from '@/components/QuestForm/guild-selector';
import {
  FocusAwareStatusBar,
  ScrollView,
  showErrorMessage,
  Text,
  TouchableOpacity,
  View,
} from '@/components/ui';
import type { Guild } from '@/features/guilds';
import { useCooperativeLobbyStore } from '@/store/cooperative-lobby-store';
import { useUserStore } from '@/store/user-store';
import { colors, fontFamily, radii, spacing } from '@/theme';

type InviteMode = 'friends' | 'guild';

export default function CreateCooperativeQuestScreen() {
  const router = useRouter();
  const [questName, setQuestName] = useState('');
  const [questDuration, setQuestDuration] = useState(30);
  const [inviteMode, setInviteMode] = useState<InviteMode>('friends');

  // Friends mode state
  const [selectedFriends, setSelectedFriends] = useState<string[]>([]);
  const [selectedFriendData, setSelectedFriendData] = useState<any[]>([]);

  // Guild mode state
  const [selectedGuild, setSelectedGuild] = useState<Guild | null>(null);
  const [guildMemberIds, setGuildMemberIds] = useState<string[]>([]);

  const [isCreating, setIsCreating] = useState(false);
  const posthog = usePostHog();
  const createLobby = useCooperativeLobbyStore((state) => state.createLobby);
  const leaveLobby = useCooperativeLobbyStore((state) => state.leaveLobby);
  const currentUser = useUserStore((state) => state.user);

  useEffect(() => {
    posthog.capture('open_create_cooperative_quest_screen');
    // Clear any existing lobby state when opening create screen
    leaveLobby();
  }, [posthog]);

  // Handle mode switching - clear the other selection
  const handleModeChange = (mode: InviteMode) => {
    if (mode === inviteMode) return;

    setInviteMode(mode);
    if (mode === 'friends') {
      // Switching to friends mode - clear guild selection
      setSelectedGuild(null);
      setGuildMemberIds([]);
    } else {
      // Switching to guild mode - clear friend selection
      setSelectedFriends([]);
      setSelectedFriendData([]);
    }
  };

  // Get invitee IDs based on current mode
  const getInviteeIds = (): string[] => {
    if (inviteMode === 'friends') {
      return selectedFriends;
    }
    return guildMemberIds;
  };

  const inviteeIds = getInviteeIds();
  const canCreate = questName.trim().length > 0 && inviteeIds.length > 0;

  const handleCreate = async () => {
    if (!canCreate || !currentUser) return;

    setIsCreating(true);
    posthog.capture('trigger_create_cooperative_quest', {
      inviteMode,
      inviteeCount: inviteeIds.length,
    });

    try {
      // Call the new API endpoint to initialize the cooperative quest
      const response = await cooperativeQuestApi.initializeCooperativeQuest({
        title: questName.trim(),
        duration: questDuration,
        inviteeIds,
        questData: {
          category: 'cooperative',
        },
      });

      // Build participants list based on invite mode
      const invitedParticipants = inviteeIds.map((inviteeId) => {
        if (inviteMode === 'friends') {
          const friendData = selectedFriendData.find(
            (f) =>
              f._id === inviteeId ||
              f.userId === inviteeId ||
              f.id === inviteeId
          );
          return {
            id: inviteeId,
            username:
              friendData?.character?.name ||
              friendData?.displayName ||
              'Friend',
            invitationStatus: 'pending' as const,
            isReady: false,
            isCreator: false,
          };
        } else {
          // Guild mode
          const member = selectedGuild?.members.find((m) => m.id === inviteeId);
          return {
            id: inviteeId,
            username: member?.character?.name || 'Guildmate',
            invitationStatus: 'pending' as const,
            isReady: false,
            isCreator: false,
          };
        }
      });

      // Create the lobby in local state
      const lobby = {
        lobbyId: response.lobbyId,
        questTitle: questName.trim(),
        questDuration: questDuration,
        creatorId: currentUser.id,
        participants: [
          {
            id: currentUser.id,
            // Server may return the legacy nested character.name format
            // (see hasNestedCharacter handling in lib/auth/index.tsx);
            // `User` only models the flat `name` field.
            username:
              (currentUser as any).character?.name || currentUser.name || 'You',
            invitationStatus: 'accepted' as const,
            isReady: false,
            isCreator: true,
            joinedAt: new Date(),
          },
          ...invitedParticipants,
        ],
        status: 'waiting' as const,
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes
        questData: {
          title: questName.trim(),
          duration: questDuration,
          category: 'social',
        },
      };

      createLobby(lobby);
      posthog.capture('cooperative_quest_invitation_created');

      // Navigate to the lobby
      router.replace(`/cooperative-quest-lobby/${response.lobbyId}`);
    } catch (error) {
      console.error('Error creating cooperative quest:', error);
      showErrorMessage('Failed to create cooperative quest. Please try again.');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <View style={styles.root}>
      <FocusAwareStatusBar />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backRow}>
          <ArrowLeft size={24} color={colors.text.primary} />
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>

        <Text style={styles.title}>Create Quest</Text>
        <Text style={styles.subtitle}>
          Start a cooperative quest and invite friends or your guild
        </Text>
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.body}>
          {/* Info Card */}
          <View style={styles.infoCard}>
            <Info
              size={20}
              color={colors.text.accent}
              style={styles.infoCardIcon}
            />
            <View style={styles.infoCardBody}>
              <Text style={styles.infoCardTitle}>Team Challenge</Text>
              <Text style={styles.infoCardText}>
                All participants must keep their phones locked for the entire
                duration. If anyone unlocks early, everyone fails together!
              </Text>
            </View>
          </View>

          {/* Quest Name and Duration */}
          <CombinedQuestInput
            initialQuestName={questName}
            initialDuration={questDuration}
            onQuestNameChange={setQuestName}
            onDurationChange={setQuestDuration}
          />

          {/* Invite Mode Toggle */}
          <View style={styles.inviteSection}>
            <Text style={styles.sectionTitle}>Invite Participants</Text>

            {/* Toggle Tabs — no Emberglow segmented-control equivalent
                (ground rule 4); hand-rolled tabs retinted from theme tokens. */}
            <View style={styles.toggleTrack}>
              <TouchableOpacity
                onPress={() => handleModeChange('friends')}
                style={[
                  styles.toggleTab,
                  inviteMode === 'friends' && styles.toggleTabActive,
                ]}
              >
                <Text
                  style={[
                    styles.toggleText,
                    inviteMode === 'friends' && styles.toggleTextActive,
                  ]}
                >
                  Friends
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => handleModeChange('guild')}
                style={[
                  styles.toggleTab,
                  inviteMode === 'guild' && styles.toggleTabActive,
                ]}
              >
                <Text
                  style={[
                    styles.toggleText,
                    inviteMode === 'guild' && styles.toggleTextActive,
                  ]}
                >
                  Guild
                </Text>
              </TouchableOpacity>
            </View>

            {/* Mode-specific selector */}
            {inviteMode === 'friends' ? (
              <View>
                <Text style={styles.selectorHint}>
                  Select friends to join your quest.
                </Text>
                <FriendSelector
                  onSelectionChange={(ids, friendData) => {
                    setSelectedFriends(ids);
                    setSelectedFriendData(friendData || []);
                  }}
                />
              </View>
            ) : (
              <View>
                <Text style={styles.selectorHint}>
                  Select a guild to invite all members.
                </Text>
                <GuildSelector
                  onSelectionChange={(guildIds, guilds, memberIds) => {
                    setSelectedGuild(guilds[0] || null);
                    setGuildMemberIds(memberIds);
                  }}
                  currentUserId={currentUser?.id}
                  maxSelections={1}
                />
              </View>
            )}
          </View>

          {/* Invitees Count */}
          {inviteeIds.length > 0 && (
            <View style={styles.countRow}>
              <Users size={20} color={colors.text.muted} />
              <Text style={styles.countText}>
                {inviteeIds.length} participant
                {inviteeIds.length !== 1 ? 's' : ''} will be invited
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Create Button */}
      <View style={styles.footer}>
        <Button
          label={isCreating ? 'Creating...' : 'Create Quest'}
          onPress={handleCreate}
          disabled={!canCreate || isCreating}
          variant="primary"
          size="lg"
          fullWidth
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.surface.app,
  },
  header: {
    marginTop: spacing[2],
    marginBottom: spacing[4],
    paddingHorizontal: spacing[4],
  },
  backRow: {
    marginBottom: spacing[4],
    flexDirection: 'row',
    alignItems: 'center',
  },
  backText: {
    marginLeft: spacing[2],
    fontFamily: fontFamily.regular,
    fontSize: 18,
    color: colors.text.primary,
  },
  title: {
    marginBottom: spacing[2],
    fontFamily: fontFamily.display,
    fontSize: 30,
    // Erstoria's default 1.12 leading still clips this display face's tall
    // ascenders in RN; other recomposed screens' Erstoria headings bump to
    // 1.15 to give them room (see emberglow/quest/quest-card.tsx's `title`).
    lineHeight: 30 * 1.15,
    color: colors.text.primary,
  },
  subtitle: {
    fontFamily: fontFamily.regular,
    color: colors.text.secondary,
  },
  scroll: {
    flex: 1,
  },
  body: {
    padding: spacing[5],
  },
  infoCard: {
    marginBottom: spacing[6],
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderRadius: radii.lg,
    backgroundColor: colors.surface.raised,
    borderWidth: 1,
    borderColor: colors.border.hairline,
    padding: spacing[4],
  },
  infoCardIcon: {
    marginTop: 2,
  },
  infoCardBody: {
    marginLeft: spacing[3],
    flex: 1,
  },
  infoCardTitle: {
    marginBottom: spacing[1],
    fontFamily: fontFamily.semibold,
    fontSize: 15,
    color: colors.text.accent,
  },
  infoCardText: {
    fontFamily: fontFamily.regular,
    fontSize: 13,
    lineHeight: 13 * 1.5,
    color: colors.text.secondary,
  },
  inviteSection: {
    marginTop: spacing[6],
  },
  sectionTitle: {
    marginBottom: spacing[3],
    fontFamily: fontFamily.semibold,
    fontSize: 18,
    color: colors.text.primary,
  },
  toggleTrack: {
    marginBottom: spacing[4],
    flexDirection: 'row',
    borderRadius: radii.pill,
    backgroundColor: colors.surface.inset,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    padding: 3,
  },
  toggleTab: {
    flex: 1,
    borderRadius: radii.pill,
    paddingVertical: spacing[2],
  },
  toggleTabActive: {
    backgroundColor: colors.accent.primary,
  },
  toggleText: {
    textAlign: 'center',
    fontFamily: fontFamily.semibold,
    fontSize: 15,
    color: colors.text.secondary,
  },
  toggleTextActive: {
    color: colors.text.onAccent,
  },
  selectorHint: {
    marginBottom: spacing[4],
    fontFamily: fontFamily.regular,
    fontSize: 14,
    color: colors.text.secondary,
  },
  countRow: {
    marginTop: spacing[4],
    flexDirection: 'row',
    alignItems: 'center',
  },
  countText: {
    marginLeft: spacing[2],
    fontFamily: fontFamily.regular,
    fontSize: 14,
    color: colors.text.muted,
  },
  footer: {
    borderTopWidth: 1,
    borderTopColor: colors.border.hairline,
    padding: spacing[5],
  },
});
