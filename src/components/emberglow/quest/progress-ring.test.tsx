import * as React from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import { StyleSheet, Text } from 'react-native';

import { render, screen } from '@/lib/test-utils';

import { ProgressRing, ringGeometry } from './progress-ring';

// @testing-library/react-native types `toJSON()` against `react-test-renderer`,
// which has no declaration file in this project. Shape our own minimal view
// of the rendered host tree instead of pulling in that dependency's types.
type RenderedNode = {
  props: { style?: StyleProp<ViewStyle> };
  children?: RenderedNode[] | null;
};

describe('ringGeometry', () => {
  it('clamps progress below 0 to 0', () => {
    const clampedAtZero = ringGeometry(240, 5, 0);
    const belowZero = ringGeometry(240, 5, -0.5);

    expect(belowZero.dashOffset).toBe(clampedAtZero.dashOffset);
  });

  it('clamps progress above 1 to 1', () => {
    const clampedAtOne = ringGeometry(240, 5, 1);
    const aboveOne = ringGeometry(240, 5, 1.5);

    expect(aboveOne.dashOffset).toBe(clampedAtOne.dashOffset);
  });

  it('treats a NaN progress (e.g. elapsed/0) as 0 instead of producing NaN', () => {
    const atZero = ringGeometry(240, 5, 0);
    const fromNaN = ringGeometry(240, 5, NaN);

    expect(fromNaN.dashOffset).toBe(atZero.dashOffset);
    expect(Number.isFinite(fromNaN.dashOffset)).toBe(true);
  });

  it('offsets to 0 at progress 1 (fully drawn)', () => {
    const { dashOffset } = ringGeometry(240, 5, 1);

    expect(dashOffset).toBe(0);
  });

  it('offsets to the full circumference at progress 0 (undrawn)', () => {
    const { r, circumference, dashOffset } = ringGeometry(240, 5, 0);

    expect(r).toBe((240 - 5) / 2);
    expect(circumference).toBeCloseTo(2 * Math.PI * r);
    expect(dashOffset).toBeCloseTo(circumference);
  });
});

describe('ProgressRing', () => {
  it('renders its children centered over the ring', () => {
    render(
      <ProgressRing progress={0.5}>
        <Text>12:34</Text>
      </ProgressRing>
    );

    expect(screen.getByText('12:34')).toBeOnTheScreen();
  });

  it('sizes its container to the size prop', () => {
    const { toJSON } = render(<ProgressRing size={180} />);
    const tree = toJSON() as RenderedNode;

    const style = StyleSheet.flatten(tree.props.style);
    expect(style.width).toBe(180);
    expect(style.height).toBe(180);
  });

  it('defaults to a 240 size container', () => {
    const { toJSON } = render(<ProgressRing />);
    const tree = toJSON() as RenderedNode;

    const style = StyleSheet.flatten(tree.props.style);
    expect(style.width).toBe(240);
    expect(style.height).toBe(240);
  });
});
