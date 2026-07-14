/**
 * Leaderboard Screen
 *
 * Displays competitive rankings for quests, minutes, and streaks.
 * Supports both friends and global scope with full accessibility.
 *
 * Refactored: 654 lines → 181 lines (72% reduction)
 */

import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet } from 'react-native';

import { useLeaderboardStats } from '@/api/stats';
import { Button } from '@/components/emberglow';
import {
  ContactsImportModal,
  type ContactsImportModalRef,
} from '@/components/profile/contact-import';
import {
  FocusAwareStatusBar,
  ScreenContainer,
  ScreenHeader,
  ScrollView,
  Text,
  View,
} from '@/components/ui';
import { EmptyStates } from '@/features/leaderboard/components/empty-states';
import { LeaderboardHeader } from '@/features/leaderboard/components/leaderboard-header';
import { LeaderboardItem } from '@/features/leaderboard/components/leaderboard-item';
import { LeaderboardTabs } from '@/features/leaderboard/components/leaderboard-tabs';
import { ScopeToggle } from '@/features/leaderboard/components/scope-toggle';
import {
  A11Y,
  type LeaderboardType,
  type ScopeType,
  STRINGS,
} from '@/features/leaderboard/constants/leaderboard-constants';
import { useLeaderboardData } from '@/features/leaderboard/hooks/use-leaderboard-data';
import { useFriendManagement } from '@/lib/hooks/use-friend-management';
import { useProfileData } from '@/lib/hooks/use-profile-data';
import { useCharacterStore } from '@/store/character-store';
import { useQuestStore } from '@/store/quest-store';
import { useUserStore } from '@/store/user-store';
import { colors, radii, shadows, spacing } from '@/theme';

export default function LeaderboardScreen() {
  const router = useRouter();
  const [selectedType, setSelectedType] = useState<LeaderboardType>('quests');
  const [scope, setScope] = useState<ScopeType>('global');
  const contactsModalRef = React.useRef<ContactsImportModalRef>(null);

  // Get user's data
  const { userEmail } = useProfileData();
  const { friendsData, isLoadingFriends, sendBulkInvites } =
    useFriendManagement(userEmail, contactsModalRef);

  // Get current user data from stores
  const currentUserId = useUserStore((state) => state.user?.id);
  const character = useCharacterStore((state) => state.character);
  const completedQuests = useQuestStore((state) => state.completedQuests);
  const dailyQuestStreak = useCharacterStore((state) => state.dailyQuestStreak);

  // Calculate total minutes from completed quests
  const totalMinutes = useMemo(() => {
    return completedQuests.reduce((total, quest) => {
      if (quest.startTime && quest.stopTime && quest.status === 'completed') {
        return total + Math.round((quest.stopTime - quest.startTime) / 60000);
      }
      return total;
    }, 0);
  }, [completedQuests]);

  // Fetch leaderboard data
  const {
    data: leaderboardStats,
    isLoading: isLoadingStats,
    error: statsError,
    refetch,
  } = useLeaderboardStats();

  // Transform data using hook
  const { leaderboardData, topUser, restOfUsers } = useLeaderboardData({
    leaderboardStats: leaderboardStats
      ? { ...leaderboardStats, friends: leaderboardStats.friends ?? undefined }
      : undefined,
    selectedType,
    scope,
    currentUserId,
    friendsData,
    character: character ?? undefined,
    completedQuests,
    totalMinutes,
    dailyQuestStreak,
  });

  // Check if user actually has friends
  const hasFriends =
    friendsData && friendsData.friends && friendsData.friends.length > 0;

  // Handle invite friends
  const handleInviteFriends = () => {
    contactsModalRef.current?.present();
  };

  // Handle retry
  const handleRetry = () => {
    refetch();
  };

  // Handle loading state
  if (isLoadingStats || isLoadingFriends) {
    return (
      <View className="flex-1 bg-neutral-100">
        <FocusAwareStatusBar />
        <ScreenContainer>
          <ScreenHeader
            title={STRINGS.title}
            subtitle={STRINGS.subtitle}
            showBackButton
            onBackPress={() => router.push('/profile' as any)}
          />
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" color={colors.accent.primary} />
            <Text className="mt-2" style={{ color: colors.text.secondary }}>
              {STRINGS.loadingMessage}
            </Text>
          </View>
        </ScreenContainer>
      </View>
    );
  }

  // Handle error state
  if (statsError) {
    return (
      <View className="flex-1">
        <FocusAwareStatusBar />
        <ScreenContainer>
          <ScreenHeader
            title={STRINGS.title}
            subtitle={STRINGS.subtitle}
            showBackButton
            onBackPress={() => router.push('/profile' as any)}
          />
          <View className="flex-1 items-center justify-center px-4">
            <Text
              className="text-center"
              style={{ color: colors.text.secondary }}
            >
              {STRINGS.errorTitle}
            </Text>
            <View
              accessible
              accessibilityRole="button"
              accessibilityLabel={A11Y.labelRetry}
            >
              <Button
                label={STRINGS.errorRetryButton}
                variant="ghost"
                onPress={handleRetry}
                style={styles.retryButton}
              />
            </View>
          </View>
        </ScreenContainer>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-neutral-100">
      <FocusAwareStatusBar />

      <ScreenContainer>
        {/* Header */}
        <ScreenHeader
          title={STRINGS.title}
          subtitle={STRINGS.subtitle}
          showBackButton
          onBackPress={() => router.push('/profile')}
        />

        {/* Scope Toggle */}
        <ScopeToggle scope={scope} onScopeChange={setScope} />

        {/* Type Tabs */}
        <LeaderboardTabs
          selectedType={selectedType}
          onTypeChange={setSelectedType}
        />

        <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
          {/* Empty state: needs sign in for friends */}
          {scope === 'friends' && !leaderboardStats?.friends ? (
            <EmptyStates
              scope={scope}
              type={selectedType}
              hasFriends={!!hasFriends}
              hasLeaderboardData={false}
              onInviteFriends={handleInviteFriends}
            />
          ) : leaderboardData.length === 0 ? (
            /* Empty state: no data */
            <EmptyStates
              scope={scope}
              type={selectedType}
              hasFriends={!!hasFriends}
              hasLeaderboardData={false}
              onInviteFriends={handleInviteFriends}
            />
          ) : (
            <>
              {/* Top User Highlight */}
              {topUser && (
                <LeaderboardHeader topUser={topUser} type={selectedType} />
              )}

              {/* Leaderboard List */}
              {restOfUsers.length > 0 && (
                <View style={styles.listCard}>
                  {restOfUsers.map((entry, index) => (
                    <React.Fragment key={entry.userId}>
                      {/* Separator for current user when not in top 10 */}
                      {entry.isSeparated && index > 0 && (
                        <View style={styles.separatorRow}>
                          <Text style={styles.separatorText}>
                            {STRINGS.separator}
                          </Text>
                        </View>
                      )}

                      {/* Leaderboard Item */}
                      <LeaderboardItem entry={entry} type={selectedType} />

                      {/* Divider (skip if next entry is separated) */}
                      {index < restOfUsers.length - 1 &&
                        !restOfUsers[index + 1]?.isSeparated && (
                          <View style={styles.divider} />
                        )}
                    </React.Fragment>
                  ))}
                </View>
              )}

              {/* Invite Friends Button (Friends scope only) */}
              {scope === 'friends' && (
                <EmptyStates
                  scope={scope}
                  type={selectedType}
                  hasFriends={!!hasFriends}
                  hasLeaderboardData={leaderboardData.length > 0}
                  onInviteFriends={handleInviteFriends}
                />
              )}
            </>
          )}
        </ScrollView>
      </ScreenContainer>

      {/* Invite Friend Modal */}
      <ContactsImportModal
        ref={contactsModalRef}
        sendBulkInvites={sendBulkInvites}
        friends={friendsData?.friends || []}
        userEmail={userEmail}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  retryButton: {
    marginTop: spacing[4],
  },
  listCard: {
    marginBottom: spacing[4],
    backgroundColor: colors.surface.raised,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border.hairline,
    overflow: 'hidden',
    ...shadows.card,
  },
  separatorRow: {
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[4],
  },
  separatorText: {
    textAlign: 'center',
    fontSize: 14,
    color: colors.text.secondary,
  },
  divider: {
    marginLeft: spacing[16],
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border.hairline,
  },
});
