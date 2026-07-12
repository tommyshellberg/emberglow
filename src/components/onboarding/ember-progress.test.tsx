import * as React from 'react';
import { StyleSheet } from 'react-native';

import { render, screen } from '@/lib/test-utils';
import { colors, palette, shadows, withAlpha } from '@/theme';

import { EmberProgress } from './ember-progress';

describe('EmberProgress', () => {
  it('renders one flame circle per step, defaulting to 5', () => {
    render(<EmberProgress current={1} />);

    expect(screen.getAllByTestId(/^ember-progress-step-/)).toHaveLength(5);
  });

  it('renders a custom step count', () => {
    render(<EmberProgress current={1} steps={3} />);

    expect(screen.getAllByTestId(/^ember-progress-step-/)).toHaveLength(3);
  });

  it('announces progress to accessibility as "Step N of M"', () => {
    render(<EmberProgress current={2} />);

    expect(screen.getByLabelText('Step 2 of 5')).toBeOnTheScreen();
  });

  it('fills lit steps with the ember tint and leaves later steps unlit', () => {
    render(<EmberProgress current={2} />);

    const lit = StyleSheet.flatten(
      screen.getByTestId('ember-progress-step-1').props.style
    );
    const unlit = StyleSheet.flatten(
      screen.getByTestId('ember-progress-step-5').props.style
    );

    expect(lit.backgroundColor).toBe(withAlpha(palette.cinnabar, 0.16));
    expect(lit.borderColor).toBe(withAlpha(palette.cinnabar, 0.55));
    expect(unlit.backgroundColor).toBe('transparent');
    expect(unlit.borderColor).toBe(colors.border.hairline);
  });

  it('puts the ember glow on the current step only', () => {
    render(<EmberProgress current={2} />);

    const current = StyleSheet.flatten(
      screen.getByTestId('ember-progress-step-2').props.style
    );
    const previous = StyleSheet.flatten(
      screen.getByTestId('ember-progress-step-1').props.style
    );

    expect(current.shadowColor).toBe(shadows.glowEmber.shadowColor);
    expect(current.shadowRadius).toBe(shadows.glowEmber.shadowRadius);
    expect(previous.shadowColor).toBeUndefined();
  });
});
