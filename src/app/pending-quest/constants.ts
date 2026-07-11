/**
 * Shared by `pending-quest.tsx` and `cooperative-pending-quest.tsx` (which
 * imports `ANIMATION_CONFIG`, `STRINGS`, and `UI_CONFIG` from this module).
 * Check both screens before changing an existing value here — add
 * screen-specific values as local constants in the screen file instead of
 * repurposing an entry both screens read.
 */

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
 *
 * `HORIZONTAL_PADDING` is the one value both screens still read at the same
 * value (24). `HEADER_IMAGE_HEIGHT`, `DURATION_OVERLAY_ICON_SIZE`,
 * `LOCK_ICON_SIZE`, and `BOTTOM_PADDING` are only consumed by
 * `cooperative-pending-quest.tsx` now — `pending-quest.tsx` moved to its own
 * fixed-height hero card art, a duration/XP meta line, and its own
 * (different) lock-icon size and content bottom padding, defined locally in
 * that screen.
 */
export const UI_CONFIG = {
  // Sizes
  HEADER_IMAGE_HEIGHT: 250,
  DURATION_OVERLAY_ICON_SIZE: 18,
  LOCK_ICON_SIZE: 18,

  // Padding and spacing
  HORIZONTAL_PADDING: 24,
  BOTTOM_PADDING: 48,
} as const;

/**
 * Text content strings
 */
export const STRINGS = {
  LOCK_INSTRUCTIONS: 'Lock your phone to begin',
  CANCEL_BUTTON: 'Cancel Quest',
} as const;

/**
 * Test IDs for components
 */
export const TEST_IDS = {
  LOCK_INSTRUCTIONS: 'lock-instructions',
} as const;
