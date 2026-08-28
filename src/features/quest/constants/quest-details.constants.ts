/**
 * Quest Details Screen Constants
 *
 * All magic strings and numbers used in the quest details screen.
 */

// Screen Text
export const SCREEN_TITLE = 'Quest Details';
export const QUEST_NOT_FOUND_MESSAGE = 'Quest not found.';
export const GO_BACK_BUTTON_TEXT = 'Go Back';
export const LOADING_MESSAGE = 'Loading quest details...';

// Reflection Section
export const REFLECTION_HEADER_TEXT = 'Reflection';
export const REFLECTION_ADDED_BADGE_TEXT = 'Added';
export const ADD_REFLECTION_BUTTON_TEXT = 'Add Reflection';

// Default Quest Story
export const DEFAULT_QUEST_STORY = 'Congratulations on completing your quest!';

// Animation
export const HEADER_FADE_IN_DURATION = 800;

// Mood Emojis (mapped by mood value 1-5)
export const MOOD_EMOJIS = {
  1: '😡',
  2: '😕',
  3: '😐',
  4: '😊',
  5: '😄',
} as const;

// Navigation Routes
export const REFLECTION_ROUTE = '/(app)/quest/reflection' as const;
export const APP_HOME_ROUTE = '/(app)' as const;

// Reflection Navigation Params
export const REFLECTION_PARAM_FROM_VALUE = 'quest-detail' as const;

// Store Review Prompt
/** Delay before the automatic store-review prompt, so the OS sheet never
 * stomps the XP/celebration animation on the quest-complete screen. */
export const REVIEW_PROMPT_DELAY_MS = 2000;
