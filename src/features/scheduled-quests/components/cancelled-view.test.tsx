import React from 'react';

import { render, screen } from '@/lib/test-utils';

import { CancelledView } from './cancelled-view';

const run = {
  id: 'r1',
  status: 'cancelled',
  scheduledStartAt: '2030-01-01T05:00:00.000Z',
  quest: {
    title: 't',
    category: 'fitness',
    durationMinutes: 60,
    mode: 'cooperative',
    reward: { xp: 180 },
  },
  participants: [],
  completionPolicy: 'individual',
  visibility: 'public',
  maxParticipants: 10,
} as any;

describe('CancelledView', () => {
  it('renders a cancellation title and the given reason', () => {
    render(<CancelledView run={{ ...run, cancellationReason: 'Not enough players joined.' }} />);
    expect(screen.getByText(/cancelled/i)).toBeTruthy();
    expect(screen.getByText('Not enough players joined.')).toBeTruthy();
  });

  it('falls back to a generic message when no reason is given', () => {
    render(<CancelledView run={run} />);
    expect(screen.getByText(/no longer happening/i)).toBeTruthy();
  });
});
