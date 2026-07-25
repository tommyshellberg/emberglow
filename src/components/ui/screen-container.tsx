import { BottomTabBarHeightContext } from '@react-navigation/bottom-tabs';
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
 * padding for screens. The root SafeAreaView omits the bottom edge on
 * purpose, so whatever sits at the bottom of the window owns that inset:
 * on tab screens that's the tab bar, and everywhere else it's this
 * container.
 *
 * Standard padding:
 * - Bottom: 8px, on screens with a tab bar (the bar already spans the inset)
 * - Bottom: insets.bottom + 32px (for full screens without tab bar, use fullScreen={true})
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
  const tabBarHeight = React.useContext(BottomTabBarHeightContext);

  // Determine bottom padding: fullScreen uses 32px, tab screens use 8px
  const defaultBottomPadding = fullScreen ? 32 : 8;
  const finalBottomPadding = bottomPadding ?? defaultBottomPadding;

  // A tab bar below us already spans insets.bottom, so reserving it here too
  // would strand a dead strip of canvas above the bar. The context is still
  // set on in-tab routes that hide the bar (quest-discovery, quest/reflection)
  // — those pass fullScreen, which is why it also gates this.
  const tabBarSpansInset = tabBarHeight !== undefined && !fullScreen;
  const bottomInset = tabBarSpansInset ? 0 : insets.bottom;

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
