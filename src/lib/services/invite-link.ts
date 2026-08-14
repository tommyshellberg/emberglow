import { apiClient } from '@/api/common/client';

export type InviteMatchResult =
  | { matched: false }
  | { matched: true; kind: 'campaign' }
  | {
      matched: true;
      kind: 'friend';
      code: string;
      inviter: { characterName: string };
    };

export type InviteClaimResult = {
  status: 'created' | 'already_pending' | 'already_friends';
  invitationId?: string;
};

export type InviteResolveResult = {
  code: string;
  inviter: { characterName: string };
  isSelf: boolean;
  alreadyFriends: boolean;
};

/**
 * Get the current user's invite link
 * @returns Object containing invite code and shareable URL
 */
export async function getInviteLink(): Promise<{ code: string; url: string }> {
  try {
    const response = await apiClient.get('/users/me/invite-link');
    return response.data;
  } catch (error) {
    console.error('Error fetching invite link:', error);
    throw error;
  }
}

/**
 * Match an invite based on platform and optional install referrer
 * @param payload Object containing platform and optional installReferrer
 * @returns Result indicating if invite was matched and what kind
 */
export async function matchInvite(payload: {
  platform: 'ios' | 'android';
  installReferrer?: string;
}): Promise<InviteMatchResult> {
  try {
    const response = await apiClient.post('/invites/match', payload);
    return response.data;
  } catch (error) {
    console.error('Error matching invite:', error);
    throw error;
  }
}

/**
 * Resolve an invite code to get inviter details
 * @param code The invite code to resolve
 * @returns Resolved invite details including inviter info
 */
export async function resolveInviteCode(
  code: string
): Promise<InviteResolveResult> {
  try {
    const response = await apiClient.get(`/invites/resolve/${code}`);
    return response.data;
  } catch (error) {
    console.error('Error resolving invite code:', error);
    throw error;
  }
}

/**
 * Claim an invite by code
 * @param code The invite code to claim
 * @returns Result containing claim status and optional invitation ID
 */
export async function claimInvite(code: string): Promise<InviteClaimResult> {
  try {
    const response = await apiClient.post('/invites/claim', { code });
    return response.data;
  } catch (error) {
    console.error('Error claiming invite:', error);
    throw error;
  }
}
