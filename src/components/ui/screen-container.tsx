import React from 'react';
import { View, type ViewProps } from 'react-native';

import { useBottomSafeAreaInset } from '@/lib/hooks/use-bottom-safe-area-inset';
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
 * padding for screens. The root SafeAreaView omits the bottom edge on
 * purpose, so whatever sits at the bottom of the window owns that inset:
 * on tab screens that's the tab bar, and everywhere else it's this
 * container.
 *
 * Standard padding:
 * - Bottom: 8px under a visible tab bar (the bar already spans the inset)
 * - Bottom: insets.bottom + 8px everywhere else
 * - Horizontal: 16px (4 in Tailwind = 16px)
 *
 * `fullScreen` only swaps the 8px gap for 32px. It does NOT decide whether
 * the safe-area inset is reserved — the route does, via `hidesTabBar`. Those
 * two were previously conflated in this one prop, which is how "Try Again" on
 * Quest Failed ended up under the Android navigation bar: the screen wanted
 * the inset but not the extra 32px, and had no way to say so.
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
  // Determine bottom padding: fullScreen uses 32px, tab screens use 8px
  const defaultBottomPadding = fullScreen ? 32 : 8;
  const finalBottomPadding = bottomPadding ?? defaultBottomPadding;

  const bottomInset = useBottomSafeAreaInset();

  return (
    <View
      style={[
        {
          flex: 1,
          backgroundColor: transparent ? 'transparent' : colors.surface.app,
          paddingBottom: noPadding ? 0 : bottomInset + finalBottomPadding,
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
