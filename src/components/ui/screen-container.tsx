import React from 'react';
import { View, type ViewProps } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors } from '@/theme';

interface ScreenContainerProps extends ViewProps {
  children: React.ReactNode;
  bottomPadding?: number;
  noPadding?: boolean;
  noHorizontalPadding?: boolean;
  fullScreen?: boolean;
  /**
   * Render with a transparent background instead of the flat
   * `colors.surface.app` canvas. Use on screens that render their own
   * full-screen background art/scrim behind this container (e.g. Quest
   * Complete, Quest Failed, Streak Celebration) so that art isn't fully
   * occluded.
   */
  transparent?: boolean;
}

/**
 * A container component that paints the flat Emberglow canvas
 * (`colors.surface.app`, richBlack) behind its children and adds consistent
 * padding for screens. Since the root SafeAreaView doesn't include bottom
 * edge, this ensures content doesn't go too close to the bottom of the
 * screen.
 *
 * Standard padding:
 * - Bottom: 8px above safe area (for screens with tab bar)
 * - Bottom: 32px above safe area (for full screens without tab bar, use fullScreen={true})
 * - Horizontal: 16px (4 in Tailwind = 16px)
 *
 * Pass `transparent` on screens that render their own full-screen
 * background art/scrim behind this container — otherwise the flat canvas
 * fully occludes it.
 */
export function ScreenContainer({
  children,
  bottomPadding,
  noPadding = false,
  noHorizontalPadding = false,
  fullScreen = false,
  transparent = false,
  style,
  ...props
}: ScreenContainerProps) {
  const insets = useSafeAreaInsets();

  // Determine bottom padding: fullScreen uses 32px, tab screens use 8px
  const defaultBottomPadding = fullScreen ? 32 : 8;
  const finalBottomPadding = bottomPadding ?? defaultBottomPadding;

  return (
    <View
      style={[
        {
          flex: 1,
          backgroundColor: transparent ? 'transparent' : colors.surface.app,
          paddingBottom: noPadding ? 0 : insets.bottom + finalBottomPadding,
          paddingHorizontal: noHorizontalPadding ? 0 : 16,
        },
        style,
      ]}
      {...props}
    >
      {children}
    </View>
  );
}
