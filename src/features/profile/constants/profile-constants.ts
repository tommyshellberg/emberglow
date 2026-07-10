/**
 * Profile Screen Constants
 *
 * Extracted from profile.tsx and sub-components to eliminate magic numbers
 * and improve maintainability.
 */
import { colors } from '@/theme';

/**
 * XP System Configuration
 */
export const XP_CONFIG = {
  /** Base XP required for level 1 */
  BASE_XP: 100,
  /** Multiplier for XP calculation per level */
  LEVEL_MULTIPLIER: 1.5,
} as const;

/**
 * Calculate XP required for a given level
 * Formula: BASE_XP * (LEVEL_MULTIPLIER ^ (level - 1))
 *
 * @param level - The character level
 * @returns XP required for that level
 */
export function calculateXPForLevel(level: number): number {
  return Math.floor(
    XP_CONFIG.BASE_XP * Math.pow(XP_CONFIG.LEVEL_MULTIPLIER, level - 1)
  );
}

/**
 * Animation Configuration for Stats Card
 */
export const STATS_ANIMATION = {
  /** Quest count animation */
  quests: {
    delay: 100,
    duration: 1200,
  },
  /** Minutes saved animation */
  minutes: {
    delay: 300,
    duration: 1500,
  },
  /** Streak count animation */
  streak: {
    delay: 500,
    duration: 1000,
  },
} as const;

/**
 * Animation Configuration for Experience Card
 */
export const EXPERIENCE_ANIMATION = {
  /** XP bar fill animation duration */
  duration: 1000,
} as const;

/**
 * UI Colors (should eventually migrate to design tokens)
 */
export const PROFILE_COLORS = {
  /** RefreshControl tint color */
  refreshControl: '#334738',
  /** Edit icon color in profile card */
  editIcon: colors.text.accent,
} as const;

/**
 * Character Sync Configuration
 */
export const CHARACTER_SYNC = {
  /** Delay before redirecting to onboarding (ms) */
  redirectDelay: 0,
} as const;
