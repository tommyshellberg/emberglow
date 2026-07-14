/**
 * Leaderboard Constants
 *
 * All magic numbers, strings, and configuration for the Leaderboard screen.
 *
 * Colors used to live here as a parallel, redundant re-derivation of
 * `@/components/ui/colors`. That's retired now that the Leaderboard screen
 * pulls its palette directly from `@/theme` (Emberglow design tokens) —
 * see the individual components under `../components/`.
 */

// ============================================================================
// STRINGS
// ============================================================================

export const STRINGS = {
  // Screen header
  title: 'Leaderboard',
  subtitle: 'See how you rank against other players and friends.',

  // Scope toggle
  scopeFriends: 'Friends',
  scopeGlobal: 'Global',

  // Tab labels
  tabQuests: 'Quests',
  tabMinutes: 'Minutes',
  tabStreaks: 'Streaks',

  // Metric labels (short form)
  metricQuests: (count: number) => `${count} quests`,
  metricMinutes: (count: number) => `${count} mins`,
  metricStreak: (count: number) => `${count} days`,

  // Metric labels (full form - for top user card)
  metricQuestsCompleted: 'Quests Completed',
  metricMinutesOffPhone: 'Minutes Off Phone',
  metricDayStreak: 'Day Streak',

  // User indicators
  currentUserSuffix: ' (You)',
  friendLabel: 'Friend',

  // Loading states
  loadingMessage: 'Loading leaderboard...',

  // Error states
  errorTitle: 'Unable to load leaderboard data',
  errorRetryButton: 'Try Again',

  // Empty states
  emptyNoData: 'No Data Yet',
  emptySignInFriends: 'Sign in to see friends',
  emptySignInMessage:
    "You need to be signed in to view your friends' rankings.",
  emptyInviteFriendsTitle: 'Invite Friends to Compete!',
  emptyInviteFriendsMessage:
    "You're doing great! Invite friends to see how you stack up against each other.",
  emptyNoFriendsStarted: "Your friends haven't started their journey yet.",
  emptyCompleteQuests: 'Complete some quests to appear on the leaderboard!',

  // Friends empty state variations (metric-specific)
  emptyFriendsQuests: 'No friends have completed quests yet. Be the first!',
  emptyFriendsMinutes: 'No friends have saved time yet. Start your journey!',
  emptyFriendsStreak: 'No friends have active streaks. Start yours today!',

  // Invite button
  inviteButtonHasFriends: 'Invite More Friends',
  inviteButtonNoFriends: 'Invite Friends',

  // Separator
  separator: '• • •',
} as const;

// ============================================================================
// UI CONFIGURATION
// ============================================================================

export const UI_CONFIG = {
  // Leaderboard limits
  topUsersLimit: 10,

  // Icon sizes
  iconSizeSmall: 20,
  iconSizeMedium: 24,
  iconSizeLarge: 28,
  iconSizeEmpty: 48,
  iconSizeTrophy: 120,

  // Avatar sizes
  avatarSizeSmall: 40, // 10 in Tailwind (w-10, h-10)
  avatarSizeLarge: 80, // 20 in Tailwind (w-20, h-20)

  // Positioning
  trophyBackgroundOffset: -8,
  trophyBackgroundRotation: '15deg',

  // Rank widths (Tailwind classes)
  rankWidth: 'w-10', // 2.5rem = 40px

  // Touch target sizes (accessibility)
  minTouchTarget: 44, // 44x44pt minimum for accessibility
} as const;

// ============================================================================
// ACCESSIBILITY
// ============================================================================

export const A11Y = {
  // Roles
  roleButton: 'button' as const,
  roleTab: 'tab' as const,

  // Labels
  labelBackButton: 'Go back to profile',
  labelScopeToggleFriends: 'View friends leaderboard',
  labelScopeToggleGlobal: 'View global leaderboard',
  labelTabQuests: 'View quests leaderboard',
  labelTabMinutes: 'View minutes leaderboard',
  labelTabStreaks: 'View streaks leaderboard',
  labelInviteFriends: 'Invite friends to compete',
  labelRetry: 'Retry loading leaderboard',

  // Hints
  hintScopeToggle: 'Switch between friends and global rankings',
  hintTabSwitch: 'Switch leaderboard type',
  hintInvite: 'Opens contact picker to invite friends',
} as const;

// ============================================================================
// ANALYTICS EVENTS
// ============================================================================

export const ANALYTICS = {
  screenView: 'leaderboard_screen_view',
  switchScope: 'leaderboard_switch_scope',
  switchType: 'leaderboard_switch_type',
  inviteFriends: 'leaderboard_invite_friends',
  retry: 'leaderboard_retry',
} as const;

// ============================================================================
// TAB CONFIGURATION
// ============================================================================

export const LEADERBOARD_TYPES = ['quests', 'minutes', 'streak'] as const;
export const SCOPE_TYPES = ['friends', 'global'] as const;

export type LeaderboardType = (typeof LEADERBOARD_TYPES)[number];
export type ScopeType = (typeof SCOPE_TYPES)[number];
