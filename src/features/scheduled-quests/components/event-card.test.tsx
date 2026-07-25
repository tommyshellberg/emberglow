import React from 'react';

import { render, screen } from '@/lib/test-utils';

import { EventCard } from './event-card';

const run = {
  id: 'r1',
  status: 'pending',
  scheduledStartAt: new Date(Date.now() + 60 * 60_000).toISOString(),
  quest: {
    title: '5am run club',
    category: 'fitness',
    durationMinutes: 60,
    mode: 'cooperative',
    reward: { xp: 180 },
  },
  participants: [
    {
      userId: {
        id: 'u1',
        character: { name: 'Thorin', type: 'knight', level: 4 },
      },
      ready: false,
      phoneLocked: false,
      status: 'active',
    },
  ],
  completionPolicy: 'individual',
  visibility: 'public',
  maxParticipants: 10,
} as any;

describe('EventCard', () => {
  it('renders title, host, duration, capacity and a starts-in label', () => {
    render(<EventCard run={run} onPress={jest.fn()} />);
    expect(screen.getByText('5am run club')).toBeTruthy();
    expect(screen.getByText(/Thorin/)).toBeTruthy();
    expect(screen.getByText(/60 min/)).toBeTruthy();
    expect(screen.getByText('1/10')).toBeTruthy();
    expect(screen.getByText(/Starts/)).toBeTruthy();
  });

  it('shows a joinable-now label for active runs inside the window', () => {
    const active = {
      ...run,
      status: 'active',
      scheduledStartAt: new Date(Date.now() - 5 * 60_000).toISOString(),
    };
    render(<EventCard run={active} onPress={jest.fn()} />);
    expect(screen.getByText(/Happening now/)).toBeTruthy();
  });

  it('shows the overlap annotation when flagged', () => {
    render(<EventCard run={run} onPress={jest.fn()} overlapsRegistration />);
    expect(screen.getByText(/Overlaps one of your events/)).toBeTruthy();
  });
});
