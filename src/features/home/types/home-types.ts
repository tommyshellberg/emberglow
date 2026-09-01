import { type QuestOption } from '@/api/quest/types';

/**
 * Data structure for a carousel item representing a quest mode
 */
export interface CarouselItem {
  id: string;
  mode: 'story' | 'custom' | 'cooperative' | 'holdout';
  title: string;
  subtitle: string;
  recap: string;
  duration: number;
  xp: number;
  progress?: number;
  isPremium?: boolean;
  isCompleted?: boolean;
}

/**
 * Quest mode configuration
 */
export interface QuestMode {
  id: string;
  name: string;
  color: string;
}

/**
 * Props for PremiumCTATracker component
 */
export interface PremiumCTATrackerProps {
  questId?: string;
  type: 'storyline' | 'cooperative';
}

/**
 * Props for quest option button rendering
 */
export interface StoryOptionButtonProps {
  option: QuestOption;
  index: number;
  hasPremiumAccess: boolean;
  isStorylineComplete: boolean;
  onPress: (nextQuestId: string | null) => void;
  onShowPaywall: () => void;
}

/**
 * Return type for useCarouselState hook
 */
export interface CarouselState {
  activeIndex: number;
  progress: {
    value: number;
  };
  advance: (delta: number) => void;
  select: (index: number) => void;
}

/**
 * Return type for useHomeData hook
 */
export interface HomeData {
  carouselData: CarouselItem[];
  currentMapName: string;
  storyProgress: number;
  isStorylineComplete: boolean;
  hasStartedStoryline: boolean;
}

/**
 * Return type for useStoryOptions hook
 */
export interface StoryOptionsState {
  storyOptions: QuestOption[];
  setStoryOptions: (options: QuestOption[]) => void;
}

/**
 * Return type for useQuestSelection hook
 */
export interface QuestSelection {
  handleQuestOptionSelect: (nextQuestId: string | null) => Promise<void>;
  handleStartCustomQuest: () => void;
  handleCooperativeQuest: () => void;
  handleStartHoldoutQuest: () => void;
}
