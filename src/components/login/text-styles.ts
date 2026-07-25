/**
 * Shared login-card text recipes (auth-screens.jsx LoginEmailFrame /
 * LoginSentFrame) — plain style objects, spread into each view's
 * StyleSheet so margins can differ per screen.
 */
import type { TextStyle } from 'react-native';

import { colors, fontFamily } from '@/theme';

const BODY_FONT_SIZE = 14.5;
const META_FONT_SIZE = 13;

/** Card heading — Erstoria 22 (mockup: font-display, fontSize 22). */
export const cardTitle = {
  fontFamily: fontFamily.display,
  fontSize: 22,
  color: colors.text.primary,
} satisfies TextStyle;

/**
 * Card body copy — 14.5 secondary. The mockup uses lineHeight 1.5 on the
 * email frame and 1.55 on the sent frame; normalized to 1.5 (the difference
 * is sub-pixel at this size and not a deliberate design distinction).
 */
export const cardBody = {
  fontFamily: fontFamily.regular,
  fontSize: BODY_FONT_SIZE,
  lineHeight: BODY_FONT_SIZE * 1.5,
  color: colors.text.secondary,
} satisfies TextStyle;

/**
 * Supporting line one step quieter than `cardBody` — 13 muted. Used for the
 * login card's footnotes and the existing-account sheet's level/streak line,
 * which were the same five declarations written twice.
 *
 * As with the two above, callers own their own `textAlign` and margins.
 */
export const cardMeta = {
  fontFamily: fontFamily.regular,
  fontSize: META_FONT_SIZE,
  lineHeight: META_FONT_SIZE * 1.5,
  color: colors.text.muted,
} satisfies TextStyle;
