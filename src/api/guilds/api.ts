/**
 * Guild API Functions
 *
 * Low-level API calls for guild operations.
 * Use the hooks (use-guilds.ts) for React components.
 */

import { apiClient } from '../common';
import type {
  CreateGuildRequest,
  Guild,
  InviteCodeResponse,
  UpdateGuildRequest,
} from '@/features/guilds';

/**
 * Guild API endpoints
 */
export const guildApi = {
  /**
   * Get all guilds the current user belongs to
   */
  getMyGuilds: async (): Promise<Guild[]> => {
    const response = await apiClient.get('/guilds');
    return response.data;
  },

  /**
   * Get a single guild by ID
   */
  getGuild: async (guildId: string): Promise<Guild> => {
    const response = await apiClient.get(`/guilds/${guildId}`);
    return response.data;
  },

  /**
   * Create a new guild
   */
  createGuild: async (data: CreateGuildRequest): Promise<Guild> => {
    const response = await apiClient.post('/guilds', data);
    return response.data;
  },

  /**
   * Update guild details (owner only)
   */
  updateGuild: async (
    guildId: string,
    data: UpdateGuildRequest
  ): Promise<Guild> => {
    const response = await apiClient.patch(`/guilds/${guildId}`, data);
    return response.data;
  },

  /**
   * Delete a guild (owner only)
   */
  deleteGuild: async (guildId: string): Promise<void> => {
    await apiClient.delete(`/guilds/${guildId}`);
  },

  /**
   * Join a guild directly by ID (requires existing membership or invite)
   */
  joinGuild: async (guildId: string): Promise<Guild> => {
    const response = await apiClient.post(`/guilds/${guildId}/join`);
    return response.data;
  },

  /**
   * Leave a guild
   */
  leaveGuild: async (guildId: string): Promise<void> => {
    await apiClient.post(`/guilds/${guildId}/leave`);
  },

  /**
   * Remove a member from guild (owner only)
   */
  removeMember: async (guildId: string, memberId: string): Promise<void> => {
    await apiClient.delete(`/guilds/${guildId}/members/${memberId}`);
  },

  /**
   * Transfer guild ownership to another member
   */
  transferOwnership: async (
    guildId: string,
    newOwnerId: string
  ): Promise<Guild> => {
    const response = await apiClient.post(`/guilds/${guildId}/transfer`, {
      newOwnerId,
    });
    return response.data;
  },

  /**
   * Generate a new invite code for the guild
   */
  generateInviteCode: async (guildId: string): Promise<InviteCodeResponse> => {
    const response = await apiClient.post(`/guilds/${guildId}/invite-code`);
    return response.data;
  },

  /**
   * Join a guild using an invite code
   */
  joinByInviteCode: async (inviteCode: string): Promise<Guild> => {
    const response = await apiClient.post(`/guilds/join/${inviteCode}`);
    return response.data;
  },
};
