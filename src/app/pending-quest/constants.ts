/**
 * Animation configuration constants
 */
export const ANIMATION_CONFIG = {
  // Durations
  HEADER_DURATION: 500,
  CARD_DURATION: 500,
  BUTTON_DURATION: 500,
  SHIMMER_DURATION: 1000,
  QUEST_INFO_FADE_DURATION: 800,

  // Delays
  HEADER_DELAY: 0,
  CARD_DELAY: 500,
  BUTTON_DELAY: 1000,
  SHIMMER_DELAY: 1200,
  QUEST_TITLE_DELAY: 500,
  QUEST_SUBTITLE_DELAY: 600,
  LOCK_INSTRUCTIONS_DELAY: 800,

  // Initial values
  INITIAL_OPACITY: 0,
  INITIAL_SCALE: 0.9,
  FINAL_OPACITY: 1,
  FINAL_SCALE: 1,
  SHIMMER_MIN_OPACITY: 0.5,
  SHIMMER_MAX_OPACITY: 1,
} as const;

/**
 * UI configuration constants
 */
export const UI_CONFIG = {
  // Sizes
  HEADER_IMAGE_HEIGHT: 280,
  CLOCK_ICON_SIZE: 14,
  LOCK_ICON_SIZE: 18,

  // Padding and spacing
  TOP_PADDING: 32,
  HORIZONTAL_PADDING: 24,
  BOTTOM_PADDING: 48,

  // Blur
  BLUR_INTENSITY: 30,
} as const;

/**
 * Text content strings
 */
export const STRINGS = {
  TITLE: 'Start Quest',
  CUSTOM_QUEST_SUBTITLE: 'Time to focus on what matters most',
  STORY_QUEST_SUBTITLE: 'Your character is ready for their quest',
  LOCK_INSTRUCTIONS: 'Lock your phone to begin',
  CANCEL_BUTTON: 'Cancel Quest',
} as const;

/**
 * Test IDs for components
 */
export const TEST_IDS = {
  BACKGROUND_IMAGE: 'background-image',
  QUEST_CARD: 'quest-card',
  LOCK_INSTRUCTIONS: 'lock-instructions',
} as const;
