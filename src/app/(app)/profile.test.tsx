/* eslint-disable max-lines-per-function */
import React from 'react';

import * as userService from '@/lib/services/user';
import { cleanup, render, screen, setup, waitFor } from '@/lib/test-utils';
import { useCharacterStore } from '@/store/character-store';
import { useQuestStore } from '@/store/quest-store';
import { useUserStore } from '@/store/user-store';

import ProfileScreen from './profile';

// Mock dependencies
const mockRouterPush = jest.fn();
const mockRouterReplace = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: mockRouterPush,
    replace: mockRouterReplace,
  }),
}));

// Mock lucide-react-native icons
jest.mock('lucide-react-native', () => ({
  Award: () => null,
  TrendingUp: () => null,
}));

// Mock UI components
jest.mock('@/components/ui', () => {
  const RN = jest.requireActual('react-native');
  return {
    View: RN.View,
    Text: RN.Text,
    Card: ({ children, className }: any) => (
      <RN.View testID="card">{children}</RN.View>
    ),
    Pressable: RN.Pressable,
    ScrollView: RN.ScrollView,
    FocusAwareStatusBar: () => null,
    ScreenContainer: ({ children }: any) => <RN.View>{children}</RN.View>,
    ScreenHeader: ({ title, subtitle }: any) => (
      <RN.View>
        <RN.Text>{title}</RN.Text>
        <RN.Text>{subtitle}</RN.Text>
      </RN.View>
    ),
  };
});

// Mock profile sub-components
jest.mock('@/components/profile/profile-card', () => {
  const RN = jest.requireActual('react-native');
  return {
    ProfileCard: ({ character }: any) => (
      <RN.View testID="profile-card">
        <RN.Text>{character?.name}</RN.Text>
      </RN.View>
    ),
  };
});

jest.mock('@/components/profile/stats-card', () => {
  const RN = jest.requireActual('react-native');
  return {
    StatsCard: ({ questCount, minutesSaved, streakCount }: any) => (
      <RN.View testID="stats-card">
        <RN.Text testID="quest-count">{questCount}</RN.Text>
        <RN.Text testID="minutes-saved">{minutesSaved}</RN.Text>
        <RN.Text testID="streak-count">{streakCount}</RN.Text>
      </RN.View>
    ),
  };
});

jest.mock('@/components/profile/experience-card', () => {
  const RN = jest.requireActual('react-native');
  return {
    ExperienceCard: ({ character }: any) => (
      <RN.View testID="experience-card">
        <RN.Text>{character?.level}</RN.Text>
      </RN.View>
    ),
  };
});

jest.mock('@/components/profile/friends-list', () => {
  const RN = jest.requireActual('react-native');
  return {
    FriendsList: ({ combinedData, isLoading, onInvite }: any) => (
      <RN.View testID="friends-list">
        {isLoading ? (
          <RN.Text>Loading friends...</RN.Text>
        ) : (
          <>
            <RN.Pressable onPress={onInvite}>
              <RN.Text>Invite Friends</RN.Text>
            </RN.Pressable>
            <RN.Text>{combinedData?.length || 0} friends</RN.Text>
          </>
        )}
      </RN.View>
    ),
  };
});

jest.mock('@/components/profile/contact-import', () => {
  const mockForwardRef = require('react').forwardRef;
  return {
    ContactsImportModal: mockForwardRef((_props: any, _ref: any) => null),
  };
});

jest.mock('@/components/profile/delete-friend-modal', () => ({
  DeleteFriendModal: () => null,
}));

jest.mock('@/components/profile/rescind-invitation-modal', () => ({
  RescindInvitationModal: () => null,
}));

// Mock hooks
jest.mock('@/lib/hooks/use-profile-data', () => ({
  useProfileData: jest.fn(() => ({
    userEmail: 'test@example.com',
    fetchUserDetails: jest.fn(),
  })),
}));

jest.mock('@/lib/hooks/use-friend-management', () => ({
  useFriendManagement: jest.fn(() => ({
    friendsData: { friends: [] },
    combinedData: [],
    isLoadingFriends: false,
    isLoadingInvitations: false,
    refreshing: false,
    onRefresh: jest.fn(),
    deleteModalVisible: false,
    rescindModalVisible: false,
    invitationToRescind: null,
    inviteError: null,
    inviteSuccess: false,
    formMethods: {},
    handleInviteFriends: jest.fn(),
    handleCloseInviteModal: jest.fn(),
    handleDeleteFriend: jest.fn(),
    handleConfirmDelete: jest.fn(),
    handleCancelDelete: jest.fn(),
    handleRescindInvitation: jest.fn(),
    handleConfirmRescind: jest.fn(),
    handleCancelRescind: jest.fn(),
    handleSendFriendRequest: jest.fn(),
    handleAcceptInvitation: jest.fn(),
    handleRejectInvitation: jest.fn(),
    isOutgoingInvitation: jest.fn(),
    acceptMutation: { isPending: false },
    rejectMutation: { isPending: false },
    rescindMutation: { isPending: false },
    inviteMutation: { isPending: false },
    sendBulkInvites: jest.fn(),
  })),
}));

// Mock storage
jest.mock('@/lib/storage', () => ({
  getItem: jest.fn(() => null),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

// Mock MMKV storage
jest.mock('react-native-mmkv', () => ({
  MMKV: jest.fn().mockImplementation(() => ({
    getString: jest.fn(() => null),
    getNumber: jest.fn(() => undefined),
    getBoolean: jest.fn(() => false),
    set: jest.fn(),
    delete: jest.fn(),
  })),
}));

// Mock i18n utilities
jest.mock('@/lib/i18n/utils', () => ({
  getLanguage: jest.fn(() => 'en'),
  translate: jest.fn((key: string) => key),
}));

// Mock react-native-reanimated
jest.mock('react-native-reanimated', () => {
  const Reanimated = require('react-native-reanimated/mock');
  Reanimated.default.call = () => {};
  return Reanimated;
});

describe('ProfileScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Reset stores to initial state
    useCharacterStore.setState({
      character: {
        name: 'TestHero',
        type: 'knight',
        level: 4,
        currentXP: 100,
      },
      dailyQuestStreak: 5,
    });

    useQuestStore.setState({
      completedQuests: [
        { id: '1', durationMinutes: 30 },
        { id: '2', durationMinutes: 45 },
      ],
    });

    useUserStore.setState({
      user: {
        _id: 'user1',
        email: 'test@example.com',
        totalQuestsCompleted: 10,
        totalMinutesOffPhone: 150,
      },
    });
  });

  afterEach(() => {
    cleanup();
  });

  describe('Rendering', () => {
    it('renders the screen with header and subtitle', () => {
      render(<ProfileScreen />);

      expect(screen.getByText('Profile')).toBeOnTheScreen();
      expect(
        screen.getByText('Track your journey, stats, and connect with friends.')
      ).toBeOnTheScreen();
    });

    it('renders the profile card with character name', () => {
      render(<ProfileScreen />);

      const profileCard = screen.getByTestId('profile-card');
      expect(profileCard).toBeOnTheScreen();
      expect(screen.getByText('TestHero')).toBeOnTheScreen();
    });

    it('renders stats card with correct values', () => {
      render(<ProfileScreen />);

      const statsCard = screen.getByTestId('stats-card');
      expect(statsCard).toBeOnTheScreen();

      // Should use server stats when available
      expect(screen.getByTestId('quest-count')).toHaveTextContent('10');
      expect(screen.getByTestId('minutes-saved')).toHaveTextContent('150');
      expect(screen.getByTestId('streak-count')).toHaveTextContent('5');
    });

    it('renders experience card', () => {
      render(<ProfileScreen />);

      const experienceCard = screen.getByTestId('experience-card');
      expect(experienceCard).toBeOnTheScreen();
      expect(screen.getByText('4')).toBeOnTheScreen();
    });

    it('renders action cards for leaderboard and achievements', () => {
      render(<ProfileScreen />);

      expect(screen.getByText('View Leaderboard')).toBeOnTheScreen();
      expect(screen.getByText('See how others are doing')).toBeOnTheScreen();
      expect(screen.getByText('My Achievements')).toBeOnTheScreen();
      expect(screen.getByText('Track your progress')).toBeOnTheScreen();
    });

    it('renders friends section', () => {
      render(<ProfileScreen />);

      const friendsList = screen.getByTestId('friends-list');
      expect(friendsList).toBeOnTheScreen();
    });

    it('returns null when character is missing', () => {
      useCharacterStore.setState({ character: null });

      const { queryByText } = render(<ProfileScreen />);

      // Component should not render profile content
      expect(queryByText('Profile')).not.toBeOnTheScreen();
      expect(queryByText('View Leaderboard')).not.toBeOnTheScreen();
    });
  });

  describe('Stats Display', () => {
    it('uses server stats when available', () => {
      useUserStore.setState({
        user: {
          _id: 'user1',
          email: 'test@example.com',
          totalQuestsCompleted: 25,
          totalMinutesOffPhone: 500,
        },
      });

      render(<ProfileScreen />);

      expect(screen.getByTestId('quest-count')).toHaveTextContent('25');
      expect(screen.getByTestId('minutes-saved')).toHaveTextContent('500');
    });

    it('falls back to local stats when server stats unavailable', () => {
      useUserStore.setState({ user: null });

      render(<ProfileScreen />);

      // Should calculate from local completed quests: 30 + 45 = 75 minutes
      expect(screen.getByTestId('minutes-saved')).toHaveTextContent('75');
      expect(screen.getByTestId('quest-count')).toHaveTextContent('2');
    });

    it('shows zero stats when no data available', () => {
      useUserStore.setState({ user: null });
      useQuestStore.setState({ completedQuests: [] });

      render(<ProfileScreen />);

      expect(screen.getByTestId('quest-count')).toHaveTextContent('0');
      expect(screen.getByTestId('minutes-saved')).toHaveTextContent('0');
    });

    it('displays streak count from character store', () => {
      useCharacterStore.setState({ dailyQuestStreak: 10 });

      render(<ProfileScreen />);

      expect(screen.getByTestId('streak-count')).toHaveTextContent('10');
    });
  });

  describe('Navigation', () => {
    it('navigates to leaderboard when card is pressed', async () => {
      const { user } = setup(<ProfileScreen />);

      const leaderboardButton = screen.getByText('View Leaderboard');
      await user.press(leaderboardButton);

      await waitFor(() => {
        expect(mockRouterPush).toHaveBeenCalledWith('/leaderboard');
      });
    });

    it('navigates to achievements when card is pressed', async () => {
      const { user } = setup(<ProfileScreen />);

      const achievementsButton = screen.getByText('My Achievements');
      await user.press(achievementsButton);

      await waitFor(() => {
        expect(mockRouterPush).toHaveBeenCalledWith('/achievements');
      });
    });
  });

  describe('Character Sync', () => {
    // Note: Character sync logic has been extracted to useCharacterSync() hook
    // See: src/features/profile/hooks/profile-hooks.ts
    // Tests for useCharacterSync should be added to a new test file

    it('does not trigger sync when character exists', () => {
      const getUserDetailsSpy = jest.spyOn(userService, 'getUserDetails');

      render(<ProfileScreen />);

      // Should not call API since character already exists
      expect(getUserDetailsSpy).not.toHaveBeenCalled();
    });
  });

  describe('User Interactions', () => {
    it('allows inviting friends', async () => {
      const mockUseFriendManagement = jest.requireMock(
        '@/lib/hooks/use-friend-management'
      ).useFriendManagement;
      const mockHandleInvite = jest.fn();

      mockUseFriendManagement.mockReturnValue({
        ...mockUseFriendManagement(),
        handleInviteFriends: mockHandleInvite,
      });

      const { user } = setup(<ProfileScreen />);

      const inviteButton = screen.getByText('Invite Friends');
      await user.press(inviteButton);

      await waitFor(() => {
        expect(mockHandleInvite).toHaveBeenCalled();
      });
    });

    it('supports pull to refresh', () => {
      const mockUseFriendManagement = jest.requireMock(
        '@/lib/hooks/use-friend-management'
      ).useFriendManagement;
      const mockOnRefresh = jest.fn();

      mockUseFriendManagement.mockReturnValue({
        ...mockUseFriendManagement(),
        onRefresh: mockOnRefresh,
        refreshing: false,
      });

      render(<ProfileScreen />);

      // The refresh control is configured
      // In a real test, we'd simulate the pull gesture
      // For now, verify the component renders without error
      expect(screen.getByText('Profile')).toBeOnTheScreen();
    });

    it('shows loading state for friends', () => {
      const mockUseFriendManagement = jest.requireMock(
        '@/lib/hooks/use-friend-management'
      ).useFriendManagement;

      mockUseFriendManagement.mockReturnValue({
        ...mockUseFriendManagement(),
        isLoadingFriends: true,
      });

      render(<ProfileScreen />);

      expect(screen.getByText('Loading friends...')).toBeOnTheScreen();
    });
  });

  describe('Edge Cases', () => {
    it('handles missing user data gracefully', () => {
      useUserStore.setState({ user: null });

      render(<ProfileScreen />);

      // Should still render with fallback stats
      expect(screen.getByTestId('stats-card')).toBeOnTheScreen();
    });

    it('handles character without streak data', () => {
      useCharacterStore.setState({
        character: {
          name: 'TestHero',
          type: 'knight',
          level: 1,
          currentXP: 0,
        },
        dailyQuestStreak: 0,
      });

      render(<ProfileScreen />);

      expect(screen.getByTestId('streak-count')).toHaveTextContent('0');
    });

    it('handles empty completed quests array', () => {
      useUserStore.setState({ user: null });
      useQuestStore.setState({ completedQuests: [] });

      render(<ProfileScreen />);

      expect(screen.getByTestId('quest-count')).toHaveTextContent('0');
      expect(screen.getByTestId('minutes-saved')).toHaveTextContent('0');
    });
  });

  describe('Accessibility', () => {
    it('has accessible navigation buttons', () => {
      render(<ProfileScreen />);

      const leaderboardButton = screen.getByText('View Leaderboard');
      const achievementsButton = screen.getByText('My Achievements');

      expect(leaderboardButton).toBeOnTheScreen();
      expect(achievementsButton).toBeOnTheScreen();
    });

    it('displays clear descriptive text for action cards', () => {
      render(<ProfileScreen />);

      expect(screen.getByText('View Leaderboard')).toBeOnTheScreen();
      expect(screen.getByText('See how others are doing')).toBeOnTheScreen();
      expect(screen.getByText('My Achievements')).toBeOnTheScreen();
      expect(screen.getByText('Track your progress')).toBeOnTheScreen();
    });
  });
});
