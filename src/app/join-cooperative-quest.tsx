import { useRouter } from 'expo-router';
import { ArrowLeft, Clock, Inbox, User, Users } from 'lucide-react-native';
import { usePostHog } from 'posthog-react-native';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';

import { invitationApi } from '@/api/invitation';
import {
  Card,
  FocusAwareStatusBar,
  ScrollView,
  showErrorMessage,
  Text,
  View,
} from '@/components/ui';
import colors from '@/components/ui/colors.js';
import { InfoCard } from '@/components/ui/info-card';

interface InvitationCardProps {
  invitation: any;
  onAccept: () => void;
  onDecline: () => void;
  isProcessing: boolean;
}

function InvitationCard({
  invitation,
  onAccept,
  onDecline,
  isProcessing,
}: InvitationCardProps) {
  // Debug log the invitation structure
  console.log(
    'InvitationCard - Full invitation object:',
    JSON.stringify(invitation, null, 2)
  );

  // Look for quest title in multiple possible locations
  const questTitle =
    invitation.questTitle ||
    invitation.title ||
    invitation.metadata?.questTitle ||
    invitation.questData?.title ||
    invitation.quest?.title ||
    invitation.questRun?.title ||
    'Cooperative Quest';

  // Look for quest duration in multiple possible locations
  const questDuration =
    invitation.questDuration ||
    invitation.duration ||
    invitation.metadata?.questDuration ||
    invitation.questData?.duration ||
    invitation.quest?.durationMinutes ||
    invitation.quest?.duration ||
    invitation.questRun?.duration ||
    invitation.questRun?.durationMinutes ||
    30;

  return (
    <Card
      className="mb-4 p-4"
      style={{ backgroundColor: colors.cardBackground }}
    >
      <View className="mb-3">
        <Text
          className="text-lg font-semibold text-white"
          style={{ fontWeight: '700' }}
        >
          {questTitle}
        </Text>
        <View className="mt-2 flex-row items-center">
          <User size={16} color={colors.neutral[200]} />
          <Text className="ml-1 text-sm text-neutral-200">
            Invited by{' '}
            {invitation.inviter.characterName ||
              invitation.inviter.username ||
              'a friend'}
          </Text>
        </View>
        <View className="mt-1 flex-row items-center">
          <Clock size={16} color={colors.neutral[200]} />
          <Text className="ml-1 text-sm text-neutral-200">
            {questDuration} minutes
          </Text>
        </View>
        <View className="mt-1 flex-row items-center">
          <Users size={16} color={colors.neutral[200]} />
          <Text className="ml-1 text-sm text-neutral-200">
            {invitation.acceptedCount}/{invitation.inviteeCount} accepted
          </Text>
        </View>
      </View>

      <View className="flex-row gap-3">
        <TouchableOpacity
          onPress={onDecline}
          disabled={isProcessing}
          className="flex-1 rounded-lg px-4 py-3"
          style={{ backgroundColor: colors.neutral[300] }}
        >
          <Text
            className="text-center font-semibold text-neutral-700"
            style={{ fontWeight: '700' }}
          >
            Decline
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={onAccept}
          disabled={isProcessing}
          className="flex-1 rounded-lg bg-primary-400 px-4 py-3"
        >
          <Text
            className="text-center font-semibold text-white"
            style={{ fontWeight: '700' }}
          >
            Accept
          </Text>
        </TouchableOpacity>
      </View>
    </Card>
  );
}

export default function JoinCooperativeQuest() {
  const router = useRouter();
  const posthog = usePostHog();
  const [invitations, setInvitations] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const fetchInvitations = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }

      const pendingInvitations = await invitationApi.getPendingInvitations();
      console.log('=======================================');
      console.log('FETCHED INVITATIONS DEBUG:');
      console.log('Number of invitations:', pendingInvitations.length);
      pendingInvitations.forEach((inv, index) => {
        console.log(`Invitation ${index}:`, {
          id: inv.id,
          inviter: inv.inviter,
          quest: inv.quest,
          metadata: inv.metadata,
          questData: inv.questData,
          fullObject: JSON.stringify(inv, null, 2),
        });
      });
      console.log('=======================================');
      setInvitations(pendingInvitations);
    } catch (error) {
      console.error('Error fetching invitations:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchInvitations();
  }, []);

  const handleAccept = async (invitation: any) => {
    try {
      setProcessingId(invitation.id);

      // Get quest details for tracking
      const questTitle =
        invitation.questTitle ||
        invitation.title ||
        invitation.metadata?.questTitle ||
        invitation.questData?.title ||
        invitation.quest?.title ||
        invitation.questRun?.title ||
        'Cooperative Quest';

      const questDuration =
        invitation.questDuration ||
        invitation.duration ||
        invitation.metadata?.questDuration ||
        invitation.questData?.duration ||
        invitation.quest?.durationMinutes ||
        invitation.quest?.duration ||
        invitation.questRun?.duration ||
        invitation.questRun?.durationMinutes ||
        30;

      posthog.capture('cooperative_quest_invitation_accepted');

      // Accept the invitation
      const response = await invitationApi.respondToInvitation(
        invitation.id,
        'accepted'
      );

      // For cooperative quests, use the lobbyId from metadata or response
      const lobbyId =
        invitation.metadata?.lobbyId ||
        response.invitation?.lobbyId ||
        invitation.id;

      // Navigate to the lobby where it will join and get the full data from server
      router.replace(`/cooperative-quest-lobby/${lobbyId}`);
    } catch (error) {
      console.error('Error accepting invitation:', error);
      showErrorMessage('Failed to accept invitation. Please try again.');
    } finally {
      setProcessingId(null);
    }
  };

  const handleDecline = async (invitation: any) => {
    try {
      setProcessingId(invitation.id);

      // Get quest details for tracking
      const questTitle =
        invitation.questTitle ||
        invitation.title ||
        invitation.metadata?.questTitle ||
        invitation.questData?.title ||
        invitation.quest?.title ||
        invitation.questRun?.title ||
        'Cooperative Quest';

      const questDuration =
        invitation.questDuration ||
        invitation.duration ||
        invitation.metadata?.questDuration ||
        invitation.questData?.duration ||
        invitation.quest?.durationMinutes ||
        invitation.quest?.duration ||
        invitation.questRun?.duration ||
        invitation.questRun?.durationMinutes ||
        30;

      posthog.capture('cooperative_quest_invitation_declined');

      // Decline the invitation
      await invitationApi.respondToInvitation(invitation.id, 'declined');

      // Remove from local list
      setInvitations(invitations.filter((inv) => inv.id !== invitation.id));
    } catch (error) {
      console.error('Error declining invitation:', error);
      showErrorMessage('Failed to decline invitation. Please try again.');
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <View className="flex-1" style={{ backgroundColor: colors.background }}>
      <FocusAwareStatusBar />

      {/* Header */}
      <View className="mb-6 mt-2 px-4">
        <TouchableOpacity
          onPress={() => router.back()}
          className="mb-4 flex-row items-center"
        >
          <ArrowLeft size={24} color={colors.white} />
          <Text className="ml-2 text-lg text-white">Back</Text>
        </TouchableOpacity>

        <Text className="mb-2 text-3xl font-bold text-white">
          Join a Quest
        </Text>
        <Text style={{ color: colors.neutral[200] }}>
          View and respond to quest invitations from friends
        </Text>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 20 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => fetchInvitations(true)}
          />
        }
      >
        {isLoading ? (
          <View className="flex-1 items-center justify-center py-20">
            <ActivityIndicator size="large" />
            <Text className="mt-4" style={{ color: colors.neutral[200] }}>
              Loading invitations...
            </Text>
          </View>
        ) : invitations.length === 0 ? (
          <>
            {/* No Invitations */}
            <View className="items-center py-10">
              <Inbox size={48} color={colors.neutral[200]} />
              <Text
                className="mt-3 text-lg font-semibold"
                style={{ fontWeight: '700' }}
              >
                No Invitations
              </Text>
              <Text
                className="mt-2 text-center text-base"
                style={{ color: colors.neutral[200] }}
              >
                You don't have any pending quest invitations.
              </Text>
            </View>

            {/* Public Quests Section - Coming Soon */}
            <View className="mt-8">
              <View className="mb-4 flex-row items-center justify-between">
                <Text
                  className="text-lg font-semibold"
                  style={{ fontWeight: '700' }}
                >
                  Public Quests
                </Text>
                <View
                  className="rounded-full px-3 py-1"
                  style={{ backgroundColor: colors.secondary[100] }}
                >
                  <Text
                    className="text-sm font-semibold"
                    style={{ color: colors.secondary[500], fontWeight: '600' }}
                  >
                    Coming Soon
                  </Text>
                </View>
              </View>

              {/* Mock Public Quest Cards */}
              <View className="opacity-60">
                {[
                  {
                    title: 'Morning Productivity Challenge',
                    host: 'ProductivityPro',
                    duration: 25,
                    participants: '12/20',
                    startTime: 'Starts in 5 min',
                  },
                ].map((quest, index) => (
                  <Card
                    key={index}
                    className="mb-3 p-4"
                    style={{ backgroundColor: colors.cardBackground }}
                  >
                    <View className="mb-3">
                      <Text
                        className="text-base font-semibold"
                        style={{ fontWeight: '700' }}
                      >
                        {quest.title}
                      </Text>
                      <View className="mt-2 flex-row items-center">
                        <User size={16} color={colors.neutral[200]} />
                        <Text
                          className="ml-1 text-sm"
                          style={{ color: colors.neutral[200] }}
                        >
                          Hosted by {quest.host}
                        </Text>
                      </View>
                    </View>

                    <View className="mb-3 flex-row justify-between">
                      <View className="flex-row items-center">
                        <Clock size={16} color={colors.neutral[200]} />
                        <Text
                          className="ml-1 text-sm"
                          style={{ color: colors.neutral[200] }}
                        >
                          {quest.duration} min
                        </Text>
                      </View>
                      <View className="flex-row items-center">
                        <Users size={16} color={colors.neutral[200]} />
                        <Text
                          className="ml-1 text-sm"
                          style={{ color: colors.neutral[200] }}
                        >
                          {quest.participants}
                        </Text>
                      </View>
                      <Text
                        className="text-sm font-semibold"
                        style={{
                          color: colors.primary[400],
                          fontWeight: '600',
                        }}
                      >
                        {quest.startTime}
                      </Text>
                    </View>

                    <TouchableOpacity
                      disabled
                      className="rounded-lg px-4 py-2"
                      style={{ backgroundColor: colors.neutral[300] }}
                    >
                      <Text
                        className="text-center text-sm font-semibold"
                        style={{
                          color: colors.neutral[50],
                          fontWeight: '600',
                        }}
                      >
                        Join (Coming Soon)
                      </Text>
                    </TouchableOpacity>
                  </Card>
                ))}
              </View>

              <InfoCard
                title="Public Quests are coming soon!"
                description="Soon you'll be able to join quests created by the community, compete on leaderboards, and find accountability partners worldwide."
              />
            </View>
          </>
        ) : (
          <>
            {/* Pending Invitations Section */}
            <Text
              className="mb-4 text-lg font-semibold"
              style={{ fontWeight: '700' }}
            >
              Pending Invitations ({invitations.length})
            </Text>
            {invitations.map((invitation) => (
              <InvitationCard
                key={invitation.id}
                invitation={invitation}
                onAccept={() => handleAccept(invitation)}
                onDecline={() => handleDecline(invitation)}
                isProcessing={processingId === invitation.id}
              />
            ))}
          </>
        )}
      </ScrollView>
    </View>
  );
}
