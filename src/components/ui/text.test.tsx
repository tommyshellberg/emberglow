import React from 'react';

import { render, screen } from '@/lib/test-utils';

import { Text } from './text';

describe('Text', () => {
  it('defaults to the primary (white) styling when no variant is given', () => {
    render(<Text>Hello</Text>);
    expect(screen.getByText('Hello').props.className).toContain('text-white');
  });

  it('applies contrast-safe secondary styling via variant="secondary"', () => {
    render(<Text variant="secondary">Hello</Text>);
    expect(screen.getByText('Hello').props.className).toContain(
      'text-neutral-200'
    );
  });

  it('lets an explicit className win over the variant color', () => {
    render(
      <Text variant="secondary" className="text-red-400">
        Hello
      </Text>
    );
    const { className } = screen.getByText('Hello').props;
    expect(className).toContain('text-red-400');
    expect(className).not.toContain('text-neutral-200');
  });
});
