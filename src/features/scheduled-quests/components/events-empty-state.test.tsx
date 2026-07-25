import React from 'react';

import { fireEvent, render, screen } from '@/lib/test-utils';

import { EventsEmptyState } from './events-empty-state';

describe('EventsEmptyState', () => {
  it('shows discover copy and a Create event CTA that fires onActionPress', () => {
    const onActionPress = jest.fn();
    render(
      <EventsEmptyState variant="discover" onActionPress={onActionPress} />
    );
    expect(screen.getByText('No events found')).toBeTruthy();
    fireEvent.press(screen.getByText('Create event'));
    expect(onActionPress).toHaveBeenCalledTimes(1);
  });

  it('shows mine copy and a Discover events CTA that fires onActionPress', () => {
    const onActionPress = jest.fn();
    render(<EventsEmptyState variant="mine" onActionPress={onActionPress} />);
    expect(screen.getByText("You're not signed up for anything")).toBeTruthy();
    fireEvent.press(screen.getByText('Discover events'));
    expect(onActionPress).toHaveBeenCalledTimes(1);
  });
});
