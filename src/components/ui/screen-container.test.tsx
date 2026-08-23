import { BottomTabBarHeightContext } from '@react-navigation/bottom-tabs';
import { NavigationRouteContext } from '@react-navigation/native';
import * as React from 'react';
import { StyleSheet, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { render, screen } from '@/lib/test-utils';

import { ScreenContainer } from './screen-container';

/**
 * Places the subject on a named route inside the tab navigator, the way
 * react-navigation does for a real tab scene. Both signals matter: the tab
 * bar height context says "you are inside the tab navigator", the route name
 * says "is the bar actually visible on this route".
 */
function onTabRoute(name: string, children: React.ReactNode) {
  return (
    <BottomTabBarHeightContext.Provider value={80}>
      <NavigationRouteContext.Provider value={{ key: `${name}-key`, name }}>
        {children}
      </NavigationRouteContext.Provider>
    </BottomTabBarHeightContext.Provider>
  );
}

/** Matches a gesture-nav Android device (63px @ 2.625 density). */
const BOTTOM_INSET = 24;

const paddingBottomOf = (testID: string) =>
  StyleSheet.flatten(screen.getByTestId(testID).props.style).paddingBottom;

describe('ScreenContainer bottom spacing', () => {
  beforeEach(() => {
    jest.mocked(useSafeAreaInsets).mockReturnValue({
      top: 24,
      right: 0,
      bottom: BOTTOM_INSET,
      left: 0,
    });
  });

  it('omits the bottom inset on tab screens, where the tab bar already spans it', () => {
    render(
      <BottomTabBarHeightContext.Provider value={80}>
        <ScreenContainer testID="container">
          <Text>content</Text>
        </ScreenContainer>
      </BottomTabBarHeightContext.Provider>
    );

    expect(paddingBottomOf('container')).toBe(8);
  });

  it('reserves the bottom inset with no tab bar below it (root-stack screens)', () => {
    render(
      <ScreenContainer testID="container">
        <Text>content</Text>
      </ScreenContainer>
    );

    expect(paddingBottomOf('container')).toBe(BOTTOM_INSET + 8);
  });

  it('reserves the bottom inset for fullScreen routes that hide the tab bar', () => {
    render(
      onTabRoute(
        'quest-discovery',
        <ScreenContainer testID="container" fullScreen>
          <Text>content</Text>
        </ScreenContainer>
      )
    );

    expect(paddingBottomOf('container')).toBe(BOTTOM_INSET + 32);
  });

  // `fullScreen` used to mean two unrelated things at once — "use 32px rather
  // than 8px" AND "there is no tab bar below me". The route now owns the
  // second question, so fullScreen must NOT smuggle in the inset on a route
  // where the bar is genuinely visible and already spans it.
  it('does not reserve the inset for fullScreen under a visible tab bar', () => {
    render(
      onTabRoute(
        'journal',
        <ScreenContainer testID="container" fullScreen>
          <Text>content</Text>
        </ScreenContainer>
      )
    );

    expect(paddingBottomOf('container')).toBe(32);
  });

  // The tab bar is `display: 'none'` on quest routes, but react-navigation
  // still reports a non-zero BottomTabBarHeightContext there: getTabBarHeight
  // returns the numeric tabBarStyle height verbatim, and the value is frozen
  // at mount (setTabBarHeight is never called). Nothing spans the inset on
  // these routes, so the container has to.
  it('reserves the bottom inset on tab routes that hide the tab bar', () => {
    render(
      onTabRoute(
        'quest/[id]',
        <ScreenContainer testID="container">
          <Text>content</Text>
        </ScreenContainer>
      )
    );

    expect(paddingBottomOf('container')).toBe(BOTTOM_INSET + 8);
  });

  it('honors noPadding regardless of whether a tab bar sits below', () => {
    render(
      <ScreenContainer testID="container" noPadding>
        <Text>content</Text>
      </ScreenContainer>
    );

    expect(paddingBottomOf('container')).toBe(0);
  });
});
