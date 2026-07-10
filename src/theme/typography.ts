/**
 * Emberglow typography, ported from the design handoff
 * (.claude/skills/emberglow-design/tokens/typography.css).
 *
 * Weights map to distinct font families because React Native does not
 * synthesize weights for custom fonts. Erstoria ships in regular only —
 * never bold it and never set display text in all-caps.
 */
import type { TextStyle } from 'react-native';

export const fontFamily = {
  /** Erstoria — display. Loaded natively via the expo-font config plugin. */
  display: 'Erstoria-Regular',
  /** Source Sans 3 — body/UI. Loaded in the root layout via useFonts. */
  light: 'SourceSans3_300Light',
  regular: 'SourceSans3_400Regular',
  medium: 'SourceSans3_500Medium',
  semibold: 'SourceSans3_600SemiBold',
  bold: 'SourceSans3_700Bold',
} as const;

export const fontSize = {
  hero: 44,
  h1: 34,
  h2: 26,
  h3: 20,
  bodyLg: 18,
  body: 16,
  small: 14,
  caption: 12,
} as const;

/** Brand line-height rules: display 1.12, everything else size × 1.5. */
export const leading = {
  display: 1.12,
  body: 1.5,
} as const;

/** Letter spacing in em; multiply by font size for RN points. */
export const tracking = {
  label: 0.22,
  wide: 0.08,
} as const;

const display = (size: number) =>
  ({
    fontFamily: fontFamily.display,
    fontSize: size,
    lineHeight: size * leading.display,
  }) satisfies TextStyle;

const body = (size: number, family: string = fontFamily.regular) =>
  ({
    fontFamily: family,
    fontSize: size,
    lineHeight: size * leading.body,
  }) satisfies TextStyle;

/** Ready-to-spread text styles for each brand type variant. */
export const text = {
  hero: display(fontSize.hero),
  h1: display(fontSize.h1),
  h2: display(fontSize.h2),
  h3: body(fontSize.h3, fontFamily.semibold),
  bodyLg: body(fontSize.bodyLg),
  body: body(fontSize.body),
  small: body(fontSize.small),
  caption: body(fontSize.caption),
  /** Eyebrow label, e.g. "QUEST IN PROGRESS". */
  eyebrow: {
    ...body(fontSize.caption, fontFamily.semibold),
    letterSpacing: fontSize.caption * tracking.label,
    textTransform: 'uppercase',
  },
} satisfies Record<string, TextStyle>;
