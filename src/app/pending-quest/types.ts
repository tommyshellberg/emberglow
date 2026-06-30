import { type ViewStyle } from 'react-native';

/**
 * Quest mode type - determines quest type and behavior
 */
export type QuestMode = 'story' | 'custom' | 'cooperative';

/**
 * Pending quest data structure
 */
export interface PendingQuestData {
  id: string;
  title: string;
  durationMinutes: number;
  mode?: QuestMode;
  // Story quest specific
  poiSlug?: string;
  story?: string;
  recap?: string;
  options?: unknown[];
  // Custom quest specific
  category?: string;
  reward?: {
    xp: number;
  };
}

/**
 * Character data structure
 */
export interface CharacterData {
  type: string;
  name: string;
}

/**
 * Animation styles returned from the animation hook
 */
export interface AnimationStyles {
  headerStyle: ViewStyle;
  cardStyle: ViewStyle;
  buttonStyle: ViewStyle;
  shimmerStyle: ViewStyle;
}
