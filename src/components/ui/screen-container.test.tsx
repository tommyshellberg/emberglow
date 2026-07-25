import { BottomTabBarHeightContext } from '@react-navigation/bottom-tabs';
import * as React from 'react';
import { StyleSheet, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { render, screen } from '@/lib/test-utils';

import { ScreenContainer } from './screen-container';

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
      <BottomTabBarHeightContext.Provider value={80}>
        <ScreenContainer testID="container" fullScreen>
          <Text>content</Text>
        </ScreenContainer>
      </BottomTabBarHeightContext.Provider>
    );

    expect(paddingBottomOf('container')).toBe(BOTTOM_INSET + 32);
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
