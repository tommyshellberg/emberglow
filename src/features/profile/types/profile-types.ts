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
}
