import * as React from 'react';
import type { StyleProp, TextStyle, ViewStyle } from 'react-native';
import { StyleSheet } from 'react-native';

import { colors, palette, tints, withAlpha } from '@/theme';
import { render, screen } from '@/lib/test-utils';

import { Badge } from './badge';

// @testing-library/react-native types `toJSON()` against `react-test-renderer`,
// which has no declaration file in this project. Shape our own minimal view
// of the rendered host tree instead of pulling in that dependency's types.
type RenderedNode = {
  props: { style?: StyleProp<ViewStyle & TextStyle> };
  children?: RenderedNode[] | null;
};

describe('Badge', () => {
  it('renders its children uppercase-styled', () => {
    render(<Badge>In progress</Badge>);

    const text = screen.getByText('In progress');
    expect(text).toBeOnTheScreen();

    const style = StyleSheet.flatten(text.props.style);
    expect(style.textTransform).toBe('uppercase');
  });

  it('defaults to the neutral tone', () => {
    const { toJSON } = render(<Badge>In progress</Badge>);
    const tree = toJSON() as RenderedNode;

    const container = StyleSheet.flatten(tree.props.style);
    expect(container.backgroundColor).toBe(colors.fill.faint);
    expect(container.borderColor).toBe(colors.border.hairline);

    const text = StyleSheet.flatten(tree.children![0].props.style);
    expect(text.color).toBe(colors.text.secondary);
  });

  it('applies the ember tone colors', () => {
    const { toJSON } = render(<Badge tone="ember">In progress</Badge>);
    const tree = toJSON() as RenderedNode;

    const container = StyleSheet.flatten(tree.props.style);
    expect(container.backgroundColor).toBe(withAlpha(palette.cinnabar, 0.18));
    expect(container.borderColor).toBe(withAlpha(palette.cinnabar, 0.35));

    const text = StyleSheet.flatten(tree.children![0].props.style);
    expect(text.color).toBe(tints.cinnabar80);
  });

  it('applies the warm tone colors', () => {
    const { toJSON } = render(<Badge tone="warm">+72 XP</Badge>);
    const tree = toJSON() as RenderedNode;

    const container = StyleSheet.flatten(tree.props.style);
    expect(container.backgroundColor).toBe(withAlpha(palette.sandy, 0.15));
    expect(container.borderColor).toBe(withAlpha(palette.sandy, 0.35));

    const text = StyleSheet.flatten(tree.children![0].props.style);
    expect(text.color).toBe(colors.text.accent);
  });

  it('applies the success tone colors', () => {
    const { toJSON } = render(<Badge tone="success">Complete</Badge>);
    const tree = toJSON() as RenderedNode;

    const container = StyleSheet.flatten(tree.props.style);
    expect(container.backgroundColor).toBe(
      withAlpha(colors.status.success, 0.15)
    );
    expect(container.borderColor).toBe(
      withAlpha(colors.status.success, 0.35)
    );

    const text = StyleSheet.flatten(tree.children![0].props.style);
    expect(text.color).toBe(colors.status.successText);
  });
});
