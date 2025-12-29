/**
 * Guild Detail Screen
 *
 * Displays detailed information about a specific guild including
 * members, stats, and management options for owners.
 */

import { Feather } from '@expo/vector-icons';
import { BottomSheetView } from '@gorhom/bottom-sheet';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  Share,
  TextInput,
} from 'react-native';

import { getCharacterAvatar } from '@/app/utils/character-utils';
import {
  Button,
  Card,
  FocusAwareStatusBar,
  ScreenContainer,
  ScreenHeader,
  Text,
  View,
} from '@/components/ui';
import colors from '@/components/ui/colors';
import { Modal, useModal } from '@/components/ui/modal';
import { GuildIcon } from '@/features/guilds/components/guild-icon';
import { GuildIconSelector } from '@/features/guilds/components/guild-icon-selector';
import {
  GUILD_BUTTONS,
  GUILD_LIMITS,
  GUILD_STATS_LABELS,
  GUILD_TITLES,
} from '@/features/guilds/constants/guild-strings';
import {
  useGenerateInviteCode,
  useGuild,
  useUpdateGuild,
} from '@/features/guilds/hooks';
import type { GuildIcon as GuildIconType } from '@/features/guilds/types/guild-types';
import { useUserStore } from '@/store/user-store';

export default function GuildDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const currentUser = useUserStore((state) => state.user);

  const {
    data: guild,
    isLoading,
    error,
    refetch,
  } = useGuild(id ?? '', { enabled: !!id });

  const [refreshing, setRefreshing] = React.useState(false);
  const [showInviteCode, setShowInviteCode] = useState(false);

  // Edit mode state
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editTagline, setEditTagline] = useState('');
  const [editIcon, setEditIcon] = useState<GuildIconType>('campfire');
  const [validationError, setValidationError] = useState<string | null>(null);

  // Icon selector modal
  const iconModal = useModal();

  const generateInviteCodeMutation = useGenerateInviteCode();
  const updateGuildMutation = useUpdateGuild();

  const isOwner = guild?.owner.id === currentUser?.id;

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const handleBack = () => {
    // Navigate explicitly to profile since router.back() can behave
    // unexpectedly with tab navigation
    router.navigate('/profile');
  };

  const handleSettingsPress = () => {
    // Will be implemented in future task
    // router.push(`/guild/${id}/settings`);
  };

  // Enter edit mode with current values
  const handleEditPress = useCallback(() => {
    if (!guild) return;
    setEditName(guild.name);
    setEditTagline(guild.tagline ?? '');
    setEditIcon(guild.icon);
    setValidationError(null);
    setIsEditing(true);
  }, [guild]);

  // Cancel editing and discard changes
  const handleCancelEdit = useCallback(() => {
    setIsEditing(false);
    setValidationError(null);
  }, []);

  // Save changes
  const handleSaveEdit = useCallback(async () => {
    if (!id || !guild) return;

    // Validate name
    if (!editName.trim()) {
      setValidationError('Guild name is required');
      return;
    }

    try {
      await updateGuildMutation.mutateAsync({
        guildId: id,
        data: {
          name: editName.trim(),
          tagline: editTagline.trim() || undefined,
          icon: editIcon,
        },
      });
      setIsEditing(false);
      setValidationError(null);
    } catch (error) {
      Alert.alert('Error', 'Failed to update guild. Please try again.');
    }
  }, [id, guild, editName, editTagline, editIcon, updateGuildMutation]);

  // Handle icon selection from modal
  const handleIconSelect = useCallback((icon: GuildIconType) => {
    setEditIcon(icon);
    iconModal.dismiss();
  }, [iconModal]);

  const handleInvitePress = async () => {
    if (!id) return;

    // If we already have a valid invite code, show it
    if (guild?.inviteCode) {
      setShowInviteCode(true);
      return;
    }

    // Otherwise generate a new one
    try {
      await generateInviteCodeMutation.mutateAsync(id);
      setShowInviteCode(true);
    } catch (error) {
      Alert.alert('Error', 'Failed to generate invite code. Please try again.');
    }
  };

  const handleShareCode = async () => {
    if (guild?.inviteCode) {
      try {
        await Share.share({
          message: `Join my guild "${guild.name}" on UnQuest! Use invite code: ${guild.inviteCode}`,
        });
      } catch (error) {
        // User cancelled or share failed
      }
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <View className="flex-1 bg-background">
        <FocusAwareStatusBar />
        <ScreenHeader title="" showBackButton onBackPress={handleBack} />
        <View
          testID="guild-loading"
          className="flex-1 items-center justify-center"
        >
          <ActivityIndicator size="large" color={colors.guild[300]} />
          <Text className="mt-4 text-neutral-200">Loading guild...</Text>
        </View>
      </View>
    );
  }

  // Error state
  if (error || !guild) {
    return (
      <View className="flex-1 bg-background">
        <FocusAwareStatusBar />
        <ScreenHeader title="" showBackButton onBackPress={handleBack} />
        <View className="flex-1 items-center justify-center px-8">
          <Feather name="alert-circle" size={48} color={colors.neutral[300]} />
          <Text className="mt-4 text-center text-neutral-200">
            Unable to load guild. Please try again.
          </Text>
          <Pressable
            onPress={() => refetch()}
            className="mt-6 rounded-lg bg-guild-300 px-6 py-3"
          >
            <Text className="font-semibold text-richBlack-500">Try Again</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background">
      <FocusAwareStatusBar />
      <ScreenHeader
        title="Guild"
        showBackButton
        onBackPress={handleBack}
        rightComponent={
          isOwner ? (
            <Pressable
              testID="guild-settings-button"
              onPress={handleSettingsPress}
              className="p-2"
              accessibilityLabel="Guild settings"
              accessibilityRole="button"
            >
              <Feather name="settings" size={22} color={colors.cream[500]} />
            </Pressable>
          ) : undefined
        }
      />

      <ScreenContainer>
        <ScrollView
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[colors.guild[300]]}
              tintColor={colors.guild[300]}
            />
          }
        >
          {/* Guild Header Card */}
          <Card className="mx-4 mt-4 p-4">
            {/* Edit button for owner */}
            {isOwner && !isEditing && (
              <Pressable
                testID="edit-guild-button"
                onPress={handleEditPress}
                className="absolute right-3 top-3 z-10 p-2"
                accessibilityLabel="Edit guild"
                accessibilityRole="button"
              >
                <Feather name="edit-2" size={18} color={colors.guild[300]} />
              </Pressable>
            )}

            {isEditing ? (
              // Edit mode
              <View>
                {/* Tappable Guild Icon - centered */}
                <View className="items-center mb-4">
                  <Pressable
                    testID="edit-icon-button"
                    onPress={() => iconModal.present()}
                    accessibilityLabel="Change guild icon"
                    accessibilityRole="button"
                  >
                    <GuildIcon icon={editIcon} size={48} showBackground />
                    <View className="absolute -bottom-1 -right-1 rounded-full bg-guild-300 p-1.5">
                      <Feather name="edit-2" size={10} color={colors.richBlack[500]} />
                    </View>
                  </Pressable>
                  <Text className="mt-2 text-xs text-guild-300">Tap to change</Text>
                </View>

                {/* Name Row */}
                <View className="flex-row items-center border-b border-neutral-400/20 py-3">
                  <Feather name="edit-3" size={18} color={colors.neutral[300]} />
                  <View className="ml-3 flex-1">
                    <TextInput
                      testID="edit-name-input"
                      value={editName}
                      onChangeText={(text) => {
                        setEditName(text);
                        if (validationError) setValidationError(null);
                      }}
                      placeholder="Guild name"
                      placeholderTextColor={colors.neutral[300]}
                      maxLength={50}
                      autoCapitalize="words"
                      className="text-lg font-semibold text-cream-500"
                      style={{ padding: 0 }}
                    />
                    <Text className="text-xs text-neutral-300">Name</Text>
                  </View>
                </View>

                {/* Validation Error */}
                {validationError && (
                  <Text className="mt-1 text-sm text-red-400">{validationError}</Text>
                )}

                {/* Tagline Row */}
                <View className="flex-row items-center py-3">
                  <Feather name="type" size={18} color={colors.neutral[300]} />
                  <View className="ml-3 flex-1">
                    <TextInput
                      testID="edit-tagline-input"
                      value={editTagline}
                      onChangeText={setEditTagline}
                      placeholder="Add a tagline..."
                      placeholderTextColor={colors.neutral[300]}
                      maxLength={100}
                      autoCapitalize="sentences"
                      className="text-base text-cream-500"
                      style={{ padding: 0 }}
                    />
                    <Text className="text-xs text-neutral-300">Tagline</Text>
                  </View>
                </View>

                {/* Save/Cancel Buttons */}
                <View className="mt-4 flex-row gap-3">
                  <Pressable
                    testID="cancel-edit-button"
                    onPress={handleCancelEdit}
                    className="flex-1 items-center rounded-lg bg-neutral-400/20 py-3"
                    accessibilityLabel="Cancel editing"
                    accessibilityRole="button"
                  >
                    <Text className="font-medium text-cream-500">Cancel</Text>
                  </Pressable>
                  <Pressable
                    testID="save-edit-button"
                    onPress={handleSaveEdit}
                    disabled={updateGuildMutation.isPending}
                    className="flex-1 flex-row items-center justify-center rounded-lg bg-guild-300 py-3"
                    accessibilityLabel="Save changes"
                    accessibilityRole="button"
                  >
                    {updateGuildMutation.isPending ? (
                      <ActivityIndicator size="small" color={colors.richBlack[500]} />
                    ) : (
                      <Text className="font-semibold text-richBlack-500">Save</Text>
                    )}
                  </Pressable>
                </View>
              </View>
            ) : (
              // View mode
              <View className="items-center">
                {/* Guild Icon */}
                <View className="mb-3">
                  <GuildIcon icon={guild.icon} size={48} showBackground />
                </View>

                {/* Guild Name */}
                <Text className="text-center text-2xl font-bold text-cream-500">
                  {guild.name}
                </Text>

                {/* Tagline */}
                {guild.tagline && (
                  <Text className="mt-1 text-center text-base text-neutral-200">
                    {guild.tagline}
                  </Text>
                )}

                {/* Owner Badge */}
                {isOwner && (
                  <View className="mt-2 rounded-full bg-guild-300/20 px-3 py-1">
                    <Text className="text-xs font-medium text-guild-300">
                      Owner
                    </Text>
                  </View>
                )}
              </View>
            )}
          </Card>

          {/* Stats Card */}
          <Card className="mx-4 mt-4 p-4">
            <Text className="mb-3 text-lg font-bold text-cream-500">
              {GUILD_TITLES.STATS_TITLE}
            </Text>
            <View className="flex-row justify-around">
              <View className="items-center">
                <Text className="text-3xl font-bold text-guild-300">
                  {guild.stats.questCount}
                </Text>
                <Text className="text-sm text-neutral-200">
                  {GUILD_STATS_LABELS.QUESTS}
                </Text>
              </View>
              <View className="items-center">
                <Text className="text-3xl font-bold text-guild-300">
                  {guild.stats.totalMinutes}
                </Text>
                <Text className="text-sm text-neutral-200">
                  {GUILD_STATS_LABELS.MINUTES}
                </Text>
              </View>
            </View>
          </Card>

          {/* Members Card */}
          <Card className="mx-4 mt-4 p-4">
            <View className="mb-3 flex-row items-center justify-between">
              <View className="flex-row items-center">
                <Text className="text-lg font-bold text-cream-500">
                  {GUILD_TITLES.MEMBERS_TITLE}
                </Text>
                <Text className="ml-2 text-sm text-neutral-200">
                  ({guild.members.length}/{GUILD_LIMITS.MAX_MEMBERS_PER_GUILD})
                </Text>
              </View>
              {isOwner && (
                <Pressable
                  testID="invite-members-button"
                  onPress={handleInvitePress}
                  disabled={generateInviteCodeMutation.isPending}
                  className="flex-row items-center rounded-lg bg-guild-300/20 px-3 py-1.5"
                  accessibilityLabel="Invite members to guild"
                  accessibilityRole="button"
                >
                  {generateInviteCodeMutation.isPending ? (
                    <ActivityIndicator size="small" color={colors.guild[300]} />
                  ) : (
                    <>
                      <Feather name="user-plus" size={14} color={colors.guild[300]} />
                      <Text className="ml-1.5 text-sm font-medium text-guild-300">
                        {GUILD_BUTTONS.INVITE}
                      </Text>
                    </>
                  )}
                </Pressable>
              )}
            </View>

            {/* Invite Code Section */}
            {showInviteCode && guild.inviteCode && (
              <View className="mb-4 rounded-lg bg-guild-300/10 p-3">
                <Text className="mb-2 text-center text-sm text-neutral-200">
                  Share this code with friends:
                </Text>
                <Text className="mb-3 text-center font-mono text-2xl font-bold tracking-widest text-guild-300">
                  {guild.inviteCode}
                </Text>
                <Pressable
                  testID="share-invite-code"
                  onPress={handleShareCode}
                  className="flex-row items-center justify-center rounded-lg bg-guild-300 px-4 py-2.5"
                  accessibilityLabel="Share invite code"
                  accessibilityRole="button"
                >
                  <Feather name="share" size={16} color={colors.richBlack[500]} />
                  <Text className="ml-2 text-sm font-medium text-richBlack-500">Share Code</Text>
                </Pressable>
              </View>
            )}

            {/* Member List */}
            <View className="gap-2">
              {guild.members.map((member) => {
                const isCurrentUser = member.id === currentUser?.id;
                const isMemberOwner = member.id === guild.owner.id;
                const displayName = member.character?.name ?? 'Adventurer';

                return (
                  <View
                    key={member.id}
                    className="flex-row items-center justify-between rounded-lg bg-neutral-400/20 p-3"
                  >
                    <View className="flex-row items-center">
                      <Image
                        source={getCharacterAvatar(member.character?.type)}
                        className="mr-3 size-10 rounded-full"
                      />
                      <View>
                        <Text className="font-medium text-cream-500">
                          {displayName}
                          {isCurrentUser && (
                            <Text className="text-neutral-200"> (You)</Text>
                          )}
                        </Text>
                        {isMemberOwner && (
                          <Text className="text-xs text-guild-300">Owner</Text>
                        )}
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>
          </Card>

          {/* Spacer at bottom */}
          <View className="h-8" />
        </ScrollView>
      </ScreenContainer>

      {/* Icon Selection Modal */}
      <Modal
        ref={iconModal.ref}
        snapPoints={['40%']}
        title="Choose Icon"
        backgroundStyle={{ backgroundColor: colors.background }}
      >
        <BottomSheetView className="flex-1 px-4 pb-8">
          <GuildIconSelector selected={editIcon} onSelect={handleIconSelect} />
        </BottomSheetView>
      </Modal>
    </View>
  );
}
