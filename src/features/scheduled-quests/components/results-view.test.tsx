import React from 'react';

import { render, screen } from '@/lib/test-utils';

import { ResultsView } from './results-view';

const run = {
  id: 'r1',
  status: 'completed',
  scheduledStartAt: '2030-01-01T05:00:00.000Z',
  quest: {
    title: 't',
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
      phoneLocked: true,
      status: 'completed',
      rewards: {
        baseXP: 180,
        adjustedXP: 216,
        multiplier: 1.2,
        perksApplied: [],
      },
    },
    {
      userId: {
        id: 'u2',
        character: { name: 'Bilbo', type: 'scout', level: 2 },
      },
      ready: false,
      phoneLocked: false,
      status: 'no_show',
      rewards: { baseXP: 180, adjustedXP: 180, multiplier: 1, perksApplied: [] },
    },
    {
      userId: {
        id: 'u3',
        character: { name: 'Gimli', type: 'druid', level: 3 },
      },
      ready: false,
      phoneLocked: true,
      status: 'failed',
    },
  ],
  completionPolicy: 'individual',
  visibility: 'public',
  maxParticipants: 10,
} as any;

describe('ResultsView', () => {
  it('classifies the roster from run data and only credits completed participants', () => {
    render(<ResultsView run={run} />);
    expect(screen.getByText(/Showed up/)).toBeTruthy();
    expect(screen.getByText('Thorin')).toBeTruthy();
    expect(screen.getByText('+216 XP')).toBeTruthy();
    expect(screen.getByText(/No-shows/)).toBeTruthy();
    expect(screen.getByText('Bilbo')).toBeTruthy();
    expect(screen.queryByText('+180 XP')).toBeNull(); // no_show never shows XP
    expect(screen.getByText(/Dropped out/)).toBeTruthy();
    expect(screen.getByText('Gimli')).toBeTruthy();
  });

  it('prefers the live settlement payload when present', () => {
    const settlement = {
      questRunId: 'r1',
      completedAt: '2030-01-01T06:00:00.000Z',
      participants: [
        { userId: 'u1', status: 'completed', xpAwarded: 300 },
        { userId: 'u2', status: 'no_show', xpAwarded: 0 },
        { userId: 'u3', status: 'failed', xpAwarded: 0 },
      ],
    } as any;
    render(<ResultsView run={run} settlement={settlement} />);
    expect(screen.getByText('+300 XP')).toBeTruthy();
  });

  it('flags a failed XP credit', () => {
    const settlement = {
      questRunId: 'r1',
      completedAt: 'x',
      participants: [
        { userId: 'u1', status: 'completed', xpAwarded: 0, creditFailed: true },
      ],
    } as any;
    render(<ResultsView run={run} settlement={settlement} />);
    expect(screen.getByText(/XP pending/)).toBeTruthy();
  });
});
