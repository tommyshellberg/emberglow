import React from 'react';

import { render, screen } from '@/lib/test-utils';

import { CampfireAmbience } from './campfire-ambience';

// Decorative background layer — a light render-smoke test is sufficient
// (no pass/fail logic or user-facing text lives here).
describe('CampfireAmbience', () => {
  it('renders without crashing as a non-interactive background layer', () => {
    render(<CampfireAmbience />);

    const layer = screen.getByTestId('campfire-ambience');
    expect(layer).toBeTruthy();
    expect(layer.props.pointerEvents).toBe('none');
  });
});
