import { ArrowLeft } from 'lucide-react-native';
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

  it('shows a back button, consistent with other pushed screens', () => {
    render(<CreateScheduledQuest />);
    expect(screen.UNSAFE_queryByType(ArrowLeft)).toBeTruthy();
  });

  it('blocks submit and surfaces the validation error while the form is invalid', async () => {
    render(<CreateScheduledQuest />);
    fireEvent.press(screen.getByText(/Create event/i)); // default title is empty
    await waitFor(() =>
      expect(screen.getByText(/Give your event a title/i)).toBeTruthy()
    );
    expect(mockMutate).not.toHaveBeenCalled();
  });

  // Android regression guard: the title input autofocuses, and with the
  // default keyboardShouldPersistTaps ('never') the ScrollView swallows every
  // tap while a text input is focused - the visibility/max-participants
  // controls and the submit button below the input go dead. 'handled' lets
  // children receive taps while the keyboard is up (same fix as the
  // custom-quest screen's form ScrollView).
  it('keeps form controls tappable while the keyboard is up', () => {
    render(<CreateScheduledQuest />);
    expect(
      screen.getByTestId('create-event-scroll').props.keyboardShouldPersistTaps
    ).toBe('handled');
  });

  // The KeyboardProvider runs Android in edge-to-edge mode, so a plain
  // ScrollView never resizes for the keyboard: with the autofocused title
  // input open, everything below the fold sits behind the keyboard and
  // cannot even be scrolled into view. The form must use the
  // keyboard-controller KeyboardAwareScrollView so the lower fields stay
  // reachable while typing.
  it('uses a keyboard-aware scroller so lower fields stay reachable', () => {
    const {
      KeyboardAwareScrollView,
    } = require('react-native-keyboard-controller');
    (KeyboardAwareScrollView as jest.Mock).mockClear();
    render(<CreateScheduledQuest />);
    expect(KeyboardAwareScrollView).toHaveBeenCalled();
  });

  it('clears the stale validation error once the user fixes the title', async () => {
    render(<CreateScheduledQuest />);
    fireEvent.press(screen.getByText(/Create event/i)); // default title is empty
    await waitFor(() =>
      expect(screen.getByText(/Give your event a title/i)).toBeTruthy()
    );

    fireEvent.changeText(screen.getByPlaceholderText('go for a run'), 'Hike');

    expect(screen.queryByText(/Give your event a title/i)).toBeNull();
  });
});
