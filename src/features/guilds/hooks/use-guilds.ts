/**
 * Guild TanStack Query Hooks
 *
 * React Query hooks for fetching and mutating guild data.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { guildApi } from '@/api/guilds';
import type {
  CreateGuildRequest,
  Guild,
  UpdateGuildRequest,
} from '../types/guild-types';

/**
 * Query keys factory for guilds
 * Follows TanStack Query best practices for key management
 */
export const guildKeys = {
  all: ['guilds'] as const,
  lists: () => [...guildKeys.all, 'list'] as const,
  list: () => [...guildKeys.lists()] as const,
  details: () => [...guildKeys.all, 'detail'] as const,
  detail: (id: string) => [...guildKeys.details(), id] as const,
};

/**
 * Fetch all guilds the current user belongs to
 */
export const useGuilds = (options?: { enabled?: boolean }) => {
  return useQuery<Guild[]>({
    queryKey: guildKeys.list(),
    queryFn: guildApi.getMyGuilds,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    enabled: options?.enabled ?? true,
  });
};

/**
 * Fetch a single guild by ID
 */
export const useGuild = (guildId: string, options?: { enabled?: boolean }) => {
  return useQuery<Guild>({
    queryKey: guildKeys.detail(guildId),
    queryFn: () => guildApi.getGuild(guildId),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    enabled: !!guildId && (options?.enabled ?? true),
  });
};

/**
 * Create a new guild
 */
export const useCreateGuild = () => {
  const queryClient = useQueryClient();

  return useMutation<Guild, Error, CreateGuildRequest>({
    mutationFn: guildApi.createGuild,
    onSuccess: (newGuild) => {
      // Add the new guild to the list cache optimistically
      queryClient.setQueryData<Guild[]>(guildKeys.list(), (old) =>
        old ? [...old, newGuild] : [newGuild]
      );
      // Invalidate to ensure consistency
      queryClient.invalidateQueries({ queryKey: guildKeys.lists() });
    },
  });
};

/**
 * Update guild details
 */
export const useUpdateGuild = () => {
  const queryClient = useQueryClient();

  return useMutation<
    Guild,
    Error,
    { guildId: string; data: UpdateGuildRequest }
  >({
    mutationFn: ({ guildId, data }) => guildApi.updateGuild(guildId, data),
    onSuccess: (updatedGuild, { guildId }) => {
      // Update the specific guild in cache
      queryClient.setQueryData<Guild>(guildKeys.detail(guildId), updatedGuild);
      // Update in list cache as well
      queryClient.setQueryData<Guild[]>(guildKeys.list(), (old) =>
        old?.map((g) => (g.id === guildId ? updatedGuild : g))
      );
    },
  });
};

/**
 * Delete a guild
 */
export const useDeleteGuild = () => {
  const queryClient = useQueryClient();

  return useMutation<void, Error, string>({
    mutationFn: guildApi.deleteGuild,
    onSuccess: (_, guildId) => {
      // Remove from list cache
      queryClient.setQueryData<Guild[]>(guildKeys.list(), (old) =>
        old?.filter((g) => g.id !== guildId)
      );
      // Remove detail cache
      queryClient.removeQueries({ queryKey: guildKeys.detail(guildId) });
    },
  });
};

/**
 * Join a guild by invite code
 */
export const useJoinByInviteCode = () => {
  const queryClient = useQueryClient();

  return useMutation<Guild, Error, string>({
    mutationFn: guildApi.joinByInviteCode,
    onSuccess: (newGuild) => {
      // Add the joined guild to the list cache
      queryClient.setQueryData<Guild[]>(guildKeys.list(), (old) =>
        old ? [...old, newGuild] : [newGuild]
      );
      queryClient.invalidateQueries({ queryKey: guildKeys.lists() });
    },
  });
};

/**
 * Leave a guild
 */
export const useLeaveGuild = () => {
  const queryClient = useQueryClient();

  return useMutation<void, Error, string>({
    mutationFn: guildApi.leaveGuild,
    onSuccess: (_, guildId) => {
      // Remove from list cache
      queryClient.setQueryData<Guild[]>(guildKeys.list(), (old) =>
        old?.filter((g) => g.id !== guildId)
      );
      // Remove detail cache
      queryClient.removeQueries({ queryKey: guildKeys.detail(guildId) });
    },
  });
};

/**
 * Remove a member from guild (owner only)
 */
export const useRemoveMember = () => {
  const queryClient = useQueryClient();

  return useMutation<void, Error, { guildId: string; memberId: string }>({
    mutationFn: ({ guildId, memberId }) =>
      guildApi.removeMember(guildId, memberId),
    onSuccess: (_, { guildId }) => {
      // Invalidate guild detail to refetch with updated members
      queryClient.invalidateQueries({ queryKey: guildKeys.detail(guildId) });
      queryClient.invalidateQueries({ queryKey: guildKeys.lists() });
    },
  });
};

/**
 * Transfer guild ownership
 */
export const useTransferOwnership = () => {
  const queryClient = useQueryClient();

  return useMutation<Guild, Error, { guildId: string; newOwnerId: string }>({
    mutationFn: ({ guildId, newOwnerId }) =>
      guildApi.transferOwnership(guildId, newOwnerId),
    onSuccess: (updatedGuild, { guildId }) => {
      queryClient.setQueryData<Guild>(guildKeys.detail(guildId), updatedGuild);
      queryClient.invalidateQueries({ queryKey: guildKeys.lists() });
    },
  });
};

/**
 * Generate invite code for a guild
 */
export const useGenerateInviteCode = () => {
  const queryClient = useQueryClient();

  return useMutation<
    { inviteCode: string; expiresAt: string },
    Error,
    string
  >({
    mutationFn: guildApi.generateInviteCode,
    onSuccess: (data, guildId) => {
      // Update the guild with the new invite code
      queryClient.setQueryData<Guild>(guildKeys.detail(guildId), (old) =>
        old ? { ...old, inviteCode: data.inviteCode, inviteCodeExpiresAt: data.expiresAt } : old
      );
    },
  });
};
