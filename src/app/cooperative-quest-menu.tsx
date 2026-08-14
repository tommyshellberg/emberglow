import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import {
  CalendarClock,
  ChevronRight,
  Info,
  PlusCircle,
  UserPlus,
  Users,
} from 'lucide-react-native';
import { usePostHog } from 'posthog-react-native';
import React from 'react';
import { ActivityIndicator, StyleSheet } from 'react-native';

import { ListItem } from '@/components/emberglow';
import { useLazyWebSocket } from '@/components/providers/lazy-websocket-provider';
import {
  FocusAwareStatusBar,
  ScreenContainer,
  ScreenHeader,
  Text,
  View,
} from '@/components/ui';
import { useInviteShare } from '@/lib/invite/use-invite-share';
import { getUserFriends } from '@/lib/services/user';
import { colors, fontFamily, fontSize, radii, shadows, spacing } from '@/theme';

interface MenuOption {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  route: string;
}

const menuOptions: MenuOption[] = [
  {
    id: 'create',
    title: 'Create Quest',
    description: 'Start a new cooperative quest and invite friends',
    icon: <PlusCircle size={20} color={colors.text.accent} />,
    route: '/create-cooperative-quest',
  },
  {
    id: 'join',
    title: 'Join Quest',
    description: 'View and respond to quest invitations from friends',
    icon: <Users size={20} color={colors.text.accent} />,
    route: '/join-cooperative-quest',
  },
  {
    id: 'events',
    title: 'Public Events',
    description: 'Discover and register for scheduled community quests',
    icon: <CalendarClock size={20} color={colors.text.accent} />,
    route: '/scheduled-quest',
  },
  {
    id: 'friends',
    title: 'Add Friends',
    description: 'Connect with friends to quest together',
    icon: <UserPlus size={20} color={colors.text.accent} />,
    route: '', // No route: this option opens the invite-link share sheet
  },
];

// Shared "How it works" info card — previously duplicated almost verbatim
// between the has-friends and no-friends branches below. No Emberglow
// generic card/panel component exists (ground rule 4), so this is a bare
// View styled from theme tokens.
function HowItWorksCard({ style }: { style?: object }) {
  return (
    <View testID="coop-how-it-works" style={[styles.infoCard, style]}>
      <Info size={20} color={colors.text.accent} style={styles.infoCardIcon} />
      <View style={styles.infoCardBody}>
        <Text style={styles.infoCardTitle}>How it works</Text>
        <Text style={styles.infoCardText}>
          In cooperative quests, all participants must keep their phones locked
          for the entire duration.{'\n'}
          If anyone unlocks early, everyone fails together!
        </Text>
      </View>
    </View>
  );
}

export default function CooperativeQuestMenu() {
  const router = useRouter();
  const posthog = usePostHog();
  const { shareInvite } = useInviteShare('coop_menu');
  const { connect: connectWebSocket } = useLazyWebSocket();

  // Connect WebSocket when entering cooperative quest flow
  React.useEffect(() => {
    connectWebSocket();
  }, [connectWebSocket]);

  // Check if user has friends
  const { data: friendsData, isLoading } = useQuery({
    queryKey: ['friends'],
    queryFn: () => getUserFriends(1),
  });

  const hasFriends = friendsData?.friends && friendsData.friends.length > 0;

  // Premium access check disabled - cooperative quests now available to all users
  // const {
  //   hasPremiumAccess,
  //   isLoading: isPremiumLoading,
  //   showPaywall,
  //   handlePaywallClose,
  //   handlePaywallSuccess,
  // } = usePremiumAccess();

  const handleOptionPress = (option: MenuOption) => {
    if (option.id === 'friends') {
      void shareInvite();
    } else if (option.route) {
      if (option.id === 'create') {
        posthog.capture('cooperative_quest_create_clicked');
      } else if (option.id === 'join') {
        posthog.capture('cooperative_quest_join_clicked');
      }
      router.push(option.route as any);
    }
  };

  const subtitle = hasFriends
    ? 'Team up with friends to complete quests together. Everyone must keep their phones locked to succeed!'
    : 'Team up with friends to complete quests together!';

  return (
    <View style={styles.root}>
      <FocusAwareStatusBar />

      <ScreenContainer fullScreen>
        <ScreenHeader
          testID="coop-menu-screen"
          title="Cooperative Quests"
          subtitle={subtitle}
          showBackButton
        />

        {isLoading ? (
          <View style={styles.loadingState}>
            <ActivityIndicator size="large" color={colors.accent.primary} />
            <Text style={styles.loadingText}>Loading...</Text>
          </View>
        ) : hasFriends ? (
          <>
            {/* Menu Options */}
            <View style={styles.menuList}>
              {menuOptions.map((option) => (
                <View key={option.id} style={styles.rowCard}>
                  <ListItem
                    testID={`coop-menu-option-${option.id}`}
                    title={option.title}
                    subtitle={option.description}
                    leading={option.icon}
                    trailing={
                      <ChevronRight size={18} color={colors.text.muted} />
                    }
                    onPress={() => handleOptionPress(option)}
                  />
                </View>
              ))}
            </View>

            {/* Info Section */}
            <HowItWorksCard style={styles.infoCardHasFriends} />
          </>
        ) : (
          <>
            {/* No Friends Message */}
            <View testID="coop-empty-state" style={styles.emptyState}>
              <Users size={64} color={colors.text.muted} />
              <Text style={styles.emptyStateTitle}>
                Add Friends to Get Started
              </Text>
              <Text style={styles.emptyStateBody}>
                Cooperative quests require friends to play with. Add some
                friends first to start creating and joining quests together!
              </Text>
            </View>

            {/* Add Friends row */}
            <View style={styles.rowCard}>
              <ListItem
                testID="coop-add-friends-row"
                title="Add Friends"
                subtitle="Connect with friends to quest together"
                leading={<UserPlus size={20} color={colors.text.accent} />}
                trailing={<ChevronRight size={18} color={colors.text.muted} />}
                onPress={() => void shareInvite()}
              />
            </View>

            {/* Info Section */}
            <View style={styles.infoSpacer}>
              <HowItWorksCard />
            </View>
          </>
        )}
      </ScreenContainer>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.surface.app,
  },
  loadingState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: spacing[4],
    fontFamily: fontFamily.regular,
    fontSize: fontSize.small,
    color: colors.text.secondary,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing[8],
    marginBottom: spacing[6],
  },
  emptyStateTitle: {
    marginTop: spacing[4],
    fontFamily: fontFamily.semibold,
    fontSize: fontSize.h3,
    color: colors.text.primary,
    textAlign: 'center',
  },
  emptyStateBody: {
    marginTop: spacing[2],
    paddingHorizontal: spacing[8],
    fontFamily: fontFamily.regular,
    fontSize: fontSize.small,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  menuList: {
    flex: 1,
    gap: spacing[4],
  },
  rowCard: {
    backgroundColor: colors.surface.raised,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border.hairline,
    overflow: 'hidden',
    ...shadows.card,
  },
  infoSpacer: {
    marginTop: 'auto',
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing[3],
    backgroundColor: colors.surface.raised,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border.hairline,
    padding: spacing[4],
    ...shadows.card,
  },
  infoCardHasFriends: {
    marginBottom: spacing[4],
  },
  infoCardIcon: {
    marginTop: 2,
  },
  infoCardBody: {
    flex: 1,
  },
  infoCardTitle: {
    fontFamily: fontFamily.semibold,
    fontSize: 15,
    color: colors.text.primary,
    marginBottom: 4,
  },
  infoCardText: {
    fontFamily: fontFamily.regular,
    fontSize: 13,
    lineHeight: 13 * 1.5,
    color: colors.text.secondary,
  },
});
