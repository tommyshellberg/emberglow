/**
 * Guild Permission Hooks
 *
 * Helpers for checking guild permissions based on current user's role.
 */

import { useMemo } from 'react';

import type { Guild, GuildMember } from '../types/guild-types';

interface GuildPermissions {
  isOwner: boolean;
  isMember: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canInvite: boolean;
  canRemoveMembers: boolean;
  canTransferOwnership: boolean;
  canLeave: boolean;
}

/**
 * Calculate guild permissions for a user
 */
export function getGuildPermissions(
  guild: Guild | undefined,
  userId: string | undefined
): GuildPermissions {
  if (!guild || !userId) {
    return {
      isOwner: false,
      isMember: false,
      canEdit: false,
      canDelete: false,
      canInvite: false,
      canRemoveMembers: false,
      canTransferOwnership: false,
      canLeave: false,
    };
  }

  const isOwner = guild.owner.id === userId;
  const isMember = guild.members.some((m) => m.id === userId);

  return {
    isOwner,
    isMember,
    canEdit: isOwner,
    canDelete: isOwner,
    canInvite: isMember, // Any member can share invite code
    canRemoveMembers: isOwner,
    canTransferOwnership: isOwner,
    canLeave: isMember && !isOwner, // Owner must transfer first
  };
}

/**
 * Hook to get current user's permissions for a guild
 */
export function useGuildPermissions(
  guild: Guild | undefined,
  currentUserId: string | undefined
): GuildPermissions {
  return useMemo(
    () => getGuildPermissions(guild, currentUserId),
    [guild, currentUserId]
  );
}

/**
 * Check if a member can be removed from a guild
 * (Cannot remove owner, only owner can remove others)
 */
export function canRemoveMember(
  guild: Guild,
  currentUserId: string,
  targetMember: GuildMember
): boolean {
  const isCurrentUserOwner = guild.owner.id === currentUserId;
  const isTargetOwner = guild.owner.id === targetMember.id;

  // Owner cannot be removed, and only owner can remove others
  return isCurrentUserOwner && !isTargetOwner;
}
