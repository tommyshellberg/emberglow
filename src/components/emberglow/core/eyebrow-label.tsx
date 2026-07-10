import * as React from 'react';
import type { StyleProp, TextStyle } from 'react-native';
import { StyleSheet, Text } from 'react-native';

import { colors, fontFamily, tints, tracking } from '@/theme';

/** The 13pt eyebrow variant used atop header stacks — see `theme.text.eyebrow` for the 12pt body variant. */
const FONT_SIZE = 13;

const toneColors = {
  ember: tints.cinnabar80,
  warm: colors.text.accent,
  muted: colors.text.muted,
} as const;

export type EyebrowLabelTone = keyof typeof toneColors;

export type EyebrowLabelProps = {
  /** @default 'ember' */
  tone?: EyebrowLabelTone;
  children: React.ReactNode;
  style?: StyleProp<TextStyle>;
};

/** Signature ALL-CAPS letterspaced label ("QUEST IN PROGRESS") that tops header stacks. */
export function EyebrowLabel({
  tone = 'ember',
  children,
  style,
}: EyebrowLabelProps) {
  return (
    <Text style={[styles.base, { color: toneColors[tone] }, style]}>
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  base: {
    fontFamily: fontFamily.semibold,
    fontSize: FONT_SIZE,
    letterSpacing: FONT_SIZE * tracking.label,
    textTransform: 'uppercase',
  },
});
