import { useRouter } from 'expo-router';
import { ArrowLeft, Info, Users } from 'lucide-react-native';
import { usePostHog } from 'posthog-react-native';
import React, { useEffect, useState } from 'react';

import { cooperativeQuestApi } from '@/api/cooperative-quest';
import { CombinedQuestInput } from '@/components/QuestForm/combined-quest-input';
import { FriendSelector } from '@/components/QuestForm/friend-selector';
import { GuildSelector } from '@/components/QuestForm/guild-selector';
import type { Guild } from '@/features/guilds';
import {
  Button,
  FocusAwareStatusBar,
  ScrollView,
  showErrorMessage,
  Text,
  TouchableOpacity,
  View,
} from '@/components/ui';
import colors from '@/components/ui/colors';
import { useCooperativeLobbyStore } from '@/store/cooperative-lobby-store';
import { useUserStore } from '@/store/user-store';

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
    <View className="flex-1 bg-background">
      <FocusAwareStatusBar />

      {/* Header */}
      <View className="mb-4 mt-2 px-4">
        <TouchableOpacity
          onPress={() => router.back()}
          className="mb-4 flex-row items-center"
        >
          <ArrowLeft size={24} color={colors.white} />
          <Text className="ml-2 text-lg text-white">Back</Text>
        </TouchableOpacity>

        <Text className="mb-2 text-3xl font-bold text-white">Create Quest</Text>
        <Text style={{ color: colors.neutral[200] }}>
          Start a cooperative quest and invite friends or your guild
        </Text>
      </View>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        <View className="p-5">
          {/* Info Card */}
          <View className="mb-6 rounded-lg bg-primary-100 p-4">
            <View className="flex-row items-start">
              <Info size={20} color="#7C3AED" style={{ marginTop: 2 }} />
              <View className="ml-3 flex-1">
                <Text className="text-primary-600 mb-1 font-semibold">
                  Team Challenge
                </Text>
                <Text className="text-primary-600 text-sm">
                  All participants must keep their phones locked for the entire
                  duration. If anyone unlocks early, everyone fails together!
                </Text>
              </View>
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
          <View className="mt-6">
            <Text className="mb-3 text-lg font-semibold text-white">
              Invite Participants
            </Text>

            {/* Toggle Tabs */}
            <View
              className="mb-4 flex-row rounded-lg p-1"
              style={{ backgroundColor: colors.neutral[500] }}
            >
              <TouchableOpacity
                testID="coop-mode-friends-button"
                onPress={() => handleModeChange('friends')}
                className="flex-1 rounded-md py-2"
                style={{
                  backgroundColor:
                    inviteMode === 'friends'
                      ? colors.primary[400]
                      : 'transparent',
                }}
              >
                <Text
                  className="text-center font-semibold"
                  style={{
                    color:
                      inviteMode === 'friends'
                        ? colors.white
                        : colors.neutral[200],
                  }}
                >
                  Friends
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                testID="coop-mode-guild-button"
                onPress={() => handleModeChange('guild')}
                className="flex-1 rounded-md py-2"
                style={{
                  backgroundColor:
                    inviteMode === 'guild'
                      ? colors.primary[400]
                      : 'transparent',
                }}
              >
                <Text
                  className="text-center font-semibold"
                  style={{
                    color:
                      inviteMode === 'guild'
                        ? colors.white
                        : colors.neutral[200],
                  }}
                >
                  Guild
                </Text>
              </TouchableOpacity>
            </View>

            {/* Mode-specific selector */}
            {inviteMode === 'friends' ? (
              <View>
                <Text
                  className="mb-4 text-sm"
                  style={{ color: colors.neutral[200] }}
                >
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
                <Text
                  className="mb-4 text-sm"
                  style={{ color: colors.neutral[200] }}
                >
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
            <View className="mt-4 flex-row items-center">
              <Users size={20} color={colors.neutral[200]} />
              <Text
                className="ml-2 text-sm"
                style={{ color: colors.neutral[200] }}
              >
                {inviteeIds.length} participant
                {inviteeIds.length !== 1 ? 's' : ''} will be invited
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Create Button */}
      <View className="border-t border-neutral-200 p-5">
        <Button
          label={isCreating ? 'Creating...' : 'Create Quest'}
          onPress={handleCreate}
          disabled={!canCreate || isCreating}
          className={`rounded-lg ${canCreate && !isCreating ? 'bg-primary-400' : 'bg-neutral-300'}`}
          textClassName="text-white font-bold text-lg"
        />
      </View>
    </View>
  );
}
