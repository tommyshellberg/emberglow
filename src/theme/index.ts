/**
 * Emberglow design tokens — the typed source of truth ported from
 * .claude/skills/emberglow-design/tokens/*.css (single dark theme).
 */
import { colors } from './colors';
import { durations, easing, pressedScale, scrims, shadows } from './effects';
import { radii, spacing } from './spacing';
import { fontFamily, fontSize, leading, text, tracking } from './typography';

export { colors, palette, tints, withAlpha } from './colors';
export { durations, easing, pressedScale, scrims, shadows } from './effects';
export { radii, spacing } from './spacing';
export { fontFamily, fontSize, leading, text, tracking } from './typography';

export const theme = {
  colors,
  fontFamily,
  fontSize,
  leading,
  text,
  tracking,
  spacing,
  radii,
  shadows,
  scrims,
  easing,
  durations,
  pressedScale,
} as const;
