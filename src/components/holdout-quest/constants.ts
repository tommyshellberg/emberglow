import { HOLDOUT_MIN_MINUTES } from '@/app/utils/quest-utils';

export const SCREEN_TITLE = 'Hold Out';
export const SCREEN_EYEBROW = 'No time limit';
export const SCREEN_SUBTITLE =
  'Lock your phone and see how long you can last. The longer you hold, the bigger the reward.';
// Two deliberate lines (the rule, then the stake) so neither ever wraps.
export const UNLOCK_RULE = `Unlock after ${HOLDOUT_MIN_MINUTES} minutes to collect your reward.`;
export const UNLOCK_STAKE = 'Any earlier and the quest fails.';
export const START_BUTTON_LABEL = 'Start Holding Out';
export const DEFAULT_CATEGORY = 'other';
export const ANALYTICS_EVENTS = {
  OPEN_SCREEN: 'open_holdout_quest_screen',
  START_QUEST_TRIGGER: 'trigger_start_holdout_quest',
} as const;
export const ERROR_MESSAGE_QUEST_CREATION_FAILED =
  'Failed to create quest. Please try again.';
