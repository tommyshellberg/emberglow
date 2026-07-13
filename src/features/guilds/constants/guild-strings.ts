/**
 * Guild UI Strings and Error Messages
 *
 * Centralized strings for the Guilds feature to maintain consistency
 * and enable future localization.
 */

/**
 * Guild limits and constraints
 */
export const GUILD_LIMITS = {
  /** Maximum guilds a user can belong to */
  MAX_GUILDS_PER_USER: 3,
  /** Maximum members per guild */
  MAX_MEMBERS_PER_GUILD: 10,
  /** Maximum characters for guild name */
  MAX_NAME_LENGTH: 50,
  /** Maximum characters for guild tagline */
  MAX_TAGLINE_LENGTH: 100,
  /** Invite code validity in days */
  INVITE_CODE_EXPIRY_DAYS: 7,
} as const;

/**
 * Section titles and headers
 */
export const GUILD_TITLES = {
  /** Profile section header */
  SECTION_TITLE: 'Guilds',
  /** Create guild modal title */
  CREATE_TITLE: 'Create Guild',
  /** Join guild modal title */
  JOIN_TITLE: 'Join Guild',
  /** Edit guild modal title */
  EDIT_TITLE: 'Edit Guild',
  /** Members section header */
  MEMBERS_TITLE: 'Members',
  /** Stats section header */
  STATS_TITLE: 'Guild Stats',
} as const;

/**
 * Button labels
 */
export const GUILD_BUTTONS = {
  CREATE: 'Create a Guild',
  JOIN: 'Join with Code',
  INVITE: 'Invite',
  LEAVE: 'Leave Guild',
  DELETE: 'Delete Guild',
  TRANSFER: 'Transfer Ownership',
  EDIT: 'Edit Guild',
  REMOVE: 'Remove',
  CANCEL: 'Cancel',
  CONFIRM: 'Confirm',
  COPY_CODE: 'Copy Invite Code',
  SHARE_CODE: 'Share Invite Code',
  GENERATE_CODE: 'Generate New Code',
} as const;

/**
 * Form labels and placeholders
 */
export const GUILD_FORM = {
  NAME_LABEL: 'Guild Name',
  NAME_PLACEHOLDER: 'Enter guild name',
  TAGLINE_LABEL: 'Tagline (optional)',
  TAGLINE_PLACEHOLDER: 'A short motto for your guild',
  ICON_LABEL: 'Choose an Icon',
  INVITE_CODE_LABEL: 'Invite Code',
  INVITE_CODE_PLACEHOLDER: 'Enter 8-character code',
} as const;

/**
 * Validation error messages
 */
export const GUILD_VALIDATION = {
  NAME_REQUIRED: 'Guild name is required',
  NAME_TOO_LONG: `Guild name must be ${GUILD_LIMITS.MAX_NAME_LENGTH} characters or less`,
  TAGLINE_TOO_LONG: `Tagline must be ${GUILD_LIMITS.MAX_TAGLINE_LENGTH} characters or less`,
  INVITE_CODE_REQUIRED: 'Invite code is required',
  INVITE_CODE_INVALID: 'Invalid invite code format',
} as const;

/**
 * API error messages (user-facing)
 */
export const GUILD_ERRORS = {
  CREATE_FAILED: 'Unable to create guild. Please try again.',
  JOIN_FAILED: 'Unable to join guild. Please check your code.',
  LEAVE_FAILED: 'Unable to leave guild. Please try again.',
  UPDATE_FAILED: 'Unable to update guild. Please try again.',
  DELETE_FAILED: 'Unable to delete guild. Please try again.',
  REMOVE_MEMBER_FAILED: 'Unable to remove member. Please try again.',
  TRANSFER_FAILED: 'Unable to transfer ownership. Please try again.',
  INVALID_CODE: 'This invite code is invalid or expired.',
  GUILD_FULL: `This guild is full (max ${GUILD_LIMITS.MAX_MEMBERS_PER_GUILD} members).`,
  MAX_GUILDS: `You can only be in ${GUILD_LIMITS.MAX_GUILDS_PER_USER} guilds at a time.`,
  NOT_OWNER: 'Only the guild owner can do this.',
  TRANSFER_FIRST: 'Transfer ownership before leaving.',
  NETWORK_ERROR: 'Connection issue. Please check your network.',
  NOT_FOUND: 'Guild not found.',
  /** Shown when a typed invite code matches no guild (server 404). */
  CODE_NOT_FOUND: "Couldn't find this invite code",
  ALREADY_MEMBER: 'You are already a member of this guild.',
} as const;

/**
 * Success messages (for toasts)
 */
export const GUILD_SUCCESS = {
  CREATED: 'Guild created successfully!',
  JOINED: 'Welcome to the guild!',
  LEFT: 'You have left the guild.',
  UPDATED: 'Guild updated successfully.',
  DELETED: 'Guild has been deleted.',
  MEMBER_REMOVED: 'Member has been removed.',
  OWNERSHIP_TRANSFERRED: 'Ownership transferred successfully.',
  CODE_COPIED: 'Invite code copied to clipboard.',
  CODE_GENERATED: 'New invite code generated.',
} as const;

/**
 * Empty state content
 */
export const GUILD_EMPTY_STATE = {
  TITLE: 'Stronger Together',
  DESCRIPTION:
    'Join a guild to quest with friends and hold each other accountable.',
  NO_MEMBERS: 'No other members yet',
} as const;

/**
 * Confirmation dialogs
 */
export const GUILD_CONFIRMATIONS = {
  LEAVE_TITLE: 'Leave Guild?',
  LEAVE_MESSAGE: 'Are you sure you want to leave this guild?',
  DELETE_TITLE: 'Delete Guild?',
  DELETE_MESSAGE:
    'This will permanently delete the guild and remove all members. This action cannot be undone.',
  REMOVE_MEMBER_TITLE: 'Remove Member?',
  REMOVE_MEMBER_MESSAGE: (name: string) =>
    `Are you sure you want to remove ${name} from the guild?`,
  TRANSFER_TITLE: 'Transfer Ownership?',
  TRANSFER_MESSAGE: (name: string) =>
    `Are you sure you want to make ${name} the new owner? You will become a regular member.`,
} as const;

/**
 * Accessibility labels
 */
export const GUILD_A11Y = {
  GUILD_CARD: (name: string, memberCount: number) =>
    `${name} guild with ${memberCount} members. Tap to view details.`,
  OWNER_BADGE: 'Guild owner',
  CURRENT_USER: 'You',
  MEMBER_COUNT: (count: number, max: number) => `${count} of ${max} members`,
  STATS_QUESTS: (count: number) => `${count} quests completed by guild members`,
  STATS_MINUTES: (minutes: number) =>
    `${minutes} total minutes of digital wellness`,
} as const;

/**
 * Stats labels
 */
export const GUILD_STATS_LABELS = {
  QUESTS: 'quests',
  MINUTES: 'minutes',
} as const;
