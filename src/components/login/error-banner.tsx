import { FlameKindling } from 'lucide-react-native';
import * as React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import {
  colors,
  fontFamily,
  palette,
  radii,
  spacing,
  tints,
  withAlpha,
} from '@/theme';

export type ErrorBannerProps = {
  /**
   * The message to show. Empty means "nothing went wrong" and renders
   * nothing — the falsy case is decided here rather than by each caller, so
   * the login card's steps can pass `use-magic-link`'s `error` straight
   * through instead of each repeating the same ternary.
   */
  error: string;
};

const ERROR_ICON_SIZE = 16;
// Error banner geometry per the auth-screens.jsx mockup's error row
// (`gap: 10`, `padding: '10px 12px'`, `marginBottom: 14`). The bottom margin
// lives here so callers don't have to reserve space for a banner that may
// not render.
const ERROR_BANNER_GAP = 10;
const ERROR_BANNER_PADDING_VERTICAL = 10;
const ERROR_BANNER_MARGIN_BOTTOM = 14;

/**
 * Error banner for the login card's steps — bespoke composition (no Emberglow
 * alert primitive). Renders whatever copy `use-magic-link`, the URL param or a
 * social sign-in failure produces; this component owns no error strings of its
 * own.
 */
export function ErrorBanner({ error }: ErrorBannerProps) {
  if (!error) return null;

  return (
    <View style={styles.banner} testID="error-message">
      <FlameKindling
        size={ERROR_ICON_SIZE}
        color={tints.cinnabar80}
        style={styles.icon}
      />
      <Text style={styles.text}>{error}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: ERROR_BANNER_GAP,
    backgroundColor: withAlpha(palette.cinnabar, 0.12),
    borderWidth: 1,
    borderColor: withAlpha(palette.cinnabar, 0.4),
    borderRadius: radii.md,
    paddingVertical: ERROR_BANNER_PADDING_VERTICAL,
    paddingHorizontal: spacing[3],
    marginBottom: ERROR_BANNER_MARGIN_BOTTOM,
  },
  icon: {
    marginTop: 2,
  },
  text: {
    flex: 1,
    fontFamily: fontFamily.regular,
    fontSize: 13.5,
    lineHeight: 13.5 * 1.45,
    color: colors.text.secondary,
  },
});
