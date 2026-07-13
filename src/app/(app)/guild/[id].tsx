/**
 * Guild Detail Screen
 *
 * Displays detailed information about a specific guild — crest, stats,
 * members, and invite/edit management for owners. Recomposed onto the
 * Emberglow design system (see
 * `.claude/skills/emberglow-design/missing-screens/guild-screens.jsx`).
 */

import { useLocalSearchParams, useRouter } from 'expo-router';
import { CloudOff, Pencil, Share2, UserPlus } from 'lucide-react-native';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  Share,
  StyleSheet,
} from 'react-native';

import { getCharacterAvatar } from '@/app/utils/character-utils';
import {
  Badge,
  BottomSheet,
  Button,
  EyebrowLabel,
  Input,
  useEmberglowBottomSheet,
} from '@/components/emberglow';
import {
  FocusAwareStatusBar,
  ScreenContainer,
  ScreenHeader,
  Text,
  View,
} from '@/components/ui';
import { GuildIcon } from '@/features/guilds/components/guild-icon';
import { GuildIconSelector } from '@/features/guilds/components/guild-icon-selector';
import { DEFAULT_GUILD_ICON } from '@/features/guilds/constants/guild-icons';
import {
  GUILD_BUTTONS,
  GUILD_LIMITS,
  GUILD_TITLES,
} from '@/features/guilds/constants/guild-strings';
import {
  useGenerateInviteCode,
  useGuild,
  useUpdateGuild,
} from '@/features/guilds/hooks';
import type { GuildIcon as GuildIconType } from '@/features/guilds/types/guild-types';
import { useUserStore } from '@/store/user-store';
import {
  colors,
  fontFamily,
  palette,
  radii,
  shadows,
  spacing,
  tracking,
  withAlpha,
} from '@/theme';

const CREST_SIZE = 76;

// Erstoria's ascenders clip against the brand's tight 1.12 display leading in
// RN — bump to 1.15, matching the established fix in screen-header/quest-card.
const ERSTORIA_LEADING = 1.15;

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

  const [refreshing, setRefreshing] = useState(false);
  const [showInviteCode, setShowInviteCode] = useState(false);

  // Edit mode state
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editTagline, setEditTagline] = useState('');
  const [editIcon, setEditIcon] = useState<GuildIconType>(DEFAULT_GUILD_ICON);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Icon picker bottom sheet
  const iconSheet = useEmberglowBottomSheet();

  const generateInviteCodeMutation = useGenerateInviteCode();
  const updateGuildMutation = useUpdateGuild();

  const isOwner = guild?.owner.id === currentUser?.id;

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const handleBack = () => {
    // Navigate explicitly to profile since router.back() can behave
    // unexpectedly with tab navigation
    router.navigate('/profile');
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
      setValidationError('A guild needs a name.');
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

  // Handle icon selection from the bottom sheet
  const handleIconSelect = useCallback(
    (icon: GuildIconType) => {
      setEditIcon(icon);
      iconSheet.dismiss();
    },
    [iconSheet]
  );

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
          message: `Join my guild "${guild.name}" on Emberglow! Use invite code: ${guild.inviteCode}`,
        });
      } catch (error) {
        // User cancelled or share failed
      }
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <View style={styles.screenRoot}>
        <FocusAwareStatusBar />
        <ScreenHeader title="Guild" showBackButton onBackPress={handleBack} />
        <View testID="guild-loading" style={styles.centerFill}>
          <ActivityIndicator size="large" color={colors.text.accent} />
          <Text style={styles.centerMutedText}>Gathering the guild…</Text>
        </View>
      </View>
    );
  }

  // Error state
  if (error || !guild) {
    return (
      <View style={styles.screenRoot}>
        <FocusAwareStatusBar />
        <ScreenHeader title="Guild" showBackButton onBackPress={handleBack} />
        <View style={styles.errorFill}>
          <View style={styles.errorIconCircle}>
            <CloudOff size={32} color={colors.tints.aegean60} />
          </View>
          <View style={styles.errorTextGroup}>
            <Text style={styles.errorTitle}>
              The guild hall is out of reach
            </Text>
            <Text style={styles.errorBody}>
              We couldn't load this guild. Check your connection and try again.
            </Text>
          </View>
          <Button
            variant="secondary"
            label="Try again"
            onPress={() => refetch()}
          />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.screenRoot}>
      <FocusAwareStatusBar />
      <ScreenHeader
        title={isEditing ? 'Edit guild' : 'Guild'}
        showBackButton
        onBackPress={isEditing ? handleCancelEdit : handleBack}
      />

      {isEditing ? (
        <ScreenContainer>
          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.editScroll}
          >
            {/* Tappable crest */}
            <View style={styles.editCrestRow}>
              <GuildCrest
                icon={editIcon}
                editable
                onPress={() => iconSheet.present()}
              />
            </View>

            {/* Name */}
            <View style={styles.editField}>
              <Input
                testID="edit-name-input"
                label="Guild name"
                value={editName}
                onChangeText={(text) => {
                  setEditName(text);
                  if (validationError) setValidationError(null);
                }}
                placeholder="Name your guild"
                autoCapitalize="words"
                maxLength={GUILD_LIMITS.MAX_NAME_LENGTH}
              />
              {validationError && (
                <Text style={styles.validationErrorText}>
                  {validationError}
                </Text>
              )}
            </View>

            {/* Tagline */}
            <Input
              testID="edit-tagline-input"
              label="Tagline"
              hint="Optional · shown to invited friends"
              value={editTagline}
              onChangeText={setEditTagline}
              placeholder="What do you stand for?"
              autoCapitalize="sentences"
              maxLength={GUILD_LIMITS.MAX_TAGLINE_LENGTH}
            />
          </ScrollView>

          {/* Pinned actions */}
          <View style={styles.editActions}>
            <Button
              testID="save-edit-button"
              variant="primary"
              size="lg"
              fullWidth
              label="Save changes"
              onPress={handleSaveEdit}
              disabled={updateGuildMutation.isPending}
            >
              {updateGuildMutation.isPending ? (
                <ActivityIndicator color={colors.text.onAccent} />
              ) : undefined}
            </Button>
            <Button
              testID="cancel-edit-button"
              variant="ghost"
              size="lg"
              fullWidth
              label="Cancel"
              onPress={handleCancelEdit}
            />
          </View>
        </ScreenContainer>
      ) : (
        <ScreenContainer>
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.viewScroll}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                colors={[colors.text.accent]}
                tintColor={colors.text.accent}
              />
            }
          >
            {/* Header: crest + name/tagline */}
            <View style={styles.identityRow}>
              <GuildCrest icon={guild.icon} />
              <View style={styles.identityText}>
                <View style={styles.nameRow}>
                  <Text style={styles.guildName}>{guild.name}</Text>
                  {isOwner && <Badge tone="warm">Owner</Badge>}
                </View>
                {guild.tagline ? (
                  <Text style={styles.tagline}>{guild.tagline}</Text>
                ) : null}
              </View>
            </View>

            {/* Edit guild (owner) */}
            {isOwner && (
              <Button
                testID="edit-guild-button"
                variant="outline"
                fullWidth
                onPress={handleEditPress}
                accessibilityLabel="Edit guild"
              >
                <Pencil size={15} color={colors.text.primary} />
                <Text style={styles.outlineButtonLabel}>Edit guild</Text>
              </Button>
            )}

            {/* Invite code */}
            {showInviteCode && guild.inviteCode && (
              <View style={styles.inviteBlock}>
                <EyebrowLabel tone="warm" style={styles.inviteEyebrow}>
                  Invite code
                </EyebrowLabel>
                <View style={styles.inviteCodeRow}>
                  <Text style={styles.inviteCode}>{guild.inviteCode}</Text>
                  <Button
                    testID="share-invite-code"
                    variant="secondary"
                    size="sm"
                    onPress={handleShareCode}
                    accessibilityLabel="Share invite code"
                  >
                    <Share2 size={14} color={colors.text.primary} />
                    <Text style={styles.secondaryButtonLabel}>Share</Text>
                  </Button>
                </View>
                <Text style={styles.inviteHint}>
                  Anyone with this code can join while seats remain.
                </Text>
              </View>
            )}

            {/* Stats */}
            <View style={styles.statsGrid}>
              <View style={styles.statTile}>
                <Text style={styles.statNumber}>{guild.stats.questCount}</Text>
                <Text style={styles.statLabel}>Quests</Text>
              </View>
              <View style={styles.statTile}>
                <Text style={styles.statNumber}>
                  {guild.stats.totalMinutes}
                </Text>
                <Text style={styles.statLabel}>Minutes offline</Text>
              </View>
            </View>

            {/* Members */}
            <View style={styles.membersCard}>
              <View style={styles.membersHeader}>
                <View style={styles.membersHeaderTitle}>
                  <Text style={styles.membersTitle}>
                    {GUILD_TITLES.MEMBERS_TITLE}
                  </Text>
                  <Text style={styles.membersCount}>
                    {' · '}
                    {guild.members.length}/{GUILD_LIMITS.MAX_MEMBERS_PER_GUILD}
                  </Text>
                </View>
                {isOwner && (
                  <Pressable
                    testID="invite-members-button"
                    onPress={handleInvitePress}
                    disabled={generateInviteCodeMutation.isPending}
                    style={styles.inviteLink}
                    accessibilityLabel="Invite members to guild"
                    accessibilityRole="button"
                  >
                    {generateInviteCodeMutation.isPending ? (
                      <ActivityIndicator
                        size="small"
                        color={colors.text.accent}
                      />
                    ) : (
                      <>
                        <UserPlus size={15} color={colors.text.accent} />
                        <Text style={styles.inviteLinkText}>
                          {GUILD_BUTTONS.INVITE}
                        </Text>
                      </>
                    )}
                  </Pressable>
                )}
              </View>

              {guild.members.map((member, index) => {
                const isCurrentUser = member.id === currentUser?.id;
                const isMemberOwner = member.id === guild.owner.id;
                const displayName = member.character?.name ?? 'Adventurer';

                return (
                  <View
                    key={member.id}
                    style={[
                      styles.memberRow,
                      index > 0 && styles.memberDivider,
                    ]}
                  >
                    <Image
                      source={getCharacterAvatar(member.character?.type)}
                      style={styles.memberAvatar}
                    />
                    <Text style={styles.memberName}>
                      {displayName}
                      {isCurrentUser && (
                        <Text style={styles.memberYou}> (You)</Text>
                      )}
                    </Text>
                    {isMemberOwner && <Badge tone="warm">Owner</Badge>}
                  </View>
                );
              })}
            </View>
          </ScrollView>
        </ScreenContainer>
      )}

      {/* Icon picker bottom sheet */}
      <BottomSheet ref={iconSheet.ref} title="Choose a crest">
        <GuildIconSelector selected={editIcon} onSelect={handleIconSelect} />
      </BottomSheet>
    </View>
  );
}

/**
 * Ember-ringed circular guild crest. Editable variant is pressable and
 * shows a pencil badge for the edit flow's icon picker.
 */
function GuildCrest({
  icon,
  editable = false,
  onPress,
}: {
  icon: GuildIconType;
  editable?: boolean;
  onPress?: () => void;
}) {
  const circle = (
    <View style={styles.crestCircle}>
      <GuildIcon
        icon={icon}
        size={Math.round(CREST_SIZE * 0.42)}
        color={colors.text.accent}
      />
      {editable && (
        <View style={styles.crestPencil}>
          <Pencil size={13} color={colors.text.primary} />
        </View>
      )}
    </View>
  );

  if (!editable) return circle;

  return (
    <Pressable
      testID="edit-icon-button"
      onPress={onPress}
      accessibilityLabel="Change guild icon"
      accessibilityRole="button"
    >
      {circle}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  // Flat canvas behind the ScreenHeader band, matching ScreenContainer below.
  screenRoot: {
    flex: 1,
    backgroundColor: colors.surface.app,
  },

  // --- Loading ---
  centerFill: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[4],
  },
  centerMutedText: {
    fontSize: 14,
    color: colors.text.muted,
  },

  // --- Error ---
  errorFill: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing[10],
    gap: spacing[5],
  },
  errorIconCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface.raised,
    borderWidth: 1,
    borderColor: colors.border.subtle,
  },
  errorTextGroup: {
    alignItems: 'center',
    gap: spacing[2],
  },
  errorTitle: {
    fontFamily: fontFamily.display,
    fontSize: 24,
    lineHeight: 24 * ERSTORIA_LEADING,
    color: colors.text.primary,
    textAlign: 'center',
  },
  errorBody: {
    fontSize: 15,
    lineHeight: 22,
    color: colors.text.secondary,
    textAlign: 'center',
  },

  // --- View mode ---
  viewScroll: {
    paddingHorizontal: spacing[5],
    paddingTop: spacing[3],
    paddingBottom: spacing[8],
    gap: spacing[4],
  },
  identityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[4],
  },
  identityText: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    flexWrap: 'wrap',
  },
  guildName: {
    fontFamily: fontFamily.display,
    fontSize: 26,
    lineHeight: 26 * ERSTORIA_LEADING,
    color: colors.text.primary,
  },
  tagline: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.text.secondary,
    marginTop: spacing[1],
  },

  // Crest
  crestCircle: {
    width: CREST_SIZE,
    height: CREST_SIZE,
    borderRadius: CREST_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: withAlpha(palette.cinnabar, 0.14),
    borderWidth: 1,
    borderColor: withAlpha(palette.cinnabar, 0.45),
    ...shadows.glowEmber,
  },
  crestPencil: {
    position: 'absolute',
    right: -4,
    bottom: -4,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface.raised,
    borderWidth: 1,
    borderColor: colors.border.subtle,
  },

  // Button custom-child labels
  outlineButtonLabel: {
    fontFamily: fontFamily.semibold,
    fontSize: 16,
    color: colors.text.primary,
  },
  secondaryButtonLabel: {
    fontFamily: fontFamily.semibold,
    fontSize: 14,
    color: colors.text.primary,
  },

  // Invite code
  inviteBlock: {
    backgroundColor: withAlpha(palette.cinnabar, 0.1),
    borderWidth: 1,
    borderColor: withAlpha(palette.cinnabar, 0.4),
    borderRadius: radii.lg,
    padding: spacing[4],
    gap: spacing[2],
  },
  inviteEyebrow: {
    marginBottom: spacing[1],
  },
  inviteCodeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
  },
  inviteCode: {
    flex: 1,
    fontFamily: fontFamily.display,
    fontSize: 26,
    lineHeight: 26 * ERSTORIA_LEADING,
    letterSpacing: 26 * tracking.wide,
    color: colors.text.primary,
  },
  inviteHint: {
    fontSize: 13,
    color: colors.text.muted,
  },

  // Stats
  statsGrid: {
    flexDirection: 'row',
    gap: spacing[3],
  },
  statTile: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: colors.surface.raised,
    borderWidth: 1,
    borderColor: colors.border.hairline,
    borderRadius: radii.md,
    paddingVertical: spacing[4],
    paddingHorizontal: spacing[2],
  },
  statNumber: {
    fontFamily: fontFamily.display,
    fontSize: 24,
    lineHeight: 24 * ERSTORIA_LEADING,
    color: colors.text.primary,
  },
  statLabel: {
    fontFamily: fontFamily.semibold,
    fontSize: 11.5,
    letterSpacing: 11.5 * tracking.wide,
    textTransform: 'uppercase',
    color: colors.text.muted,
    marginTop: spacing[1],
  },

  // Members
  membersCard: {
    backgroundColor: colors.surface.raised,
    borderWidth: 1,
    borderColor: colors.border.hairline,
    borderRadius: radii.lg,
    overflow: 'hidden',
  },
  membersHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[4],
    borderBottomWidth: 1,
    borderBottomColor: colors.border.hairline,
  },
  membersHeaderTitle: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  membersTitle: {
    fontFamily: fontFamily.semibold,
    fontSize: 15,
    color: colors.text.primary,
  },
  membersCount: {
    fontSize: 15,
    color: colors.text.muted,
  },
  inviteLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  inviteLinkText: {
    fontFamily: fontFamily.semibold,
    fontSize: 14,
    color: colors.text.accent,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[4],
  },
  memberDivider: {
    borderTopWidth: 1,
    borderTopColor: colors.border.hairline,
  },
  memberAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border.hairline,
  },
  memberName: {
    flex: 1,
    fontSize: 15,
    color: colors.text.primary,
  },
  memberYou: {
    color: colors.text.muted,
  },

  // --- Edit mode ---
  editScroll: {
    paddingHorizontal: spacing[5],
    paddingTop: spacing[4],
    gap: spacing[5],
  },
  editCrestRow: {
    alignItems: 'center',
    paddingTop: spacing[2],
    paddingBottom: spacing[1],
  },
  editField: {
    gap: 0,
  },
  validationErrorText: {
    marginTop: spacing[2],
    fontSize: 13,
    color: colors.tints.cinnabar80,
  },
  editActions: {
    paddingHorizontal: spacing[5],
    paddingBottom: spacing[8],
    paddingTop: spacing[2],
    gap: spacing[2],
  },
});
