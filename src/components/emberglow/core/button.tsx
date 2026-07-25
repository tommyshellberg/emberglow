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
  /** The button's own action is in flight. Blocks presses exactly as `disabled`
   * does, but deliberately skips the 40% dim: the caller is expected to render
   * in-progress content (a spinner) inside, and a spinner at 40% opacity reads
   * as broken rather than working. Announced to screen readers as busy.
   * @default false */
  busy?: boolean;
  onPress?: () => void;
  /** Icon + text row (gap 8) — takes precedence over `label` when provided. */
  children?: React.ReactNode;
  /** Screen-reader name; omitted = derived from the label/children text. */
  accessibilityLabel?: string;
  accessibilityHint?: string;
  style?: StyleProp<ViewStyle>;
  /** Extra style for the outer glow-carrying wrapper (e.g. `{ flexGrow: 1 }` to match a sibling's height in a row). */
  containerStyle?: StyleProp<ViewStyle>;
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
  busy = false,
  onPress,
  children,
  accessibilityLabel,
  accessibilityHint,
  style,
  containerStyle,
  testID,
}: ButtonProps) {
  // Not pressable for either reason — but only `disabled` dims (see `busy`).
  const inert = disabled || busy;
  // Disabled forces the glow off regardless of what the screen asked for.
  // `busy` does not: a button that is working should still look alive.
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

  // Pressed state is tracked here (rather than Pressable's function-style
  // `style` prop) because NativeWind's react-native-css-interop wraps
  // Pressable globally and drops function-style styles at runtime — a
  // static style array is the only form that survives that wrapper.
  const [pressed, setPressed] = React.useState(false);

  return (
    <Animated.View
      testID={testID && `${testID}-wrapper`}
      style={[
        // Without an explicit alignSelf, this wrapper inherits the parent's
        // alignItems (stretch by default in a column), silently widening the
        // button beyond its content even when fullWidth is false.
        styles.wrapper,
        fullWidth && styles.stretch,
        containerStyle,
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
        accessibilityLabel={accessibilityLabel}
        accessibilityHint={accessibilityHint}
        accessibilityState={{ disabled: inert, busy }}
        disabled={inert}
        onPress={onPress}
        onPressIn={() => setPressed(true)}
        onPressOut={() => setPressed(false)}
        testID={testID}
        style={[
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
    textAlign: 'center',
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
