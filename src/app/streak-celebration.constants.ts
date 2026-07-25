/**
 * Streak celebration screen constants.
 *
 * Timing model (per `.claude/skills/emberglow-design/prototypes/streak-screen/streak.jsx`):
 * disc pop-in -> count-up -> title rise -> week row rise -> day-by-day
 * ignition (left to right, starting from the first lit day) -> buttons rise.
 */

/** Day name abbreviations, Sunday-first (matches `Date#getDay()` indexing). */
export const DAY_NAMES = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'] as const;

/**
 * Streak visualization constants.
 */
export const STREAK = {
  /** Full week view — 7 days ending today. */
  DAYS_TO_SHOW: 7,
  MILLISECONDS_IN_DAY: 24 * 60 * 60 * 1000,
} as const;

/**
 * Animation timing, in ms, all relative to screen focus.
 */
export const ANIMATION_TIMING = {
  /** Counter disc pop-in starts this long after focus. */
  DISC_DELAY: 150,
  /** Count-up starts this long after focus. */
  COUNT_START_DELAY: 300,
  /** Count-up duration — 1 -> streak. */
  COUNT_DURATION: 900,
  /** Title rise starts this long before the count-up finishes. */
  TITLE_LEAD: 100,
  /** Week row rise starts this long after the count-up finishes. */
  WEEK_ROW_DELAY_AFTER_COUNT: 200,
  /** First day ignition starts this long after the week row begins rising. */
  DAY_IGNITE_START_OFFSET: 380,
  /** Stagger between each lit day's ignition. */
  DAY_STAGGER: 180,
  /** Buttons rise starts this long after the last day ignites. */
  BUTTONS_DELAY_AFTER_LAST_DAY: 250,
} as const;

/**
 * Day-circle ignition punch (scale bounce past 1, then settle).
 */
export const DAY_IGNITE = {
  BOUNCE_SCALE: 1.3,
  BOUNCE_DURATION: 160,
  SPRING_DAMPING: 14,
  SPRING_STIFFNESS: 220,
} as const;

/**
 * Layout dimensions.
 */
export const LAYOUT = {
  COUNTER_CONTAINER_SIZE: 240,
  COUNTER_DISC_SIZE: 176,
  DAY_CIRCLE_SIZE: 40,
  WEEK_ROW_PADDING_TOP: 16,
  WEEK_ROW_PADDING_HORIZONTAL: 14,
  WEEK_ROW_PADDING_BOTTOM: 14,
} as const;

/**
 * Deterministic ember particle field — replaces the old Lottie confetti.
 * Tuple: [angleDeg, distancePx, sizePx, delayMs, driftPx].
 * Ported verbatim from the design prototype's `SK_EMBERS` table.
 */
export const EMBER_PARTICLES = [
  [12, 118, 5, 0, -26],
  [40, 132, 4, 350, -32],
  [68, 110, 6, 700, -20],
  [96, 140, 4, 150, -30],
  [124, 122, 5, 500, -24],
  [152, 136, 4, 850, -34],
  [180, 116, 5, 250, -22],
  [208, 130, 4, 600, -28],
  [236, 124, 6, 950, -26],
  [264, 138, 4, 100, -32],
  [292, 118, 5, 450, -24],
  [320, 134, 4, 800, -30],
  [348, 126, 5, 300, -28],
  [26, 148, 3, 1050, -36],
  [206, 150, 3, 1150, -38],
  [110, 152, 3, 550, -36],
] as const;

/** Particle animation: outward drift + fade, looping. */
export const EMBER_ANIMATION = {
  DURATION: 2400,
  DRIFT_DELAY_SCALE: 1,
} as const;
