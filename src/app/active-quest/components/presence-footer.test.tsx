import React from 'react';

import { render, screen } from '@/lib/test-utils';

import { PresenceFooter } from './presence-footer';

jest.mock('lucide-react-native', () => ({
  Lock: () => null,
}));
jest.mock('react-native-svg', () => ({
  Svg: () => null,
  Path: () => null,
  Circle: () => null,
  Rect: () => null,
  Line: () => null,
  Polygon: () => null,
  Polyline: () => null,
  G: () => null,
}));

describe('PresenceFooter', () => {
  it('renders both the positive-affordance line and the warning line', () => {
    render(<PresenceFooter />);

    expect(
      screen.getByText(/Lock your phone anytime — the quest continues/)
    ).toBeTruthy();
    expect(
      screen.getByText(/Leaving the app will end the quest early/)
    ).toBeTruthy();
  });
});
