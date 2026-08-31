import { Dimensions } from 'react-native';

import Colors from '@/components/ui/colors';

// Screen dimensions for the deck
const screenWidth = Dimensions.get('window').width;

// Play-screen handoff: 20pt side padding on the deck's content (see
// .claude/skills/emberglow-design/screens/play-screen/README.md "Layout").
// Centering a CARD_WIDTH box inside ScreenContainer's own 16px padding
// lands its edges exactly 20pt from the true screen edge (16 + 4 leftover
// each side) without any extra padding math at the call site.
const DECK_SIDE_PADDING = 20;

export const CARD_WIDTH = screenWidth - DECK_SIDE_PADDING * 2;
// The deck's cards are fixed-height full-bleed art cards per the
// play-screen handoff (design 380/350 ≈ 1.086), not content-sized — the
// deck container itself is taller (DECK_HEIGHT) so the back cards can
// peek above the front card's top edge ("The deck mechanic").
export const CARD_HEIGHT = 380;

// Deck peek/scale/opacity mechanics ("The deck mechanic" in the handoff).
// Peek widened from the handoff's 16pt: each back card's label strip
// (icon + text + 6pt vertical padding, ~26pt tall) is now fully exposed, so
// the mode names read clearly and the strip is a comfortable tap target.
export const DECK_PEEK_OFFSET = 26; // px each back card peeks above the one in front of it
// Tall enough for the three back cards (four modes) to peek above the front
// card without clipping.
export const DECK_HEIGHT = CARD_HEIGHT + 3 * DECK_PEEK_OFFSET;
export const DECK_SCALE_STEP = 0.05; // scale reduction per step back
export const DECK_REARMOST_OPACITY = 0.55;
export const DECK_SWIPE_THRESHOLD = 40; // px horizontal drag to advance

// Quest modes configuration — background vignette tint per mode, crossfaded
// as the deck's active card changes (handoff "Per-mode background vignette").
export const QUEST_MODES = [
  { id: 'story', name: 'Story', color: 'rgba(217, 73, 40, 0.20)' },
  { id: 'custom', name: 'Custom', color: 'rgba(247, 164, 75, 0.16)' },
  { id: 'cooperative', name: 'Co-op', color: 'rgba(44, 69, 107, 0.38)' },
  { id: 'holdout', name: 'Hold Out', color: 'rgba(96, 108, 56, 0.28)' },
] as const;

// Animation timings (milliseconds)
export const ANIMATION_TIMINGS = {
  HEADER_DELAY: 450,
  HEADER_DURATION: 1000,
  CONTENT_DELAY: 1000,
  CONTENT_DURATION: 1000,
  CAROUSEL_TRANSITION: 300,
  // Deck card peek/scale/opacity transition (handoff: 420ms).
  DECK_TRANSITION: 420,
  FADE_IN_DELAY: 200,
  FADE_IN_DOWN_BASE: 400,
  FADE_IN_DOWN_INCREMENT: 100,
  BRANCHING_MODAL_DELAY: 1500,
} as const;

// Thresholds
export const STORYLINE_COMPLETE_THRESHOLD = 0.999;

// Layout constants
// The DecisionSlider's two-choice block (the tallest of the footer's three
// modes) runs ~150pt (eyebrow + 14pt stack gaps + 44pt choice row + 60pt
// track zone; the decisionSlider README estimates ~160pt). At the old 140
// the story footer would have outgrown the floor (minHeight yields to
// taller content) while custom/co-op stayed pinned at 140 — a visible
// height jump when paging between modes. 176 keeps one shared floor taller
// than every mode's content, so all three footers render identically tall
// and the shorter Button blocks (54pt) simply center within it.
export const FOOTER_MIN_HEIGHT = 176;
export const BACKGROUND_OPACITY = 0.6;

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
