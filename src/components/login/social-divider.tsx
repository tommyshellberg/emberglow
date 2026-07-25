import * as React from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import { StyleSheet, Text, View } from 'react-native';

import { colors, fontFamily, spacing } from '@/theme';

export type SocialDividerProps = {
  /** Merged over the divider's own row layout, so a caller can adjust the
   * spacing without having to restate `flexDirection`/`gap`. The built-in
   * `marginTop` is what separates the divider from the social buttons above
   * it; override it here if a screen needs a different gap. */
  style?: StyleProp<ViewStyle>;
};

/**
 * The "or" rule that separates the social sign-in buttons from a screen's
 * email alternative.
 *
 * Lives outside `SocialSignInButtons` because the caller — not the buttons —
 * decides what the alternative is ("Continue with email" on the login
 * chooser, "Sign up with email" on the post-quest conversion screen), and
 * whether there is one at all. The divider introduces the caller's choice,
 * so the caller renders it.
 */
export function SocialDivider({ style }: SocialDividerProps) {
  return (
    <View
      style={[styles.dividerRow, style]}
      testID="social-signin-divider"
      // Purely decorative — "or" between two buttons that are already
      // individually labeled conveys nothing extra to a screen reader.
      // Both props are required for cross-platform coverage: iOS reads
      // `accessibilityElementsHidden`, Android reads
      // `importantForAccessibility`.
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <View style={styles.dividerLine} />
      <Text style={styles.dividerText}>or</Text>
      <View style={styles.dividerLine} />
    </View>
  );
}

const styles = StyleSheet.create({
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    marginTop: spacing[4],
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border.hairline,
  },
  dividerText: {
    fontFamily: fontFamily.regular,
    fontSize: 13,
    color: colors.text.muted,
  },
});
