import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import {
  ArrowLeft,
  ChevronRight,
  Info,
  PlusCircle,
  UserPlus,
  Users,
} from 'lucide-react-native';
import { usePostHog } from 'posthog-react-native';
import React, { useRef } from 'react';
import { ActivityIndicator, StyleSheet } from 'react-native';

import { ListItem } from '@/components/emberglow';
import {
  ContactsImportModal,
  type ContactsImportModalRef,
} from '@/components/profile/contact-import';
import { useLazyWebSocket } from '@/components/providers/lazy-websocket-provider';
import {
  FocusAwareStatusBar,
  ScreenContainer,
  Text,
  TouchableOpacity,
  View,
} from '@/components/ui';
import { useFriendManagement } from '@/lib/hooks/use-friend-management';
import { getUserFriends } from '@/lib/services/user';
import { useUserStore } from '@/store/user-store';
import { colors, fontFamily, radii, shadows, spacing } from '@/theme';

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
    id: 'friends',
    title: 'Add Friends',
    description: 'Connect with friends to quest together',
    icon: <UserPlus size={20} color={colors.text.accent} />,
    route: '', // We'll handle this with modal instead
  },
];

// Shared "How it works" info card — previously duplicated almost verbatim
// between the has-friends and no-friends branches below. No Emberglow
// generic card/panel component exists (ground rule 4), so this is a bare
// View styled from theme tokens.
function HowItWorksCard({ style }: { style?: object }) {
  return (
    <View style={[styles.infoCard, style]}>
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
  const contactsModalRef = useRef<ContactsImportModalRef>(null);
  // `AuthState` (src/lib/auth) has no `user` field — the real signed-in
  // user's email lives in the user store, not the auth store.
  const currentUser = useUserStore((state) => state.user);
  const userEmail = currentUser?.email || '';
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

  // Friend management hook for bulk invites
  const { sendBulkInvites } = useFriendManagement(userEmail, contactsModalRef);

  const handleOptionPress = (option: MenuOption) => {
    if (option.id === 'friends') {
      contactsModalRef.current?.present();
    } else if (option.route) {
      if (option.id === 'create') {
        posthog.capture('cooperative_quest_create_clicked');
      } else if (option.id === 'join') {
        posthog.capture('cooperative_quest_join_clicked');
      }
      router.push(option.route as any);
    }
  };

  // Show loading state while checking friends
  if (isLoading) {
    return (
      <View className="flex-1">
        <FocusAwareStatusBar />
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={colors.accent.primary} />
          <Text className="mt-4 text-neutral-200">Loading...</Text>
        </View>
      </View>
    );
  }

  // If user has no friends, show only the Add Friends option
  if (!hasFriends) {
    return (
      <View className="flex-1 bg-background">
        <FocusAwareStatusBar />

        <ScreenContainer fullScreen className="px-4">
          {/* Header */}
          <View className="mb-6 mt-2">
            <TouchableOpacity
              onPress={() => router.back()}
              className="mb-4 flex-row items-center"
            >
              <ArrowLeft size={24} color={colors.text.primary} />
              <Text className="ml-2 text-lg text-white">Back</Text>
            </TouchableOpacity>

            <Text className="mb-2 text-3xl font-bold text-white">
              Cooperative Quests
            </Text>
            <Text className="text-neutral-200">
              Team up with friends to complete quests together!
            </Text>
          </View>

          {/* No Friends Message */}
          <View className="mb-6 items-center py-8">
            <Users size={64} color={colors.text.muted} />
            <Text className="mt-4 text-center text-lg font-semibold text-white">
              Add Friends to Get Started
            </Text>
            <Text className="mt-2 px-8 text-center text-neutral-200">
              Cooperative quests require friends to play with. Add some friends
              first to start creating and joining quests together!
            </Text>
          </View>

          {/* Add Friends row */}
          <View style={styles.rowCard}>
            <ListItem
              title="Add Friends"
              subtitle="Connect with friends to quest together"
              leading={<UserPlus size={20} color={colors.text.accent} />}
              trailing={<ChevronRight size={18} color={colors.text.muted} />}
              onPress={() => contactsModalRef.current?.present()}
            />
          </View>

          {/* Info Section */}
          <View style={styles.infoSpacer}>
            <HowItWorksCard />
          </View>
        </ScreenContainer>

        {/* Contacts Import Modal */}
        <ContactsImportModal
          ref={contactsModalRef}
          sendBulkInvites={sendBulkInvites}
          friends={friendsData?.friends || []}
          userEmail={userEmail}
        />
      </View>
    );
  }

  // If user has friends, show all options
  return (
    <View className="flex-1 bg-background">
      <FocusAwareStatusBar />

      <View className="flex-1 px-4">
        {/* Header */}
        <View className="mb-6 mt-4">
          <TouchableOpacity
            onPress={() => router.back()}
            className="mb-4 flex-row items-center"
          >
            <ArrowLeft size={24} color={colors.text.primary} />
            <Text className="ml-2 text-lg text-white">Back</Text>
          </TouchableOpacity>

          <Text className="mb-2 text-3xl font-bold text-white">
            Cooperative Quests
          </Text>
          <Text className="text-neutral-200">
            Team up with friends to complete quests together. Everyone must keep
            their phones locked to succeed!
          </Text>
        </View>

        {/* Menu Options */}
        <View style={styles.menuList}>
          {menuOptions.map((option) => (
            <View key={option.id} style={styles.rowCard}>
              <ListItem
                title={option.title}
                subtitle={option.description}
                leading={option.icon}
                trailing={<ChevronRight size={18} color={colors.text.muted} />}
                onPress={() => handleOptionPress(option)}
              />
            </View>
          ))}
        </View>

        {/* Info Section */}
        <HowItWorksCard style={styles.infoCardHasFriends} />
      </View>

      {/* Contacts Import Modal */}
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
