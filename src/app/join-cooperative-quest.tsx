/**
 * Join Cooperative Quest Screen
 *
 * Lists pending cooperative-quest invitations (accept/decline) and previews
 * the out-of-scope "Public Quests" feature when there are none. Recomposed
 * onto Emberglow base components (Badge, Button) + theme tokens — see
 * docs/plans/emberglow-phase-3-screen-recomposition.md, Task 17.
 */

import { useRouter } from 'expo-router';
import { Clock, Inbox, User, Users } from 'lucide-react-native';
import { usePostHog } from 'posthog-react-native';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { invitationApi } from '@/api/invitation';
import { Badge, Button } from '@/components/emberglow';
import {
  FocusAwareStatusBar,
  ScreenContainer,
  ScreenHeader,
  showErrorMessage,
} from '@/components/ui';
import { InfoCard } from '@/components/ui/info-card';
import { colors, fontFamily, fontSize, radii, shadows, spacing } from '@/theme';

const MOCK_PUBLIC_QUESTS = [
  {
    title: 'Morning Productivity Challenge',
    host: 'ProductivityPro',
    duration: 25,
    participants: '12/20',
    startTime: 'Starts in 5 min',
  },
];

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

  const inviterName =
    invitation.inviter.characterName ||
    invitation.inviter.username ||
    'a friend';

  return (
    <View style={styles.invitationCard}>
      <Text style={styles.invitationTitle}>{questTitle}</Text>

      <View style={styles.metaColumn}>
        <View style={styles.metaRow}>
          <User size={16} color={colors.text.muted} />
          <Text style={styles.metaText}>Invited by {inviterName}</Text>
        </View>
        <View style={styles.metaRow}>
          <Clock size={16} color={colors.text.muted} />
          <Text style={styles.metaText}>{questDuration} minutes</Text>
        </View>
        <View style={styles.metaRow}>
          <Users size={16} color={colors.text.muted} />
          <Text style={styles.metaText}>
            {invitation.acceptedCount}/{invitation.inviteeCount} accepted
          </Text>
        </View>
      </View>

      <View style={styles.actionsRow}>
        <View style={styles.actionButtonWrapper}>
          <Button
            variant="secondary"
            label="Decline"
            onPress={onDecline}
            disabled={isProcessing}
            fullWidth
          />
        </View>
        <View style={styles.actionButtonWrapper}>
          <Button
            variant="primary"
            label="Accept"
            onPress={onAccept}
            disabled={isProcessing}
            fullWidth
          />
        </View>
      </View>
    </View>
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
    <View style={styles.root}>
      <FocusAwareStatusBar />

      <ScreenContainer fullScreen>
        <ScreenHeader
          title="Join a Quest"
          subtitle="View and respond to quest invitations from friends"
          showBackButton
          onBackPress={() => router.back()}
        />

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={() => fetchInvitations(true)}
            />
          }
        >
          {isLoading ? (
            <View style={styles.centerState}>
              <ActivityIndicator size="large" color={colors.text.accent} />
              <Text style={styles.mutedText}>Loading invitations...</Text>
            </View>
          ) : invitations.length === 0 ? (
            <>
              {/* No Invitations */}
              <View style={styles.emptyState}>
                <View style={styles.emptyIconCircle}>
                  <Inbox size={32} color={colors.text.accent} />
                </View>
                <Text style={styles.emptyTitle}>No Invitations</Text>
                <Text style={styles.emptyDescription}>
                  You don't have any pending quest invitations.
                </Text>
              </View>

              {/* Public Quests Section - Coming Soon */}
              <View style={styles.publicQuestsSection}>
                <View style={styles.sectionHeaderRow}>
                  <Text style={styles.sectionTitle}>Public Quests</Text>
                  <Badge tone="neutral">Coming Soon</Badge>
                </View>

                {/* Mock Public Quest Cards */}
                <View style={styles.mockQuestsWrapper}>
                  {MOCK_PUBLIC_QUESTS.map((quest) => (
                    <View key={quest.title} style={styles.mockQuestCard}>
                      <View style={styles.mockQuestHeader}>
                        <Text style={styles.mockQuestTitle}>{quest.title}</Text>
                        <View style={styles.metaRow}>
                          <User size={16} color={colors.text.muted} />
                          <Text style={styles.metaText}>
                            Hosted by {quest.host}
                          </Text>
                        </View>
                      </View>

                      <View style={styles.mockQuestStatsRow}>
                        <View style={styles.metaRow}>
                          <Clock size={16} color={colors.text.muted} />
                          <Text style={styles.metaText}>
                            {quest.duration} min
                          </Text>
                        </View>
                        <View style={styles.metaRow}>
                          <Users size={16} color={colors.text.muted} />
                          <Text style={styles.metaText}>
                            {quest.participants}
                          </Text>
                        </View>
                        <Text style={styles.mockQuestStartTime}>
                          {quest.startTime}
                        </Text>
                      </View>

                      <Button
                        variant="secondary"
                        size="sm"
                        label="Join (Coming Soon)"
                        disabled
                      />
                    </View>
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
              <Text style={styles.sectionTitle}>
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
      </ScreenContainer>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.surface.app,
  },
  scrollContent: {
    paddingTop: spacing[2],
    paddingBottom: spacing[10],
  },
  centerState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing[16],
  },
  mutedText: {
    marginTop: spacing[4],
    fontFamily: fontFamily.regular,
    fontSize: fontSize.small,
    color: colors.text.muted,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing[8],
  },
  emptyIconCircle: {
    width: 76,
    height: 76,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface.raised,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    marginBottom: spacing[4],
  },
  emptyTitle: {
    fontFamily: fontFamily.semibold,
    fontSize: fontSize.h3,
    color: colors.text.primary,
    marginBottom: spacing[2],
  },
  emptyDescription: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.small,
    color: colors.text.muted,
    textAlign: 'center',
    maxWidth: 280,
  },
  sectionTitle: {
    fontFamily: fontFamily.semibold,
    fontSize: fontSize.h3,
    color: colors.text.primary,
    marginBottom: spacing[4],
  },
  publicQuestsSection: {
    marginTop: spacing[8],
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing[4],
  },
  mockQuestsWrapper: {
    opacity: 0.6,
  },
  mockQuestCard: {
    marginBottom: spacing[3],
    padding: spacing[4],
    backgroundColor: colors.surface.raised,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border.hairline,
    ...shadows.raised,
    gap: spacing[3],
  },
  mockQuestHeader: {
    gap: spacing[1],
  },
  mockQuestTitle: {
    fontFamily: fontFamily.semibold,
    fontSize: fontSize.body,
    color: colors.text.primary,
  },
  mockQuestStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[4],
  },
  mockQuestStartTime: {
    fontFamily: fontFamily.semibold,
    fontSize: fontSize.small,
    color: colors.text.accent,
    marginLeft: 'auto',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  metaText: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.small,
    color: colors.text.muted,
  },
  invitationCard: {
    marginBottom: spacing[4],
    padding: spacing[4],
    backgroundColor: colors.surface.raised,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border.hairline,
    ...shadows.card,
  },
  invitationTitle: {
    fontFamily: fontFamily.display,
    fontSize: fontSize.h3,
    color: colors.text.primary,
    marginBottom: spacing[3],
  },
  metaColumn: {
    gap: spacing[2],
    marginBottom: spacing[4],
  },
  actionsRow: {
    flexDirection: 'row',
    gap: spacing[3],
  },
  actionButtonWrapper: {
    flex: 1,
  },
});
