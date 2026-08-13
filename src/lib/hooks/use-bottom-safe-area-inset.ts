import { BottomTabBarHeightContext } from '@react-navigation/bottom-tabs';
import { NavigationRouteContext } from '@react-navigation/native';
import { useContext } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { hidesTabBar } from '@/lib/navigation/tab-bar-routes';

/**
 * How much bottom safe-area inset *this* content layer has to reserve.
 *
 * The app runs edge-to-edge on Android (`react-native-edge-to-edge`, and
 * mandatory from Android 16), so content draws behind the navigation bar and
 * the root SafeAreaView deliberately omits the `bottom` edge. Exactly one
 * element must reserve `insets.bottom`, and which one depends on the route:
 *
 * - Under a visible tab bar → the bar spans it (`height: 56 + insets.bottom`,
 *   `paddingBottom: insets.bottom`), so content reserves nothing. Reserving
 *   it anyway strands a dead strip of canvas above the bar.
 * - Everywhere else (routes that hide the bar, and every root-stack screen)
 *   → nothing below covers it, so the content layer owns it.
 *
 * Returns 0 or `insets.bottom`. Background art should sit *outside* whatever
 * this pads — art is meant to bleed under the navigation bar, only buttons
 * and text must clear it.
 */
export function useBottomSafeAreaInset(): number {
  const insets = useSafeAreaInsets();
  const tabBarHeight = useContext(BottomTabBarHeightContext);
  const route = useContext(NavigationRouteContext);

  // Two distinct questions, two distinct signals. The height context is
  // truthful about "am I inside the tab navigator" (only BottomTabView sets
  // it) but NOT about "is the bar visible here" — getTabBarHeight returns the
  // numeric tabBarStyle height verbatim regardless of `display: 'none'`, and
  // the value is frozen at mount because setTabBarHeight is never called.
  const insideTabNavigator = tabBarHeight !== undefined;
  const tabBarSpansInset = insideTabNavigator && !hidesTabBar(route?.name);

  return tabBarSpansInset ? 0 : insets.bottom;
}
