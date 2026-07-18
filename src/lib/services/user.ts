import { v4 as uuidv4 } from 'uuid';

import { apiClient } from '@/api/common/client';
import { posthogClient } from '@/lib/posthog';
import { setItem } from '@/lib/storage';
import type { Character } from '@/store/types';

export interface UserDetails {
  id: string;
  email: string;
  role: string;
  type: string;
  name: string;
  level: number;
  xp: number;
  dailyQuestStreak: number;
  totalQuestsCompleted?: number;
  totalMinutesOffPhone?: number;
  featureFlags: string[];
  hasPremiumAccess: boolean;
  isProvisional: boolean;
  createdAt: Date;
  completedQuests: any[];
  friends: any[];
  pendingFriends: any[];
  blockedUsers: any[];
  inventory: any[];
}

export interface FriendCharacter {
  _id: string;
  level: number;
  currentXP: number;
  xpToNextLevel: number;
  type: string;
  name: string;
}

export interface FriendDetails {
  _id: string;
  // Friend lookups can come back keyed by `userId`/`id` instead of `_id`
  // depending on the endpoint; callers fall back across all three.
  userId?: string;
  id?: string;
  email: string;
  displayName?: string;
  isEmailVerified: boolean;
  friends: string[];
  pendingFriends: string[];
  character: FriendCharacter;
  dailyQuestStreak: number;
}

export interface FriendsResponse {
  count: number;
  friends: FriendDetails[];
}

export interface InvitationUser {
  character: {
    level: number;
    currentXP: number;
    _id: string;
    xpToNextLevel?: number;
    type: string;
    name: string;
  } | null;
  email: string;
  id: string;
}

export interface Invitation {
  recipientUser: InvitationUser | null;
  status: string;
  resendAttempts: number;
  sender: InvitationUser;
  recipient: string;
  id: string;
}

export interface InvitationsResponse {
  results: Invitation[];
  page: number;
  limit: number;
  totalPages: number;
  totalResults: number;
}

export const getUserDetails = async (): Promise<UserDetails> => {
  try {
    console.log('fetching user details');
    const response = await apiClient.get('/users/me');
    return response.data;
  } catch (error) {
    console.error('Error fetching user details:', error);
    // Note: The apiClient interceptor already handles 401 errors and token refresh failures
    // If token refresh fails, the interceptor calls signOut() which clears auth state
    // No additional handling needed here to avoid dependency cycles
    throw error;
  }
};

/**
 * Update the current user's character on the server.
 * This sends a PATCH request to '/me/' with the updated character data.
 */
export async function updateUserCharacter(character: Character): Promise<any> {
  const response = await apiClient.patch('users/me/', { character });
  return response.data;
}

/**
 * Get the user's friends list with pagination
 * @param page Page number (starts at 1)
 * @param pageSize Number of friends per page
 * @returns List of friends with count
 */
export async function getUserFriends(
  page: number = 1,
  pageSize: number = 10
): Promise<FriendsResponse> {
  try {
    const response = await apiClient.get('/users/friends', {
      params: {
        page,
        page_size: pageSize,
      },
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching user friends:', error);
    throw error;
  }
}

/**
 * Send a friend invitation to a user by email address
 * @param email Email address of the user to invite
 * @returns Response with invitation details
 */
export async function sendFriendInvite(email: string): Promise<{
  message: string;
  invitation: {
    sender: string;
    recipient: string;
    recipientUser: string | null;
    status: string;
    _id: string;
    createdAt: string;
    updatedAt: string;
  };
}> {
  try {
    const response = await apiClient.post('/users/invites', { email });
    return response.data;
  } catch (error) {
    console.error('Error sending friend invitation:', error);
    throw error;
  }
}

/**
 * Get friend invitations (both sent and received)
 * @param status Filter invitations by status (e.g., 'pending', 'accepted', 'rejected')
 * @param page Page number for pagination
 * @param limit Number of results per page
 * @returns List of invitations matching the criteria
 */
export async function getUserInvitations(
  status?: string,
  page?: number,
  limit?: number
): Promise<InvitationsResponse> {
  try {
    const params: Record<string, any> = {};

    if (status) {
      params.status = status;
    }

    if (page) {
      params.page = page;
    }

    if (limit) {
      params.limit = limit;
    }

    const response = await apiClient.get('/users/invites', { params });
    return response.data;
  } catch (error) {
    console.error('Error fetching user invitations:', error);
    throw error;
  }
}

/**
 * Accept a friend invitation
 * @param invitationId ID of the invitation to accept
 * @returns Response with updated invitation details
 */
export async function acceptFriendInvitation(invitationId: string): Promise<{
  message: string;
  invitation: {
    recipientUser: string;
    status: string;
    sender: string;
    recipient: string;
    id: string;
  };
}> {
  try {
    const response = await apiClient.patch(
      `/users/invites/${invitationId}/accept`
    );
    return response.data;
  } catch (error) {
    console.error('Error accepting friend invitation:', error);
    throw error;
  }
}

/**
 * Reject a friend invitation
 * @param invitationId ID of the invitation to reject
 * @returns Response with updated invitation details
 */
export async function rejectFriendInvitation(invitationId: string): Promise<{
  message: string;
  invitation: {
    recipientUser: string;
    status: string;
    resendAttempts: number;
    sender: string;
    recipient: string;
    id: string;
  };
}> {
  try {
    const response = await apiClient.patch(
      `/users/invites/${invitationId}/reject`
    );
    return response.data;
  } catch (error) {
    console.error('Error rejecting friend invitation:', error);
    throw error;
  }
}

/**
 * Remove a friend from the user's friends list
 * @param friendId ID of the friend to remove
 * @returns Response with success message
 */
export async function removeFriend(friendId: string): Promise<{
  message: string;
  success: boolean;
}> {
  try {
    const response = await apiClient.delete(`/users/friends/${friendId}`);
    return response.data;
  } catch (error) {
    console.error('Error removing friend:', error);
    throw error;
  }
}

/**
 * Rescind (cancel) a friend invitation that the current user has sent
 * @param inviteId ID of the invitation to rescind
 * @returns Response with success message
 */
export async function rescindInvitation(inviteId: string): Promise<{
  message: string;
  success: boolean;
}> {
  try {
    const response = await apiClient.delete(
      `/users/invites/${inviteId}/rescind`
    );
    return response.data;
  } catch (error) {
    console.error('Error rescinding invitation:', error);
    throw error;
  }
}

/**
 * Send bulk friend invitations to multiple email addresses
 * @param emails Array of email addresses to invite
 * @returns Response with success/failure details for each email
 */
export async function sendBulkFriendInvites(emails: string[]): Promise<{
  message: string;
  totalSuccessful: number;
  totalFailed: number;
  successfulEmails: string[];
  failedEmails: { email: string; reason: string }[];
}> {
  try {
    const response = await apiClient.post('/users/invites/bulk', { emails });
    return response.data;
  } catch (error) {
    console.error('Error sending bulk friend invitations:', error);
    throw error;
  }
}

/**
 * Delete the current user's account
 * @returns Response with success message
 */
export async function deleteUserAccount(): Promise<{
  message: string;
  success: boolean;
}> {
  try {
    const response = await apiClient.delete('/users/me');
    return response.data;
  } catch (error) {
    console.error('Error deleting user account:', error);
    throw error;
  }
}

/**
 * Force refresh the user's premium status from RevenueCat
 * This should be called after a successful purchase to sync the server
 * @returns Response with updated premium status
 */
export async function refreshPremiumStatus(): Promise<{
  success: boolean;
  hasPremiumAccess: boolean;
  message: string;
}> {
  try {
    const response = await apiClient.post('/users/me/refresh-premium');
    return response.data;
  } catch (error) {
    console.error('Error refreshing premium status:', error);
    throw error;
  }
}

/**
 * Create a provisional user account with the selected character
 * @param character Character details to associate with the provisional user
 * @returns The created provisional user data
 */
export async function createProvisionalUser(
  character: Character
): Promise<any> {
  try {
    // Generate a provisional email using UUID
    const provisionalEmail = `${uuidv4()}@unquestapp.com`;

    // Store the email in local storage with error handling
    try {
      setItem('provisionalEmail', provisionalEmail);
    } catch (storageError) {
      console.error('[createProvisionalUser] Storage failed:', storageError);
      throw new Error('STORAGE_UNAVAILABLE');
    }

    const response = await apiClient.post('/users/provisional', {
      character,
      email: provisionalEmail,
    });

    console.log('response data', response.data);

    // Store the user ID and tokens
    console.log('setting provisional user id', response.data.user.id);
    setItem('provisionalUserId', response.data.user.id);

    // Identify as early as possible so all onboarding events attach to the
    // server-side user id (same id given to OneSignal and RevenueCat).
    posthogClient.identify(response.data.user.id);

    // Store the access token separately from regular auth tokens
    if (response.data.tokens?.access?.token) {
      console.log(
        'setting provisional access token',
        response.data.tokens.access.token
      );
      setItem('provisionalAccessToken', response.data.tokens.access.token);
    }

    // Store refresh token if provided
    if (response.data.tokens?.refresh?.token) {
      console.log(
        'setting provisional refresh token',
        response.data.tokens.refresh.token
      );
      setItem('provisionalRefreshToken', response.data.tokens.refresh.token);
    }

    // Set OneSignal external ID for provisional user
    if (response.data.user?.id && (global as any).isOneSignalInitialized) {
      console.log(
        '[OneSignal] Setting external ID for newly created provisional user:',
        response.data.user.id
      );
      const { OneSignal } = require('react-native-onesignal');
      OneSignal.login(response.data.user.id);
    }

    return response.data.user;
  } catch (error: unknown) {
    // If email is taken, we can indicate it for special handling
    if (error && typeof error === 'object' && 'response' in error) {
      const axiosError = error as {
        response?: { data?: { message?: string } };
      };
      if (axiosError.response?.data?.message === 'Email already taken') {
        throw new Error('PROVISIONAL_EMAIL_TAKEN');
      }
    }
    throw error;
  }
}
