import React from 'react';

import { render } from '@/lib/test-utils';

import RestorationScreen from './restoration';

describe('RestorationScreen', () => {
  it('renders the Restoration title', () => {
    const { getByText } = render(<RestorationScreen />);

    expect(getByText('Restoration')).toBeTruthy();
  });
});
