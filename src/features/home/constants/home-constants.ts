import { Dimensions } from 'react-native';

import Colors from '@/components/ui/colors';

// Screen dimensions for the carousel
const screenWidth = Dimensions.get('window').width;

export const CARD_WIDTH_RATIO = 0.75;
export const CARD_SPACING = 16;
// Emberglow's QuestCard (unlike the old image-hero card it replaced) has no
// aspect-ratio — it sizes to its own content (badges/title/description/
// duration + padding), not to a forced height. This ratio is tuned to
// approximate that natural content height at CARD_WIDTH rather than to frame
// a full-bleed hero image; the carousel wrapper's height follows it so cards
// aren't clipped or left with dead space below them (Task 5 known gotcha).
export const CARD_ASPECT_RATIO = 0.85;

export const CARD_WIDTH = screenWidth * CARD_WIDTH_RATIO;
export const SNAP_INTERVAL = CARD_WIDTH + CARD_SPACING;
export const CARD_HEIGHT = CARD_WIDTH * CARD_ASPECT_RATIO;

// Quest modes configuration
export const QUEST_MODES = [
  { id: 'story', name: 'Story Mode', color: 'rgba(194, 199, 171, 0.9)' },
  { id: 'custom', name: 'Free Play Mode', color: 'rgba(146, 185, 191, 0.9)' },
  {
    id: 'cooperative',
    name: 'Cooperative Quest',
    color: 'rgba(106, 177, 185, 0.9)',
  },
] as const;

// Animation timings (milliseconds)
export const ANIMATION_TIMINGS = {
  HEADER_DELAY: 450,
  HEADER_DURATION: 1000,
  CONTENT_DELAY: 1000,
  CONTENT_DURATION: 1000,
  CAROUSEL_TRANSITION: 300,
  FADE_IN_DELAY: 200,
  FADE_IN_DOWN_BASE: 400,
  FADE_IN_DOWN_INCREMENT: 100,
  BRANCHING_MODAL_DELAY: 1500,
} as const;

// Thresholds
export const STORYLINE_COMPLETE_THRESHOLD = 0.999;

// Layout constants
export const FOOTER_MIN_HEIGHT = 140;
export const BACKGROUND_OPACITY = 0.6;

// Carousel layout
export const CAROUSEL_CONTENT_PADDING =
  (screenWidth - CARD_WIDTH) / 2 - CARD_SPACING;
export const CAROUSEL_VERTICAL_PADDING = 10;

// Shadow styles (reusable)
export const BUTTON_SHADOW = {
  shadowColor: Colors.black,
  shadowOffset: {
    width: 0,
    height: 3,
  },
  shadowOpacity: 0.12,
  shadowRadius: 4,
  elevation: 6,
} as const;

// Button sizing
export const BUTTON_HEIGHT = 16; // h-16 in tailwind = 64px, but the className uses h-16 which is 4rem = 64px

// Text styling
export const BUTTON_TEXT_WEIGHT = '700';
