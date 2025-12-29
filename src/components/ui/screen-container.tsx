import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { type ViewProps } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface ScreenContainerProps extends ViewProps {
  children: React.ReactNode;
  bottomPadding?: number;
  noPadding?: boolean;
  noHorizontalPadding?: boolean;
  fullScreen?: boolean;
  /**
   * Reverse the gradient direction (dark at top, light at bottom).
   * Useful for screens with headers for smoother visual transition.
   */
  reverseGradient?: boolean;
}

/**
 * A container component that adds consistent padding for screens
 * Since the root SafeAreaView doesn't include bottom edge, this ensures
 * content doesn't go too close to the bottom of the screen
 *
 * Standard padding:
 * - Bottom: 8px above safe area (for screens with tab bar)
 * - Bottom: 32px above safe area (for full screens without tab bar, use fullScreen={true})
 * - Horizontal: 16px (4 in Tailwind = 16px)
 */
// Gradient colors from light to dark
const GRADIENT_COLORS = ['#102442', '#0e203b', '#0d1d35', '#0b1a2e', '#0a1628'] as const;

export function ScreenContainer({
  children,
  bottomPadding,
  noPadding = false,
  noHorizontalPadding = false,
  fullScreen = false,
  reverseGradient = false,
  style,
  ...props
}: ScreenContainerProps) {
  const insets = useSafeAreaInsets();

  // Determine bottom padding: fullScreen uses 32px, tab screens use 8px
  const defaultBottomPadding = fullScreen ? 32 : 8;
  const finalBottomPadding = bottomPadding ?? defaultBottomPadding;

  // Use reversed gradient for smoother header transition when needed
  const gradientColors = reverseGradient
    ? [...GRADIENT_COLORS].reverse()
    : [...GRADIENT_COLORS];

  return (
    <LinearGradient
      colors={gradientColors}
      style={[
        {
          flex: 1,
          paddingBottom: noPadding ? 0 : insets.bottom + finalBottomPadding,
          paddingHorizontal: noHorizontalPadding ? 0 : 16,
        },
        style,
      ]}
      {...props}
    >
      {children}
    </LinearGradient>
  );
}
