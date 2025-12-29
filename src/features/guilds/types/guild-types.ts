/**
 * Guild Types
 *
 * TypeScript type definitions for the Guilds feature.
 */

/**
 * Available guild icon types
 * Each icon represents a different visual identity for guilds
 */
export type GuildIcon =
  | 'axe'
  | 'hammer'
  | 'camping'
  | 'mug'
  | 'flame'
  | 'explorer'
  | 'magic'
  | 'banner'
  | 'scroll'
  | 'diamond';

/**
 * Guild member information
 * Represents a user who belongs to a guild
 */
export interface GuildMember {
  id: string;
  character?: {
    name?: string;
    type?: string;
  };
}

/**
 * Guild statistics
 * Tracks collective achievements of the guild
 */
export interface GuildStats {
  questCount: number;
  totalMinutes: number;
}

/**
 * Core Guild entity
 * Represents an accountability group in the app
 */
export interface Guild {
  id: string;
  name: string;
  icon: GuildIcon;
  tagline?: string;
  owner: GuildMember;
  members: GuildMember[];
  stats: GuildStats;
  inviteCode?: string;
  inviteCodeExpiresAt?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Request payload for creating a new guild
 */
export interface CreateGuildRequest {
  name: string;
  icon?: GuildIcon;
  tagline?: string;
}

/**
 * Request payload for updating a guild
 */
export interface UpdateGuildRequest {
  name?: string;
  icon?: GuildIcon;
  tagline?: string;
}

/**
 * Response from invite code generation
 */
export interface InviteCodeResponse {
  inviteCode: string;
  expiresAt: string;
}

/**
 * Props for GuildCard component
 */
export interface GuildCardProps {
  guild: Guild;
  onPress: () => void;
  isOwner?: boolean;
}

/**
 * Props for GuildHeader component
 */
export interface GuildHeaderProps {
  guild: Guild;
  isOwner: boolean;
  onEditPress?: () => void;
}

/**
 * Props for GuildMemberItem component
 */
export interface GuildMemberItemProps {
  member: GuildMember;
  isOwner: boolean;
  isCurrentUser: boolean;
  canManage: boolean;
  onRemove?: () => void;
}

/**
 * Props for GuildIconSelector component
 */
export interface GuildIconSelectorProps {
  selected: GuildIcon | null;
  onSelect: (icon: GuildIcon) => void;
}

/**
 * Props for GuildEmptyState component
 */
export interface GuildEmptyStateProps {
  onCreatePress: () => void;
  onJoinPress: () => void;
}

/**
 * Props for GuildStatsRing component (Phase 4)
 */
export interface GuildStatsRingProps {
  stats: GuildStats;
  animated?: boolean;
}

/**
 * Props for CreateGuildModal component
 */
export interface CreateGuildModalProps {
  visible: boolean;
  onSubmit: (data: CreateGuildRequest) => void;
  onClose: () => void;
  isLoading: boolean;
  error?: string;
}

/**
 * Props for JoinGuildModal component
 */
export interface JoinGuildModalProps {
  visible: boolean;
  onSubmit: (code: string) => void;
  onClose: () => void;
  isLoading: boolean;
  error?: string;
}

/**
 * Guild store state
 */
export interface GuildState {
  guilds: Guild[];
  currentGuildId: string | null;
  isLoading: boolean;
  isCreating: boolean;
  isJoining: boolean;
}

/**
 * Guild store actions
 */
export interface GuildActions {
  setGuilds: (guilds: Guild[]) => void;
  addGuild: (guild: Guild) => void;
  updateGuild: (guildId: string, updates: Partial<Guild>) => void;
  removeGuild: (guildId: string) => void;
  setCurrentGuild: (guildId: string | null) => void;
  setLoading: (isLoading: boolean) => void;
  setCreating: (isCreating: boolean) => void;
  setJoining: (isJoining: boolean) => void;
  reset: () => void;
}

/**
 * Combined guild store type
 */
export type GuildStore = GuildState & GuildActions;
