import { useRouter } from 'expo-router';
import React, { useEffect } from 'react';
import { RefreshControl } from 'react-native';

import {
  ContactsImportModal,
  type ContactsImportModalRef,
} from '@/components/profile/contact-import';
import { DeleteFriendModal } from '@/components/profile/delete-friend-modal';
import { FriendsList } from '@/components/profile/friends-list';
import { ProfileCard } from '@/components/profile/profile-card';
import { RescindInvitationModal } from '@/components/profile/rescind-invitation-modal';
import { StatsCard } from '@/components/profile/stats-card';
import {
  Button,
  FocusAwareStatusBar,
  ScreenContainer,
  ScreenHeader,
  ScrollView,
  Text,
  View,
} from '@/components/ui';
import { GuildsSection } from '@/features/guilds/components/guilds-section';
import { ActionCards } from '@/features/profile/components/profile-components';
import { useCharacterSync } from '@/features/profile/hooks/profile-hooks';
import { useFriendManagement } from '@/lib/hooks/use-friend-management';
import { useProfileData } from '@/lib/hooks/use-profile-data';
import { useCharacterStore } from '@/store/character-store';
import { useOnboardingStore } from '@/store/onboarding-store';
import { useQuestStore } from '@/store/quest-store';
import { useUserStore } from '@/store/user-store';
import { colors } from '@/theme';

export default function ProfileScreen() {
  const router = useRouter();
  const character = useCharacterStore((state) => state.character);
  const completedQuests = useQuestStore((state) => state.getCompletedQuests());
  const streakCount = useCharacterStore((state) => state.dailyQuestStreak);
  const contactsModalRef = React.useRef<ContactsImportModalRef>(null);
  // resetOnboarding, not setCurrentStep: the latter is forward-only and would
  // silently discard the move back from COMPLETED, leaving this button inert.
  const resetOnboarding = useOnboardingStore((state) => state.resetOnboarding);

  // Character sync for users without local character data
  const { isRedirecting } = useCharacterSync();

  // Get profile data from custom hook
  const { userEmail, fetchUserDetails } = useProfileData();

  // Handle friends, invitations, and mutations
  const {
    friendsData,
    combinedData,
    isLoadingFriends,
    isLoadingInvitations,
    refreshing,
    onRefresh,
    deleteModalVisible,
    rescindModalVisible,
    invitationToRescind,
    inviteError: _inviteError,
    inviteSuccess: _inviteSuccess,
    formMethods: _formMethods,
    handleInviteFriends,
    handleCloseInviteModal: _handleCloseInviteModal,
    handleDeleteFriend,
    handleConfirmDelete,
    handleCancelDelete,
    handleRescindInvitation,
    handleConfirmRescind,
    handleCancelRescind,
    handleSendFriendRequest: _handleSendFriendRequest,
    handleAcceptInvitation,
    handleRejectInvitation,
    isOutgoingInvitation,
    acceptMutation,
    rejectMutation,
    rescindMutation,
    inviteMutation: _inviteMutation,
    sendBulkInvites,
  } = useFriendManagement(userEmail, contactsModalRef);

  // Fetch user details when the component mounts
  useEffect(() => {
    if (character) {
      fetchUserDetails();
    }
  }, [fetchUserDetails, character]);

  // Must stay ABOVE the early returns. useCharacterSync restores a character
  // asynchronously, so this component re-renders from the no-character branch
  // into the full one — and a hook below those returns would go from unmounted
  // to mounted mid-life, which React rejects with "Rendered more hooks than
  // during the previous render".
  const user = useUserStore((state) => state.user);

  // Don't render anything while redirecting
  if (isRedirecting) {
    return null; // Return empty instead of a loading view
  }

  // No hero to show. Reaching here should be rare — the navigation resolver
  // sends character-less accounts back to onboarding — but this used to
  // `return null`, which rendered a wholly blank screen that was
  // indistinguishable from a crash and hid a real defect for three days.
  // Say what is wrong instead of showing nothing.
  if (!character) {
    return (
      <View
        className="flex-1 items-center justify-center bg-background px-6"
        testID="profile-missing-character"
      >
        <FocusAwareStatusBar />
        <Text className="mb-2 text-center text-xl font-bold">No hero yet</Text>
        <Text className="mb-6 text-center opacity-70">
          Your account is all set — you just haven't chosen a hero. Pick one to
          begin your journey.
        </Text>
        <Button
          testID="profile-create-hero"
          label="Choose your hero"
          onPress={resetOnboarding}
        />
      </View>
    );
  }

  // Calculate total minutes from completed quests
  // Use server stats if available, otherwise calculate from local data
  const totalMinutesOffPhone =
    user?.totalMinutesOffPhone ??
    completedQuests.reduce((total, quest) => total + quest.durationMinutes, 0);

  // Use server quest count if available
  const questCount = user?.totalQuestsCompleted ?? completedQuests.length;

  return (
    <View className="flex-1">
      <FocusAwareStatusBar />

      <ScreenContainer>
        {/* Header */}
        <ScreenHeader
          title="Profile"
          subtitle="Track your journey, stats, and connect with friends."
        />

        <ScrollView
          className="flex-1"
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[colors.accent.primary]}
              tintColor={colors.accent.primary}
            />
          }
        >
          {/* Profile Card */}
          <ProfileCard character={character} />

          {/* Stats Card */}
          <StatsCard
            questCount={questCount}
            minutesSaved={totalMinutesOffPhone}
            streakCount={streakCount}
          />

          {/* Links: Skills & Perks, Leaderboard, Achievements */}
          <ActionCards
            onSkillsPress={() => router.push('/skill-tree')}
            onLeaderboardPress={() => router.push('/leaderboard')}
            onAchievementsPress={() => router.push('/achievements')}
          />

          {/* Guilds Section */}
          <GuildsSection />

          {/* Friends Section */}
          <FriendsList
            combinedData={combinedData}
            isLoading={isLoadingFriends || isLoadingInvitations}
            onInvite={handleInviteFriends}
            onDelete={handleDeleteFriend}
            onRescind={handleRescindInvitation}
            onAccept={handleAcceptInvitation}
            onReject={handleRejectInvitation}
            isOutgoingInvitation={isOutgoingInvitation}
            acceptMutation={acceptMutation}
            rejectMutation={rejectMutation}
            rescindMutation={rescindMutation}
            userEmail={userEmail}
          />
        </ScrollView>
      </ScreenContainer>

      {/* Modals */}
      <ContactsImportModal
        ref={contactsModalRef}
        sendBulkInvites={sendBulkInvites}
        friends={friendsData?.friends || []}
        userEmail={userEmail}
      />

      <DeleteFriendModal
        visible={deleteModalVisible}
        onConfirm={handleConfirmDelete}
        onCancel={handleCancelDelete}
      />

      <RescindInvitationModal
        visible={rescindModalVisible}
        invitation={invitationToRescind}
        onConfirm={handleConfirmRescind}
        onCancel={handleCancelRescind}
        isPending={rescindMutation.isPending}
      />
    </View>
  );
}
