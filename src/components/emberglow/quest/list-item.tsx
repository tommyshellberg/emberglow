import * as React from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, fontFamily, radii, spacing } from '@/theme';

export type ListItemProps = {
  title: string;
  subtitle?: string;
  /**
   * Icon or image. Rendered inside a 42×42 tile.
   *
   * Color contract: React Native does not cascade `color` from the tile to
   * its children, so icon nodes passed here must set their own tint to
   * `colors.text.accent` to match the design spec.
   */
  leading?: React.ReactNode;
  /**
   * Value text / chevron, right-aligned in a row with a 6pt gap.
   *
   * Color contract: as with `leading`, React Native does not cascade
   * `color`/`fontSize` to children, so text nodes passed here must set
   * their own style to `colors.text.muted` at 14pt to match the spec.
   */
  trailing?: React.ReactNode;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  testID?: string;
  /**
   * Puts an id on the subtitle text itself. Only reaches an on-device
   * accessibility tree on a **static** row (no `onPress`): an interactive
   * row renders a `Pressable` with a role and a label, which iOS collapses
   * into one element, hiding everything inside it. Not derived from
   * `testID` for exactly that reason — a derived id would be live on some
   * rows and silently dead on others.
   */
  subtitleTestID?: string;
  /** Overrides the row's default (title-derived) accessibility label. */
  accessibilityLabel?: string;
  /** Only meaningful on interactive rows (i.e. when `onPress` is set). */
  accessibilityHint?: string;
};

/** Row for quest logs, journal entries, and settings lists — leading icon/image, title/subtitle, trailing value. */
export function ListItem({
  title,
  subtitle,
  leading,
  trailing,
  onPress,
  style,
  testID,
  subtitleTestID,
  accessibilityLabel,
  accessibilityHint,
}: ListItemProps) {
  const content = (
    <>
      {leading && <View style={styles.leading}>{leading}</View>}
      <View style={styles.middle}>
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
        {subtitle && (
          <Text testID={subtitleTestID} style={styles.subtitle}>
            {subtitle}
          </Text>
        )}
      </View>
      {trailing && <View style={styles.trailing}>{trailing}</View>}
    </>
  );

  // Pressed state is tracked here (rather than Pressable's function-style
  // `style` prop) because NativeWind's react-native-css-interop wraps
  // Pressable globally and drops function-style styles at runtime — a
  // static style array is the only form that survives that wrapper.
  const [pressed, setPressed] = React.useState(false);

  // Not wrapped in Pressable when onPress is absent: Pressable's `disabled`
  // prop unconditionally merges into accessibilityState (even with no role
  // set), which would incorrectly announce a static row as "disabled" to
  // screen readers.
  if (!onPress) {
    return (
      <View
        testID={testID}
        style={[styles.container, style]}
        accessibilityLabel={accessibilityLabel}
      >
        {content}
      </View>
    );
  }

  return (
    <Pressable
      onPress={onPress}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      testID={testID}
      style={[styles.container, pressed ? styles.pressed : null, style]}
    >
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 13,
    paddingHorizontal: spacing[4],
    borderRadius: radii.md,
  },
  pressed: {
    backgroundColor: colors.fill.faint,
  },
  leading: {
    width: 42,
    height: 42,
    borderRadius: radii.md,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.fill.faint,
    borderWidth: 1,
    borderColor: colors.border.hairline,
  },
  middle: {
    flex: 1,
  },
  title: {
    fontFamily: fontFamily.medium,
    fontSize: 16,
    color: colors.text.primary,
  },
  subtitle: {
    fontFamily: fontFamily.regular,
    fontSize: 13,
    color: colors.text.muted,
    marginTop: 2,
  },
  trailing: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
});
