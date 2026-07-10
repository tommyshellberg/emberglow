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
}: ListItemProps) {
  const content = (
    <>
      {leading && <View style={styles.leading}>{leading}</View>}
      <View style={styles.middle}>
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
        {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
      </View>
      {trailing && <View style={styles.trailing}>{trailing}</View>}
    </>
  );

  // Not wrapped in Pressable when onPress is absent: Pressable's `disabled`
  // prop unconditionally merges into accessibilityState (even with no role
  // set), which would incorrectly announce a static row as "disabled" to
  // screen readers.
  if (!onPress) {
    return (
      <View testID={testID} style={[styles.container, style]}>
        {content}
      </View>
    );
  }

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      testID={testID}
      style={({ pressed }) => [
        styles.container,
        pressed ? styles.pressed : null,
        style,
      ]}
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
