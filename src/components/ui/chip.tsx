import React from 'react';
import type {
  AccessibilityRole,
  AccessibilityState,
  StyleProp,
  TextStyle,
  ViewStyle,
} from 'react-native';
import { Pressable, StyleSheet, Text as RNText, View } from 'react-native';
import { twMerge } from 'tailwind-merge';

import { colors, fontFamily, palette, radii, withAlpha } from '@/theme';

import { Text } from './text';

/** `ember` = solid Cinnabar (mode/filter row); `default` = sandy tint (status row). */
export type ChipTone = 'ember' | 'default';

type ChipProps = {
  children: React.ReactNode;
  /**
   * Legacy NativeWind styling path. Kept only for `skill-tree-screen.tsx`
   * (the sole other Chip consumer, already retinted/approved on this path)
   * — ignored once `selected` is passed, see below.
   */
  className?: string;
  textClassName?: string;
  /**
   * Emberglow theme-tokened pill recipe (mockup `shared.jsx` `Chip`).
   * @default 'default'
   */
  tone?: ChipTone;
  /**
   * Opts into the theme-tokened rendering below (`true` or `false`).
   * Omitting `selected` entirely keeps the legacy className-driven
   * rendering untouched, so existing consumers are unaffected.
   */
  selected?: boolean;
  onPress?: () => void;
  testID?: string;
  accessibilityRole?: AccessibilityRole;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  accessibilityState?: AccessibilityState;
};

/** Selected-state recipe per tone (mockup `shared.jsx:65-77`). */
const toneSelectedStyles = {
  ember: {
    backgroundColor: colors.accent.primary,
    borderColor: 'transparent',
    color: colors.text.onAccent,
  },
  default: {
    backgroundColor: withAlpha(palette.sandy, 0.15),
    borderColor: withAlpha(palette.sandy, 0.4),
    color: colors.text.accent,
  },
} as const;

export function Chip({
  children,
  className = '',
  textClassName = '',
  tone = 'default',
  selected,
  onPress,
  testID,
  accessibilityRole,
  accessibilityLabel,
  accessibilityHint,
  accessibilityState,
}: ChipProps) {
  const Container = onPress ? Pressable : View;

  // `selected` omitted ⇒ legacy className-driven rendering (unchanged).
  if (selected === undefined) {
    return (
      <Container
        testID={testID}
        className={twMerge(
          'self-start px-3 py-1 rounded-full bg-gray-200/20',
          className
        )}
        onPress={onPress}
        accessibilityRole={accessibilityRole}
        accessibilityLabel={accessibilityLabel}
        accessibilityHint={accessibilityHint}
        accessibilityState={accessibilityState}
      >
        <Text className={twMerge('text-sm', textClassName)}>{children}</Text>
      </Container>
    );
  }

  const selectedStyle = toneSelectedStyles[tone];

  const containerStyle: StyleProp<ViewStyle> = [
    styles.base,
    selected
      ? {
          backgroundColor: selectedStyle.backgroundColor,
          borderColor: selectedStyle.borderColor,
        }
      : styles.unselected,
  ];
  const textStyle: StyleProp<TextStyle> = [
    styles.text,
    { color: selected ? selectedStyle.color : colors.text.secondary },
  ];

  return (
    <Container
      testID={testID}
      style={containerStyle}
      onPress={onPress}
      accessibilityRole={accessibilityRole}
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      accessibilityState={accessibilityState}
    >
      <RNText style={textStyle}>{children}</RNText>
    </Container>
  );
}

const styles = StyleSheet.create({
  base: {
    alignSelf: 'flex-start',
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: radii.pill,
    borderWidth: 1,
  },
  unselected: {
    backgroundColor: colors.fill.faint,
    borderColor: colors.border.hairline,
  },
  text: {
    fontFamily: fontFamily.semibold,
    fontSize: 13.5,
  },
});
