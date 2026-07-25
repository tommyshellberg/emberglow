import { useQuery } from '@tanstack/react-query';
import { formatDistanceToNow } from 'date-fns';
import React from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  StyleSheet,
  Text,
} from 'react-native';

import { Button } from '@/components/emberglow';
import {
  FocusAwareStatusBar,
  ScreenContainer,
  ScreenHeader,
  ScrollView,
  View,
} from '@/components/ui';
import { useInvitationActions } from '@/lib/hooks/use-cooperative-quest';
import { getPendingInvitations } from '@/lib/services/invitation-service';
import type { QuestInvitation } from '@/store/types';
import { colors, fontFamily, fontSize, radii, shadows, spacing } from '@/theme';

export default function QuestDiscoveryScreen() {
  const { acceptInvitation, declineInvitation, isAccepting, isDeclining } =
    useInvitationActions();

  // Fetch pending invitations
  const {
    data: invitations,
    isLoading,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ['invitations', 'pending'],
    queryFn: getPendingInvitations,
    refetchInterval: 10000, // Refresh every 10 seconds
  });

  const handleAccept = (invitationId: string) => {
    acceptInvitation(invitationId);
  };

  const handleDecline = (invitationId: string) => {
    declineInvitation(invitationId);
  };

  const renderInvitation = (invitation: QuestInvitation) => {
    const expiresIn = formatDistanceToNow(new Date(invitation.expiresAt), {
      addSuffix: true,
    });

    return (
      <View key={invitation.id} style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.questTitle}>{invitation.questTitle}</Text>
          <Text style={styles.hostName}>Invited by {invitation.hostName}</Text>
        </View>

        <View style={styles.metaRow}>
          <Text style={styles.metaText}>
            Duration: {invitation.questDuration} minutes
          </Text>
          <Text style={styles.metaText}>Expires {expiresIn}</Text>
        </View>

        <View style={styles.actionsRow}>
          <View style={styles.actionButton}>
            <Button
              label="Accept"
              onPress={() => handleAccept(invitation.id)}
              disabled={isAccepting || isDeclining}
              size="sm"
              fullWidth
            />
          </View>
          <View style={styles.actionButton}>
            <Button
              label="Decline"
              onPress={() => handleDecline(invitation.id)}
              disabled={isAccepting || isDeclining}
              variant="secondary"
              size="sm"
              fullWidth
            />
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.root}>
      <FocusAwareStatusBar />

      <ScreenContainer fullScreen>
        {/* Header */}
        <ScreenHeader title="Join a Quest" showBackButton />

        {/* Content */}
        <ScrollView
          style={styles.scroll}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={refetch} />
          }
        >
          <View style={styles.content}>
            {/* Pending Invitations Section */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Pending Invitations</Text>

              {isLoading ? (
                <ActivityIndicator style={styles.loading} />
              ) : invitations && invitations.length > 0 ? (
                invitations.map(renderInvitation)
              ) : (
                <View style={styles.placeholder}>
                  <Text style={styles.placeholderText}>
                    No pending invitations at the moment
                  </Text>
                </View>
              )}
            </View>

            {/* Future: Public Quests Section */}
            <View>
              <Text style={styles.sectionTitle}>Public Quests</Text>
              <View style={styles.placeholder}>
                <Text style={styles.placeholderText}>
                  Public quest discovery coming soon!
                </Text>
              </View>
            </View>
          </View>
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
  scroll: {
    flex: 1,
  },
  content: {
    padding: spacing[5],
  },
  section: {
    marginBottom: spacing[6],
  },
  sectionTitle: {
    fontFamily: fontFamily.semibold,
    fontSize: fontSize.bodyLg,
    color: colors.text.primary,
    marginBottom: spacing[3],
  },
  loading: {
    paddingVertical: spacing[8],
  },
  card: {
    ...shadows.raised,
    backgroundColor: colors.surface.raised,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border.hairline,
    padding: spacing[4],
    marginBottom: spacing[4],
  },
  cardHeader: {
    marginBottom: spacing[2],
  },
  questTitle: {
    fontFamily: fontFamily.semibold,
    fontSize: fontSize.h3,
    color: colors.text.primary,
  },
  hostName: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.small,
    color: colors.text.muted,
    marginTop: 2,
  },
  metaRow: {
    marginBottom: spacing[3],
  },
  metaText: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.small,
    color: colors.text.muted,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: spacing[2],
  },
  actionButton: {
    flex: 1,
  },
  placeholder: {
    backgroundColor: colors.fill.faint,
    borderRadius: radii.lg,
    padding: spacing[6],
  },
  placeholderText: {
    textAlign: 'center',
    fontFamily: fontFamily.regular,
    fontSize: fontSize.small,
    color: colors.text.muted,
  },
});
