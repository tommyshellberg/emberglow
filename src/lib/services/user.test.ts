import { v4 as uuidv4 } from 'uuid';

import { apiClient } from '@/api/common/client';
import { getAccessToken } from '@/api/token';
import { posthogClient } from '@/lib/posthog';
import { setItem } from '@/lib/storage';

import {
  acceptFriendInvitation,
  createProvisionalUser,
  deleteUserAccount,
  getUserDetails,
  getUserFriends,
  getUserInvitations,
  rejectFriendInvitation,
  removeFriend,
  rescindInvitation,
  sendBulkFriendInvites,
  sendFriendInvite,
  updateUserCharacter,
} from './user';

// Mock dependencies
jest.mock('@/api/common/client');
jest.mock('@/api/token', () => ({ getAccessToken: jest.fn(() => null) }));
jest.mock('@/lib/storage');
jest.mock('uuid');

const mockApiClient = apiClient as jest.Mocked<typeof apiClient>;
const mockSetItem = setItem as jest.MockedFunction<typeof setItem>;
const mockUuidv4 = uuidv4 as jest.MockedFunction<typeof uuidv4>;

describe('User Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Suppress console logs during tests
    jest.spyOn(console, 'log').mockImplementation();
    jest.spyOn(console, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('getUserDetails', () => {
    it('should fetch user details successfully', async () => {
      const mockUserDetails = {
        id: 'user-123',
        name: 'Test User',
        email: 'test@example.com',
        role: 'user',
        character: {
          type: 'alchemist',
          name: 'Testalchemist',
          level: 5,
          currentXP: 250,
          xpToNextLevel: 300,
        },
        dailyQuestStreak: 7,
        totalQuestsCompleted: 25,
        totalMinutesOffPhone: 1500,
      };

      mockApiClient.get.mockResolvedValue({ data: mockUserDetails });

      const result = await getUserDetails();

      expect(mockApiClient.get).toHaveBeenCalledWith('/users/me');
      expect(result).toEqual(mockUserDetails);
      expect(console.log).toHaveBeenCalledWith('fetching user details');
    });

    it('should handle network errors', async () => {
      const mockError = new Error('Network error');
      mockApiClient.get.mockRejectedValue(mockError);

      await expect(getUserDetails()).rejects.toThrow('Network error');
      expect(console.error).toHaveBeenCalledWith(
        'Error fetching user details:',
        mockError
      );
    });

    it('should handle 401 unauthorized errors', async () => {
      const mockError = {
        response: { status: 401, data: { message: 'Unauthorized' } },
      };
      mockApiClient.get.mockRejectedValue(mockError);

      await expect(getUserDetails()).rejects.toEqual(mockError);
      expect(console.error).toHaveBeenCalledWith(
        'Error fetching user details:',
        mockError
      );
    });

    it('should handle legacy user data format', async () => {
      const mockLegacyUser = {
        id: 'user-456',
        name: 'Legacy User',
        email: 'legacy@example.com',
        role: 'user',
        type: 'druid',
        level: 3,
        xp: 150,
      };

      mockApiClient.get.mockResolvedValue({ data: mockLegacyUser });

      const result = await getUserDetails();

      expect(result).toEqual(mockLegacyUser);
      expect(result.type).toBe('druid');
      expect(result.level).toBe(3);
      expect(result.xp).toBe(150);
    });
  });

  describe('createProvisionalUser', () => {
    it('refuses to mint a provisional account over an active real session', async () => {
      // Named bug: Google-first signup → onboarding minted a SECOND server
      // account, silently splitting quest runs across two identities.
      (getAccessToken as jest.Mock).mockReturnValueOnce('real-access-token');

      await expect(
        createProvisionalUser({ type: 'alchemist', name: 'Tester' } as any)
      ).rejects.toThrow('PROVISIONAL_WITH_ACTIVE_SESSION');

      expect(mockApiClient.post).not.toHaveBeenCalled();
    });

    it('identifies the user in PostHog with the server user id', async () => {
      mockUuidv4.mockReturnValue('test-uuid' as any);
      mockApiClient.post.mockResolvedValue({
        data: {
          user: { id: 'user-123' },
          tokens: {},
        },
      });

      await createProvisionalUser({
        type: 'alchemist',
        name: 'Tester',
      } as any);

      expect(posthogClient.identify).toHaveBeenCalledWith('user-123');
    });
  });

  describe('updateUserCharacter', () => {
    it('should update user character successfully', async () => {
      const mockCharacter = {
        type: 'alchemist' as const,
        name: 'Updatedalchemist',
        level: 6,
        currentXP: 300,
        xpToNextLevel: 400,
      };

      const mockResponse = { success: true, character: mockCharacter };
      mockApiClient.patch.mockResolvedValue({ data: mockResponse });

      const result = await updateUserCharacter(mockCharacter);

      expect(mockApiClient.patch).toHaveBeenCalledWith('users/me/', {
        character: mockCharacter,
      });
      expect(result).toEqual(mockResponse);
    });

    it('should handle update errors', async () => {
      const mockCharacter = {
        type: 'alchemist' as const,
        name: 'Testalchemist',
        level: 1,
        currentXP: 0,
        xpToNextLevel: 100,
      };

      const mockError = new Error('Update failed');
      mockApiClient.patch.mockRejectedValue(mockError);

      await expect(updateUserCharacter(mockCharacter)).rejects.toThrow(
        'Update failed'
      );
    });
  });

  describe('getUserFriends', () => {
    it('should fetch friends list with default pagination', async () => {
      const mockFriendsResponse = {
        count: 2,
        friends: [
          {
            _id: 'friend-1',
            email: 'friend1@example.com',
            isEmailVerified: true,
            friends: [],
            pendingFriends: [],
            character: {
              _id: 'char-1',
              level: 4,
              currentXP: 200,
              xpToNextLevel: 250,
              type: 'druid',
              name: 'FriendDruid',
            },
            dailyQuestStreak: 5,
          },
          {
            _id: 'friend-2',
            email: 'friend2@example.com',
            isEmailVerified: true,
            friends: [],
            pendingFriends: [],
            character: {
              _id: 'char-2',
              level: 8,
              currentXP: 450,
              xpToNextLevel: 500,
              type: 'scout',
              name: 'FriendScout',
            },
            dailyQuestStreak: 12,
          },
        ],
      };

      mockApiClient.get.mockResolvedValue({ data: mockFriendsResponse });

      const result = await getUserFriends();

      expect(mockApiClient.get).toHaveBeenCalledWith('/users/friends', {
        params: { page: 1, page_size: 10 },
      });
      expect(result).toEqual(mockFriendsResponse);
    });

    it('should fetch friends list with custom pagination', async () => {
      const mockFriendsResponse = { count: 0, friends: [] };
      mockApiClient.get.mockResolvedValue({ data: mockFriendsResponse });

      const result = await getUserFriends(2, 20);

      expect(mockApiClient.get).toHaveBeenCalledWith('/users/friends', {
        params: { page: 2, page_size: 20 },
      });
      expect(result).toEqual(mockFriendsResponse);
    });

    it('should handle empty friends list', async () => {
      const mockEmptyResponse = { count: 0, friends: [] };
      mockApiClient.get.mockResolvedValue({ data: mockEmptyResponse });

      const result = await getUserFriends();

      expect(result).toEqual(mockEmptyResponse);
      expect(result.friends).toHaveLength(0);
    });

    it('should handle fetch errors', async () => {
      const mockError = new Error('Failed to fetch friends');
      mockApiClient.get.mockRejectedValue(mockError);

      await expect(getUserFriends()).rejects.toThrow('Failed to fetch friends');
      expect(console.error).toHaveBeenCalledWith(
        'Error fetching user friends:',
        mockError
      );
    });
  });

  describe('sendFriendInvite', () => {
    it('should send friend invitation successfully', async () => {
      const mockResponse = {
        message: 'Invitation sent successfully',
        invitation: {
          sender: 'user-123',
          recipient: 'friend@example.com',
          recipientUser: null,
          status: 'pending',
          _id: 'invite-123',
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
        },
      };

      mockApiClient.post.mockResolvedValue({ data: mockResponse });

      const result = await sendFriendInvite('friend@example.com');

      expect(mockApiClient.post).toHaveBeenCalledWith('/users/invites', {
        email: 'friend@example.com',
      });
      expect(result).toEqual(mockResponse);
    });

    it('should handle duplicate invitation error', async () => {
      const mockError = {
        response: {
          status: 400,
          data: { message: 'Invitation already exists' },
        },
      };
      mockApiClient.post.mockRejectedValue(mockError);

      await expect(sendFriendInvite('duplicate@example.com')).rejects.toEqual(
        mockError
      );
      expect(console.error).toHaveBeenCalledWith(
        'Error sending friend invitation:',
        mockError
      );
    });

    it('should handle invalid email format', async () => {
      const mockError = {
        response: {
          status: 400,
          data: { message: 'Invalid email format' },
        },
      };
      mockApiClient.post.mockRejectedValue(mockError);

      await expect(sendFriendInvite('invalid-email')).rejects.toEqual(
        mockError
      );
    });
  });

  describe('getUserInvitations', () => {
    it('should fetch invitations without filters', async () => {
      const mockResponse = {
        results: [
          {
            recipientUser: null,
            status: 'pending',
            resendAttempts: 0,
            sender: {
              character: {
                level: 5,
                currentXP: 250,
                _id: 'char-123',
                type: 'alchemist',
                name: 'Senderalchemist',
              },
              email: 'sender@example.com',
              id: 'user-sender',
            },
            recipient: 'recipient@example.com',
            id: 'invite-1',
          },
        ],
        page: 1,
        limit: 10,
        totalPages: 1,
        totalResults: 1,
      };

      mockApiClient.get.mockResolvedValue({ data: mockResponse });

      const result = await getUserInvitations();

      expect(mockApiClient.get).toHaveBeenCalledWith('/users/invites', {
        params: {},
      });
      expect(result).toEqual(mockResponse);
    });

    it('should fetch invitations with all filters', async () => {
      const mockResponse = {
        results: [],
        page: 2,
        limit: 20,
        totalPages: 0,
        totalResults: 0,
      };

      mockApiClient.get.mockResolvedValue({ data: mockResponse });

      const result = await getUserInvitations('pending', 2, 20);

      expect(mockApiClient.get).toHaveBeenCalledWith('/users/invites', {
        params: { status: 'pending', page: 2, limit: 20 },
      });
      expect(result).toEqual(mockResponse);
    });

    it('should handle partial filters', async () => {
      const mockResponse = {
        results: [],
        page: 1,
        limit: 10,
        totalPages: 0,
        totalResults: 0,
      };

      mockApiClient.get.mockResolvedValue({ data: mockResponse });

      const result = await getUserInvitations('accepted', undefined, 15);

      expect(mockApiClient.get).toHaveBeenCalledWith('/users/invites', {
        params: { status: 'accepted', limit: 15 },
      });
      expect(result).toEqual(mockResponse);
    });

    it('should handle fetch errors', async () => {
      const mockError = new Error('Failed to fetch invitations');
      mockApiClient.get.mockRejectedValue(mockError);

      await expect(getUserInvitations()).rejects.toThrow(
        'Failed to fetch invitations'
      );
      expect(console.error).toHaveBeenCalledWith(
        'Error fetching user invitations:',
        mockError
      );
    });
  });

  describe('acceptFriendInvitation', () => {
    it('should accept invitation successfully', async () => {
      const mockResponse = {
        message: 'Invitation accepted',
        invitation: {
          recipientUser: 'user-123',
          status: 'accepted',
          sender: 'user-sender',
          recipient: 'user-123',
          id: 'invite-123',
        },
      };

      mockApiClient.patch.mockResolvedValue({ data: mockResponse });

      const result = await acceptFriendInvitation('invite-123');

      expect(mockApiClient.patch).toHaveBeenCalledWith(
        '/users/invites/invite-123/accept'
      );
      expect(result).toEqual(mockResponse);
    });

    it('should handle invalid invitation ID', async () => {
      const mockError = {
        response: {
          status: 404,
          data: { message: 'Invitation not found' },
        },
      };
      mockApiClient.patch.mockRejectedValue(mockError);

      await expect(acceptFriendInvitation('invalid-id')).rejects.toEqual(
        mockError
      );
      expect(console.error).toHaveBeenCalledWith(
        'Error accepting friend invitation:',
        mockError
      );
    });

    it('should handle already accepted invitation', async () => {
      const mockError = {
        response: {
          status: 400,
          data: { message: 'Invitation already accepted' },
        },
      };
      mockApiClient.patch.mockRejectedValue(mockError);

      await expect(acceptFriendInvitation('invite-123')).rejects.toEqual(
        mockError
      );
    });
  });

  describe('rejectFriendInvitation', () => {
    it('should reject invitation successfully', async () => {
      const mockResponse = {
        message: 'Invitation rejected',
        invitation: {
          recipientUser: 'user-123',
          status: 'rejected',
          resendAttempts: 0,
          sender: 'user-sender',
          recipient: 'user-123',
          id: 'invite-123',
        },
      };

      mockApiClient.patch.mockResolvedValue({ data: mockResponse });

      const result = await rejectFriendInvitation('invite-123');

      expect(mockApiClient.patch).toHaveBeenCalledWith(
        '/users/invites/invite-123/reject'
      );
      expect(result).toEqual(mockResponse);
    });

    it('should handle rejection errors', async () => {
      const mockError = new Error('Failed to reject invitation');
      mockApiClient.patch.mockRejectedValue(mockError);

      await expect(rejectFriendInvitation('invite-123')).rejects.toThrow(
        'Failed to reject invitation'
      );
      expect(console.error).toHaveBeenCalledWith(
        'Error rejecting friend invitation:',
        mockError
      );
    });
  });

  describe('removeFriend', () => {
    it('should remove friend successfully', async () => {
      const mockResponse = {
        message: 'Friend removed successfully',
        success: true,
      };

      mockApiClient.delete.mockResolvedValue({ data: mockResponse });

      const result = await removeFriend('friend-123');

      expect(mockApiClient.delete).toHaveBeenCalledWith(
        '/users/friends/friend-123'
      );
      expect(result).toEqual(mockResponse);
    });

    it('should handle friend not found error', async () => {
      const mockError = {
        response: {
          status: 404,
          data: { message: 'Friend not found' },
        },
      };
      mockApiClient.delete.mockRejectedValue(mockError);

      await expect(removeFriend('invalid-friend')).rejects.toEqual(mockError);
      expect(console.error).toHaveBeenCalledWith(
        'Error removing friend:',
        mockError
      );
    });

    it('should handle unauthorized removal', async () => {
      const mockError = {
        response: {
          status: 403,
          data: { message: 'Not authorized to remove this friend' },
        },
      };
      mockApiClient.delete.mockRejectedValue(mockError);

      await expect(removeFriend('friend-123')).rejects.toEqual(mockError);
    });
  });

  describe('rescindInvitation', () => {
    it('should rescind invitation successfully', async () => {
      const mockResponse = {
        message: 'Invitation rescinded',
        success: true,
      };

      mockApiClient.delete.mockResolvedValue({ data: mockResponse });

      const result = await rescindInvitation('invite-123');

      expect(mockApiClient.delete).toHaveBeenCalledWith(
        '/users/invites/invite-123/rescind'
      );
      expect(result).toEqual(mockResponse);
    });

    it('should handle rescind errors', async () => {
      const mockError = new Error('Failed to rescind invitation');
      mockApiClient.delete.mockRejectedValue(mockError);

      await expect(rescindInvitation('invite-123')).rejects.toThrow(
        'Failed to rescind invitation'
      );
      expect(console.error).toHaveBeenCalledWith(
        'Error rescinding invitation:',
        mockError
      );
    });

    it('should handle already accepted invitation', async () => {
      const mockError = {
        response: {
          status: 400,
          data: { message: 'Cannot rescind accepted invitation' },
        },
      };
      mockApiClient.delete.mockRejectedValue(mockError);

      await expect(rescindInvitation('invite-123')).rejects.toEqual(mockError);
    });
  });

  describe('sendBulkFriendInvites', () => {
    it('should send bulk invitations successfully', async () => {
      const emails = [
        'friend1@example.com',
        'friend2@example.com',
        'friend3@example.com',
      ];
      const mockResponse = {
        message: 'Bulk invitations processed',
        totalSuccessful: 2,
        totalFailed: 1,
        successfulEmails: ['friend1@example.com', 'friend2@example.com'],
        failedEmails: [
          { email: 'friend3@example.com', reason: 'User already a friend' },
        ],
      };

      mockApiClient.post.mockResolvedValue({ data: mockResponse });

      const result = await sendBulkFriendInvites(emails);

      expect(mockApiClient.post).toHaveBeenCalledWith('/users/invites/bulk', {
        emails,
      });
      expect(result).toEqual(mockResponse);
      expect(result.totalSuccessful).toBe(2);
      expect(result.totalFailed).toBe(1);
    });

    it('should handle all invitations failing', async () => {
      const emails = ['duplicate1@example.com', 'duplicate2@example.com'];
      const mockResponse = {
        message: 'Bulk invitations processed',
        totalSuccessful: 0,
        totalFailed: 2,
        successfulEmails: [],
        failedEmails: [
          {
            email: 'duplicate1@example.com',
            reason: 'Invitation already exists',
          },
          {
            email: 'duplicate2@example.com',
            reason: 'Invitation already exists',
          },
        ],
      };

      mockApiClient.post.mockResolvedValue({ data: mockResponse });

      const result = await sendBulkFriendInvites(emails);

      expect(result.totalSuccessful).toBe(0);
      expect(result.totalFailed).toBe(2);
      expect(result.failedEmails).toHaveLength(2);
    });

    it('should handle empty email list', async () => {
      const mockResponse = {
        message: 'No emails provided',
        totalSuccessful: 0,
        totalFailed: 0,
        successfulEmails: [],
        failedEmails: [],
      };

      mockApiClient.post.mockResolvedValue({ data: mockResponse });

      const result = await sendBulkFriendInvites([]);

      expect(result.totalSuccessful).toBe(0);
      expect(result.totalFailed).toBe(0);
    });

    it('should handle bulk send errors', async () => {
      const mockError = new Error('Bulk send failed');
      mockApiClient.post.mockRejectedValue(mockError);

      await expect(sendBulkFriendInvites(['test@example.com'])).rejects.toThrow(
        'Bulk send failed'
      );
      expect(console.error).toHaveBeenCalledWith(
        'Error sending bulk friend invitations:',
        mockError
      );
    });
  });

  describe('deleteUserAccount', () => {
    it('should delete user account successfully', async () => {
      const mockResponse = {
        message: 'Account deleted successfully',
        success: true,
      };

      mockApiClient.delete.mockResolvedValue({ data: mockResponse });

      const result = await deleteUserAccount();

      expect(mockApiClient.delete).toHaveBeenCalledWith('/users/me');
      expect(result).toEqual(mockResponse);
    });

    it('should handle deletion errors', async () => {
      const mockError = new Error('Failed to delete account');
      mockApiClient.delete.mockRejectedValue(mockError);

      await expect(deleteUserAccount()).rejects.toThrow(
        'Failed to delete account'
      );
      expect(console.error).toHaveBeenCalledWith(
        'Error deleting user account:',
        mockError
      );
    });

    it('should handle unauthorized deletion', async () => {
      const mockError = {
        response: {
          status: 401,
          data: { message: 'Unauthorized' },
        },
      };
      mockApiClient.delete.mockRejectedValue(mockError);

      await expect(deleteUserAccount()).rejects.toEqual(mockError);
    });
  });

  describe('createProvisionalUser', () => {
    it('should create provisional user successfully', async () => {
      const mockCharacter = {
        type: 'alchemist' as const,
        name: 'Provisionalalchemist',
        level: 1,
        currentXP: 0,
        xpToNextLevel: 100,
      };

      const mockUuid = 'test-uuid-1234';
      const mockResponse = {
        user: {
          id: 'provisional-user-123',
          email: `${mockUuid}@unquestapp.com`,
          character: mockCharacter,
        },
        tokens: {
          access: {
            token: 'provisional-access-token',
            expires: '2024-01-02T00:00:00Z',
          },
        },
      };

      mockUuidv4.mockReturnValue(mockUuid);
      mockApiClient.post.mockResolvedValue({ data: mockResponse });

      const result = await createProvisionalUser(mockCharacter);

      expect(mockUuidv4).toHaveBeenCalled();
      expect(mockApiClient.post).toHaveBeenCalledWith('/users/provisional', {
        character: mockCharacter,
        email: `${mockUuid}@unquestapp.com`,
      });

      // Verify storage calls
      expect(mockSetItem).toHaveBeenCalledWith(
        'provisionalEmail',
        `${mockUuid}@unquestapp.com`
      );
      expect(mockSetItem).toHaveBeenCalledWith(
        'provisionalUserId',
        'provisional-user-123'
      );
      expect(mockSetItem).toHaveBeenCalledWith(
        'provisionalAccessToken',
        'provisional-access-token'
      );

      expect(result).toEqual(mockResponse.user);
    });

    it('should handle provisional email already taken error', async () => {
      const mockCharacter = {
        type: 'druid' as const,
        name: 'TestDruid',
        level: 1,
        currentXP: 0,
        xpToNextLevel: 100,
      };

      const mockError = {
        response: {
          data: {
            message: 'Email already taken',
          },
        },
      };

      mockUuidv4.mockReturnValue('duplicate-uuid');
      mockApiClient.post.mockRejectedValue(mockError);

      await expect(createProvisionalUser(mockCharacter)).rejects.toThrow(
        'PROVISIONAL_EMAIL_TAKEN'
      );
    });

    it('should handle missing tokens in response', async () => {
      const mockCharacter = {
        type: 'scout' as const,
        name: 'TestScout',
        level: 1,
        currentXP: 0,
        xpToNextLevel: 100,
      };

      const mockResponse = {
        user: {
          id: 'provisional-user-456',
          email: 'test-uuid@unquestapp.com',
          character: mockCharacter,
        },
        // No tokens in response
      };

      mockUuidv4.mockReturnValue('test-uuid');
      mockApiClient.post.mockResolvedValue({ data: mockResponse });

      const result = await createProvisionalUser(mockCharacter);

      // Should still set provisional email and user ID
      expect(mockSetItem).toHaveBeenCalledWith(
        'provisionalEmail',
        'test-uuid@unquestapp.com'
      );
      expect(mockSetItem).toHaveBeenCalledWith(
        'provisionalUserId',
        'provisional-user-456'
      );
      // Should not call setItem for access token
      expect(mockSetItem).not.toHaveBeenCalledWith(
        'provisionalAccessToken',
        expect.anything()
      );

      expect(result).toEqual(mockResponse.user);
    });

    it('should handle network errors', async () => {
      const mockCharacter = {
        type: 'alchemist' as const,
        name: 'Testalchemist',
        level: 1,
        currentXP: 0,
        xpToNextLevel: 100,
      };

      const mockError = new Error('Network error');

      mockUuidv4.mockReturnValue('test-uuid');
      mockApiClient.post.mockRejectedValue(mockError);

      await expect(createProvisionalUser(mockCharacter)).rejects.toThrow(
        'Network error'
      );

      // Should still have tried to store the provisional email
      expect(mockSetItem).toHaveBeenCalledWith(
        'provisionalEmail',
        'test-uuid@unquestapp.com'
      );
    });

    it('should handle other API errors', async () => {
      const mockCharacter = {
        type: 'alchemist' as const,
        name: 'Testalchemist',
        level: 1,
        currentXP: 0,
        xpToNextLevel: 100,
      };

      const mockError = {
        response: {
          status: 500,
          data: {
            message: 'Internal server error',
          },
        },
      };

      mockUuidv4.mockReturnValue('test-uuid');
      mockApiClient.post.mockRejectedValue(mockError);

      await expect(createProvisionalUser(mockCharacter)).rejects.toEqual(
        mockError
      );
    });
  });
});
