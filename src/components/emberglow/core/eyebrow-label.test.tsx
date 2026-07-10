import * as React from 'react';
import { StyleSheet } from 'react-native';

import { colors, tints } from '@/theme';
import { render, screen } from '@/lib/test-utils';

import { EyebrowLabel } from './eyebrow-label';

describe('EyebrowLabel', () => {
  it('renders its children', () => {
    render(<EyebrowLabel>Quest in progress</EyebrowLabel>);

    expect(screen.getByText('Quest in progress')).toBeOnTheScreen();
  });

  it('defaults to the ember tone', () => {
    render(<EyebrowLabel>Quest in progress</EyebrowLabel>);

    const style = StyleSheet.flatten(
      screen.getByText('Quest in progress').props.style
    );
    expect(style.color).toBe(tints.cinnabar80);
  });

  it('applies the ember tone color', () => {
    render(<EyebrowLabel tone="ember">Quest in progress</EyebrowLabel>);

    const style = StyleSheet.flatten(
      screen.getByText('Quest in progress').props.style
    );
    expect(style.color).toBe(tints.cinnabar80);
  });

  it('applies the warm tone color', () => {
    render(<EyebrowLabel tone="warm">06 · Active quest</EyebrowLabel>);

    const style = StyleSheet.flatten(
      screen.getByText('06 · Active quest').props.style
    );
    expect(style.color).toBe(colors.text.accent);
  });

  it('applies the muted tone color', () => {
    render(<EyebrowLabel tone="muted">Footer note</EyebrowLabel>);

    const style = StyleSheet.flatten(
      screen.getByText('Footer note').props.style
    );
    expect(style.color).toBe(colors.text.muted);
  });
});
