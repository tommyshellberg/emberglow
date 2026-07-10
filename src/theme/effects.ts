/**
 * Emberglow shadows, glows, scrims, and motion, ported from the design
 * handoff (.claude/skills/emberglow-design/tokens/spacing.css).
 *
 * Glows rely on iOS colored shadows; Android ignores shadowColor, so glow
 * styles set elevation 0 to avoid a grey box shadow. Where a glow must read
 * on Android, approximate it with a blurred radial gradient behind the view.
 */
import type { ViewStyle } from 'react-native';

import { palette, withAlpha } from './colors';

export const shadows = {
  card: {
    shadowColor: palette.richBlack,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 28,
    shadowOpacity: 0.55,
    elevation: 12,
  },
  raised: {
    shadowColor: palette.richBlack,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 10,
    shadowOpacity: 0.45,
    elevation: 4,
  },
  glowEmber: {
    shadowColor: palette.cinnabar,
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 24,
    shadowOpacity: 0.35,
    elevation: 0,
  },
  glowWarm: {
    shadowColor: palette.sandy,
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 32,
    shadowOpacity: 0.3,
    elevation: 0,
  },
} satisfies Record<string, ViewStyle>;

/**
 * Protection gradients over artwork — spread into expo-linear-gradient
 * props. Never use flat overlays on art.
 */
export const scrims = {
  top: {
    colors: [
      withAlpha(palette.richBlack, 0.85),
      withAlpha(palette.richBlack, 0),
    ] as const,
    start: { x: 0.5, y: 0 },
    end: { x: 0.5, y: 1 },
  },
  bottom: {
    colors: [
      withAlpha(palette.richBlack, 0.92),
      withAlpha(palette.richBlack, 0),
    ] as const,
    start: { x: 0.5, y: 1 },
    end: { x: 0.5, y: 0 },
  },
} as const;

/** Motion — slow, ember-like. Fades and gentle rises only; no bounces. */
export const easing = {
  /** cubic-bezier params; use with reanimated's Easing.bezier(...). */
  emberOut: [0.22, 1, 0.36, 1],
} as const;

export const durations = {
  fast: 150,
  base: 260,
  slow: 600,
} as const;

/** Press feedback: darken + scale to 0.98 — never bounce. */
export const pressedScale = 0.98;
