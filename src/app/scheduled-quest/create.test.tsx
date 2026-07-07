import React from 'react';

import { fireEvent, render, screen, waitFor } from '@/lib/test-utils';

import CreateScheduledQuest from './create';

const mockMutate = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ replace: jest.fn(), back: jest.fn() }),
}));
jest.mock('@/api/scheduled-quests', () => ({
  useCreateScheduledQuest: () => ({
    mutate: mockMutate,
    isPending: false,
    error: null,
  }),
}));

describe('CreateScheduledQuest', () => {
  beforeEach(() => jest.clearAllMocks());

  it('renders the form fields', () => {
    render(<CreateScheduledQuest />);
    expect(screen.getByText(/Schedule an event/i)).toBeTruthy();
    expect(screen.getByText(/Starts at/i)).toBeTruthy();
    expect(screen.getByText(/Visibility/i)).toBeTruthy();
    expect(screen.getByText(/Create event/i)).toBeTruthy();
  });

  it('blocks submit and surfaces the validation error while the form is invalid', async () => {
    render(<CreateScheduledQuest />);
    fireEvent.press(screen.getByText(/Create event/i)); // default title is empty
    await waitFor(() =>
      expect(screen.getByText(/Give your event a title/i)).toBeTruthy()
    );
    expect(mockMutate).not.toHaveBeenCalled();
  });
});
