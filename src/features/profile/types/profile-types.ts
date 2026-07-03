/**
 * Profile Screen Type Definitions
 *
 * Extracted to eliminate `any` types and improve type safety.
 */

import type { CharacterType } from '@/store/types';

/**
 * Character data structure
 */
export interface Character {
  name: string;
  type: CharacterType;
  level: number;
  currentXP: number;
}

/**
 * User with legacy character format (character data at top level)
 * Used for syncing character data from server that may still use old format
 */
export interface UserWithLegacyCharacter {
  _id: string;
  email: string;
  /** Legacy format: character type at user level */
  type?: CharacterType;
  /** Legacy format: character name at user level */
  name?: string;
  /** Legacy format: level at user level */
  level?: number;
  /** Legacy format: XP at user level */
  xp?: number;
  /** Daily quest streak */
  dailyQuestStreak?: number;
  /** Total quests completed (server stat) */
  totalQuestsCompleted?: number;
  /** Total minutes off phone (server stat) */
  totalMinutesOffPhone?: number;
  /** Spirit meter value (Spirit Fading feature); null when inactive/dormant */
  spirit?: number | null;
  /** ISO timestamp of the last Restoration, if any */
  spiritRestoredAt?: string | null;
  /** Number of times spirit has been restored */
  restorationCount?: number;
}

/**
 * Props for ActionCard component
 */
export interface ActionCardProps {
  /** Icon component to display */
  icon: React.ComponentType<{ size: number; color: string }>;
  /** Card title */
  title: string;
  /** Card description */
  description: string;
  /** Press handler */
  onPress: () => void;
}
