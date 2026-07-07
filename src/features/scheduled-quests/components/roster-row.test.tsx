import React from 'react';

import { render, screen } from '@/lib/test-utils';

import { RosterRow } from './roster-row';

describe('RosterRow', () => {
  const participant = {
    userId: {
      id: 'u1',
      character: { name: 'Thorin', type: 'knight', level: 4 },
    },
    ready: false,
    phoneLocked: false,
    status: 'active',
  } as any;

  it('renders name, level and a status badge', () => {
    render(
      <RosterRow
        participant={participant}
        isCreator={false}
        runStatus="pending"
      />
    );
    expect(screen.getByText('Thorin')).toBeTruthy();
    expect(screen.getByText(/Lv\. 4/)).toBeTruthy();
    expect(screen.getByText('Registered')).toBeTruthy();
  });

  it('maps in-run and settled statuses', () => {
    render(
      <RosterRow
        participant={{ ...participant, phoneLocked: true }}
        isCreator={false}
        runStatus="active"
      />
    );
    expect(screen.getByText('Locked in')).toBeTruthy();
    render(
      <RosterRow
        participant={{ ...participant, status: 'no_show' }}
        isCreator={false}
        runStatus="completed"
      />
    );
    expect(screen.getByText('No-show')).toBeTruthy();
  });

  it('marks the creator and renders a kick action when allowed', () => {
    const onKick = jest.fn();
    render(
      <RosterRow
        participant={participant}
        isCreator
        runStatus="pending"
        onKick={onKick}
      />
    );
    expect(screen.getByText(/Host/)).toBeTruthy();
    expect(screen.getByTestId('kick-button')).toBeTruthy();
  });

  it('does not render the kick action for non-creators, even when onKick is provided', () => {
    render(
      <RosterRow
        participant={participant}
        isCreator={false}
        runStatus="pending"
        onKick={jest.fn()}
      />
    );
    expect(screen.queryByTestId('kick-button')).toBeNull();
  });
});
