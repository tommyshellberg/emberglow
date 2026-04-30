import React from 'react';

import { render, screen } from '@/lib/test-utils';

import colors from './colors';
import { Eyebrow } from './eyebrow';

describe('Eyebrow', () => {
  it('renders text via the text prop', () => {
    render(<Eyebrow text="Story Quest" />);

    expect(screen.getByText('STORY QUEST')).toBeOnTheScreen();
  });

  it('renders children when no text prop is provided', () => {
    render(<Eyebrow>Quest one · Complete</Eyebrow>);

    expect(screen.getByText('QUEST ONE · COMPLETE')).toBeOnTheScreen();
  });

  it('applies the design-system eyebrow styling', () => {
    render(<Eyebrow text="Story Quest" />);

    const node = screen.getByText('STORY QUEST');
    const flatStyle = Array.isArray(node.props.style)
      ? Object.assign({}, ...node.props.style.flat(Infinity).filter(Boolean))
      : node.props.style;

    expect(flatStyle.color).toBe(colors.brown);
    expect(flatStyle.letterSpacing).toBe(4);
  });

  it('forwards an accessibilityLabel', () => {
    render(
      <Eyebrow text="Story Quest" accessibilityLabel="Story quest section" />
    );

    expect(screen.getByLabelText('Story quest section')).toBeOnTheScreen();
  });
});
