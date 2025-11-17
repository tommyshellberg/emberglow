import { useRouter } from 'expo-router';
import React, { useEffect } from 'react';
import { RefreshControl } from 'react-native';

import {
  ContactsImportModal,
  type ContactsImportModalRef,
} from '@/components/profile/contact-import';
import { DeleteFriendModal } from '@/components/profile/delete-friend-modal';
import { ExperienceCard } from '@/components/profile/experience-card';
import { FriendsList } from '@/components/profile/friends-list';
import { ProfileCard } from '@/components/profile/profile-card';
import { RescindInvitationModal } from '@/components/profile/rescind-invitation-modal';
import { SkillsCard } from '@/components/profile/skills-card';
import { StatsCard } from '@/components/profile/stats-card';
import {
  FocusAwareStatusBar,
  ScreenContainer,
  ScreenHeader,
  ScrollView,
  View,
} from '@/components/ui';
import { useFriendManagement } from '@/lib/hooks/use-friend-management';
import { useProfileData } from '@/lib/hooks/use-profile-data';
import { useCharacterStore } from '@/store/character-store';
import { useQuestStore } from '@/store/quest-store';
import { useUserStore } from '@/store/user-store';

import { ActionCards } from '@/features/profile/components/profile-components';
import { PROFILE_COLORS } from '@/features/profile/constants/profile-constants';
import { useCharacterSync } from '@/features/profile/hooks/profile-hooks';

export default function ProfileScreen() {
  const router = useRouter();
  const character = useCharacterStore((state) => state.character);
  const completedQuests = useQuestStore((state) => state.getCompletedQuests());
  const streakCount = useCharacterStore((state) => state.dailyQuestStreak);
  const contactsModalRef = React.useRef<ContactsImportModalRef>(null);

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

  // Don't render anything while redirecting
  if (!character || isRedirecting) {
    return null; // Return empty instead of a loading view
  }

  // Get user from store for server stats
  const user = useUserStore((state) => state.user);

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
              colors={[PROFILE_COLORS.refreshControl]}
              tintColor={PROFILE_COLORS.refreshControl}
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

          {/* Action Cards */}
          <ActionCards
            onLeaderboardPress={() => router.push('/leaderboard')}
            onAchievementsPress={() => router.push('/achievements')}
          />

          {/* Skills & Perks */}
          <SkillsCard
            character={character}
            onPress={() => router.push('/skill-tree')}
          />

          {/* Experience Progress */}
          <ExperienceCard character={character} />

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
