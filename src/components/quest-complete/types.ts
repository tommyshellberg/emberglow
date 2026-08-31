import type { Quest, StoryQuestTemplate } from '@/store/types';

export type QuestWithMode = Quest & {
  heroName?: string;
  mode?: 'story' | 'custom' | 'cooperative' | 'holdout';
};

export type QuestCompleteProps = {
  quest: QuestWithMode;
  story: string;
  /**
   * Maps to the mockup's `fromJournal` flag (quest-flow.jsx:105) — true when
   * viewing a completed quest from the Journal, false for the celebratory
   * post-quest-completion flow. Drives the eyebrow suffix, the success
   * "Complete" pill, and whether the secondary Continue button renders.
   * @default false
   */
  fromJournal?: boolean;
  /** Whether this quest already has a reflection attached (server or local) — hides the Add reflection button when true. */
  hasReflection?: boolean;
  /** Back-button handler for the art header's floating disc. Falls back to `onContinue`, then a no-op. */
  onBack?: () => void;
  onContinue?: () => void;
  continueText?: string;
  showActionButton?: boolean;
  disableEnteringAnimations?: boolean;
};

export type QuestImageProps = {
  quest: QuestWithMode;
  disableAnimations?: boolean;
};

export type QuestCompleteHeaderProps = {
  quest: QuestWithMode;
  fromJournal?: boolean;
  onBack: () => void;
  disableAnimations?: boolean;
};

export type QuestCompleteStoryProps = {
  story: string;
  quest: QuestWithMode;
  disableAnimations?: boolean;
};

export type QuestCompleteActionsProps = {
  quest: QuestWithMode;
  fromJournal?: boolean;
  hasReflection?: boolean;
  onContinue?: () => void;
  continueText: string;
  disableAnimations?: boolean;
};

export type POIImageKey = keyof typeof POI_IMAGES;

// Type guard to check if quest is a story quest
export function isStoryQuest(
  quest: QuestWithMode
): quest is StoryQuestTemplate & QuestWithMode {
  return quest.mode === 'story';
}

// Re-export for convenience
export const POI_IMAGES = {
  1: require('@/../assets/images/fog-pois/vaedros-poi-img-1.png'),
  2: require('@/../assets/images/fog-pois/vaedros-poi-img-2.png'),
  3: require('@/../assets/images/fog-pois/vaedros-poi-img-3.png'),
  4: require('@/../assets/images/fog-pois/vaedros-poi-img-4.png'),
  5: require('@/../assets/images/fog-pois/vaedros-poi-img-5.png'),
  6: require('@/../assets/images/fog-pois/vaedros-poi-img-6.png'),
  7: require('@/../assets/images/fog-pois/vaedros-poi-img-7.png'),
  8: require('@/../assets/images/fog-pois/vaedros-poi-img-8.png'),
  9: require('@/../assets/images/fog-pois/vaedros-poi-img-9.png'),
  10: require('@/../assets/images/fog-pois/vaedros-poi-img-10.png'),
  11: require('@/../assets/images/fog-pois/vaedros-poi-img-11.png'),
  12: require('@/../assets/images/fog-pois/vaedros-poi-img-12.png'),
  13: require('@/../assets/images/fog-pois/vaedros-poi-img-13.png'),
  14: require('@/../assets/images/fog-pois/vaedros-poi-img-14.png'),
  15: require('@/../assets/images/fog-pois/vaedros-poi-img-15.png'),
  16: require('@/../assets/images/fog-pois/vaedros-poi-img-16.png'),
  17: require('@/../assets/images/fog-pois/vaedros-poi-img-17.png'),
  18: require('@/../assets/images/fog-pois/vaedros-poi-img-18.png'),
  19: require('@/../assets/images/fog-pois/vaedros-poi-img-19.png'),
  20: require('@/../assets/images/fog-pois/vaedros-poi-img-20.png'),
  21: require('@/../assets/images/fog-pois/vaedros-poi-img-21.png'),
  22: require('@/../assets/images/fog-pois/vaedros-poi-img-22.png'),
  23: require('@/../assets/images/fog-pois/vaedros-poi-img-23.png'),
  24: require('@/../assets/images/fog-pois/vaedros-poi-img-24.png'),
  25: require('@/../assets/images/fog-pois/vaedros-poi-img-25.png'),
  26: require('@/../assets/images/fog-pois/vaedros-poi-img-26.png'),
  27: require('@/../assets/images/fog-pois/vaedros-poi-img-27.png'),
  28: require('@/../assets/images/fog-pois/vaedros-poi-img-28.png'),
  29: require('@/../assets/images/fog-pois/vaedros-poi-img-29.png'),
  30: require('@/../assets/images/fog-pois/vaedros-poi-img-30.png'),
  31: require('@/../assets/images/fog-pois/vaedros-poi-img-31.png'),
} as const;
