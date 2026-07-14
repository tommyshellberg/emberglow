import * as React from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import { StyleSheet, Text, View } from 'react-native';

import {
  colors,
  fontFamily,
  palette,
  radii,
  spacing,
  tints,
  tracking,
  withAlpha,
} from '@/theme';

const FONT_SIZE = 12;

const toneStyles = {
  ember: {
    background: withAlpha(palette.cinnabar, 0.18),
    text: tints.cinnabar80,
    border: withAlpha(palette.cinnabar, 0.35),
  },
  warm: {
    background: withAlpha(palette.sandy, 0.15),
    text: colors.text.accent,
    border: withAlpha(palette.sandy, 0.35),
  },
  neutral: {
    background: colors.fill.faint,
    text: colors.text.secondary,
    border: colors.border.hairline,
  },
  success: {
    background: withAlpha(colors.status.success, 0.15),
    text: colors.status.successText,
    border: withAlpha(colors.status.success, 0.35),
  },
} as const;

export type BadgeTone = keyof typeof toneStyles;

export type BadgeProps = {
  /** @default 'neutral' */
  tone?: BadgeTone;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
};

/** Uppercase pill badge for quest state and rewards ("IN PROGRESS", "+72 XP"). */
export function Badge({ tone = 'neutral', children, style }: BadgeProps) {
  const { background, text, border } = toneStyles[tone];

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: background, borderColor: border },
        style,
      ]}
    >
      <Text style={[styles.text, { color: text }]}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 5,
    paddingHorizontal: spacing[3],
    borderRadius: radii.pill,
    borderWidth: 1,
  },
  text: {
    fontFamily: fontFamily.semibold,
    fontSize: FONT_SIZE,
    letterSpacing: FONT_SIZE * tracking.wide,
    textTransform: 'uppercase',
  },
});
