import * as React from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import { Platform, Pressable, StyleSheet, Text } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import {
  colors,
  durations,
  easing,
  fontFamily,
  pressedScale,
  radii,
  shadows,
  spacing,
} from '@/theme';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'outline';
export type ButtonSize = 'sm' | 'md' | 'lg';

export type ButtonProps = {
  /** @default 'primary' */
  variant?: ButtonVariant;
  /** @default 'md' */
  size?: ButtonSize;
  label?: string;
  /** Ember glow, controlled by the screen (same pattern as QuestCard). @default false */
  glow?: boolean;
  /** @default false */
  fullWidth?: boolean;
  disabled?: boolean;
  onPress?: () => void;
  /** Icon + text row (gap 8) — takes precedence over `label` when provided. */
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

const sizeStyles = {
  sm: {
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[4],
    fontSize: 14,
    minHeight: 36,
  },
  md: {
    paddingVertical: spacing[3],
    paddingHorizontal: 22,
    fontSize: 16,
    minHeight: 48,
  },
  lg: {
    paddingVertical: 14,
    paddingHorizontal: 26,
    fontSize: 17,
    minHeight: 54,
  },
} as const;

const variantStyles = {
  primary: {
    background: colors.accent.primary,
    backgroundPressed: colors.accent.primaryPress,
    text: colors.text.onAccent,
    border: 'transparent',
  },
  secondary: {
    background: colors.fill.faint,
    backgroundPressed: colors.fill.subtle,
    text: colors.text.primary,
    border: colors.border.subtle,
  },
  ghost: {
    background: 'transparent',
    backgroundPressed: colors.fill.faint,
    text: colors.text.secondary,
    border: 'transparent',
  },
  outline: {
    background: 'transparent',
    backgroundPressed: colors.fill.faint,
    text: colors.text.primary,
    border: colors.border.strong,
  },
} as const;

/** Pill action button — Cinnabar `primary` is reserved for the single main action on a screen. */
export function Button({
  variant = 'primary',
  size = 'md',
  label,
  glow = false,
  fullWidth = false,
  disabled = false,
  onPress,
  children,
  style,
  testID,
}: ButtonProps) {
  // Disabled forces the glow off regardless of what the screen asked for.
  const glowActive = glow && !disabled;
  const glowOpacity = useSharedValue(
    glowActive ? shadows.glowEmber.shadowOpacity : 0
  );

  React.useEffect(() => {
    glowOpacity.value = withTiming(
      glowActive ? shadows.glowEmber.shadowOpacity : 0,
      { duration: durations.base, easing: Easing.bezier(...easing.emberOut) }
    );
  }, [glowActive, glowOpacity]);

  const animatedGlowStyle = useAnimatedStyle(() => ({
    shadowOpacity: glowOpacity.value,
  }));

  const sizeStyle = sizeStyles[size];
  const variantStyle = variantStyles[variant];

  return (
    <Animated.View
      testID={testID && `${testID}-wrapper`}
      style={[
        // Without an explicit alignSelf, this wrapper inherits the parent's
        // alignItems (stretch by default in a column), silently widening the
        // button beyond its content even when fullWidth is false.
        styles.wrapper,
        fullWidth && styles.stretch,
        // Colored shadows only render on iOS; Android would just paint a grey
        // box via `elevation`, which is worse than no glow (ground rule 5).
        Platform.OS === 'ios' && {
          shadowColor: shadows.glowEmber.shadowColor,
          shadowOffset: shadows.glowEmber.shadowOffset,
          shadowRadius: shadows.glowEmber.shadowRadius,
          elevation: 0,
        },
        Platform.OS === 'ios' && animatedGlowStyle,
      ]}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled }}
        disabled={disabled}
        onPress={onPress}
        testID={testID}
        style={({ pressed }) => [
          styles.base,
          {
            paddingVertical: sizeStyle.paddingVertical,
            paddingHorizontal: sizeStyle.paddingHorizontal,
            minHeight: sizeStyle.minHeight,
            backgroundColor: pressed
              ? variantStyle.backgroundPressed
              : variantStyle.background,
            borderColor: variantStyle.border,
          },
          pressed && styles.pressed,
          disabled && styles.disabled,
          fullWidth && styles.stretch,
          style,
        ]}
      >
        {children ?? (
          <Text
            style={[
              styles.label,
              { fontSize: sizeStyle.fontSize, color: variantStyle.text },
            ]}
          >
            {label}
          </Text>
        )}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignSelf: 'flex-start',
  },
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
    gap: spacing[2],
    borderRadius: radii.pill,
    borderWidth: 1,
  },
  label: {
    fontFamily: fontFamily.semibold,
  },
  pressed: {
    transform: [{ scale: pressedScale }],
  },
  disabled: {
    opacity: 0.4,
  },
  stretch: {
    alignSelf: 'stretch',
  },
});
