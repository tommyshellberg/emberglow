import { fireEvent, render, screen, waitFor } from '@/lib/test-utils';
import React from 'react';

import RestorationScreen from './restoration';

const mockMutateAsync = jest.fn();
const mockRouterReplace = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({
    replace: mockRouterReplace,
    push: jest.fn(),
    back: jest.fn(),
  }),
}));

jest.mock('@/api/restoration', () => ({
  useCreateRestoration: () => ({
    mutateAsync: mockMutateAsync,
    isPending: false,
    reset: jest.fn(),
  }),
}));

const mockUseSpirit = jest.fn();
jest.mock('@/hooks/use-spirit', () => ({
  useSpirit: () => mockUseSpirit(),
}));

jest.mock('react-native-reanimated', () =>
  require('react-native-reanimated/mock')
);

describe('RestorationScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseSpirit.mockReturnValue({
      spirit: 0,
      faded: true,
      active: true,
      restorationCount: 0,
    });
  });

  it('walks the 4 steps and submits with the committed time', async () => {
    mockMutateAsync.mockResolvedValue({
      id: 'r1',
      restorationNumber: 1,
      spiritRestoredAt: '2026-07-03T00:00:00.000Z',
      restorationCount: 1,
      spirit: 100,
    });

    render(<RestorationScreen />);

    // Step 1: pick the "Too busy" challenge
    fireEvent.press(screen.getByText(/too busy/i));
    fireEvent.press(screen.getByText(/next/i));

    // Step 2: journal
    fireEvent.changeText(screen.getByTestId('journal-input'), 'read more');
    fireEvent.press(screen.getByText(/next/i));

    // Step 3: commitment — drive the hour stepper twice (20 → 22) to exercise
    // the wrap math and prove the picker value reaches the submission.
    fireEvent.press(screen.getByTestId('commitment-hour-increment'));
    fireEvent.press(screen.getByTestId('commitment-hour-increment'));
    fireEvent.press(screen.getByText(/next/i));

    // Step 4: submit
    fireEvent.press(screen.getByText(/return to vaedros/i));

    await waitFor(() =>
      expect(mockMutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          challenges: ['too_busy'],
          journalText: 'read more',
          commitmentHour: 22,
          commitmentMinute: 0,
        })
      )
    );
  });

  it('records both "too busy" variants independently when both are picked', async () => {
    mockUseSpirit.mockReturnValue({
      spirit: 0,
      faded: true,
      active: true,
      restorationCount: 1, // unlocks the DEEPER_CHALLENGES variant
    });
    mockMutateAsync.mockResolvedValue({
      id: 'r2',
      restorationNumber: 2,
      spiritRestoredAt: '2026-07-03T00:00:00.000Z',
      restorationCount: 2,
      spirit: 100,
    });

    render(<RestorationScreen />);

    // Both chips are distinct ids; picking both records both.
    fireEvent.press(screen.getByText(/^too busy$/i));
    fireEvent.press(screen.getByText(/work kept pulling me back/i));
    fireEvent.press(screen.getByText(/next/i));
    fireEvent.press(screen.getByText(/next/i));
    fireEvent.press(screen.getByText(/next/i));
    fireEvent.press(screen.getByText(/return to vaedros/i));

    await waitFor(() =>
      expect(mockMutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          challenges: ['too_busy', 'too_busy_work'],
        })
      )
    );
  });

  it('surfaces an error message in the UI when the submission rejects', async () => {
    mockMutateAsync.mockRejectedValue(new Error('network down'));

    render(<RestorationScreen />);

    fireEvent.press(screen.getByText(/too busy/i));
    fireEvent.press(screen.getByText(/next/i));
    fireEvent.press(screen.getByText(/next/i));
    fireEvent.press(screen.getByText(/next/i));
    fireEvent.press(screen.getByText(/return to vaedros/i));

    // The error surfaces in the UI (not just console.error) so the user
    // knows the submit didn't go through.
    await waitFor(() => {
      expect(screen.getByTestId('submit-error')).toBeTruthy();
    });
    expect(screen.getByText(/try again/i)).toBeTruthy();
  });

  it('does not show a Next button on the final (visualization) step', () => {
    render(<RestorationScreen />);

    // Step 1: advance to journal
    fireEvent.press(screen.getByText(/too busy/i));
    fireEvent.press(screen.getByText(/next/i));
    // Step 2: advance to commitment
    fireEvent.press(screen.getByText(/next/i));
    // Step 3: advance to visualization
    fireEvent.press(screen.getByText(/next/i));

    // Now on the final step: no Next button, only the submit CTA.
    expect(screen.queryByText(/^next$/i)).toBeNull();
    expect(screen.getByText(/return to vaedros/i)).toBeTruthy();
  });

  it('uses a deeper journal prompt at restorationCount 2+', () => {
    mockUseSpirit.mockReturnValue({
      spirit: 0,
      faded: true,
      active: true,
      restorationCount: 2,
    });

    render(<RestorationScreen />);

    // Advance through the first two steps to reach the journal step
    fireEvent.press(screen.getByText(/too busy/i));
    fireEvent.press(screen.getByText(/next/i));

    // At restorationCount 2+ the journal prompt is the "deeper" variant.
    expect(screen.getByText(/deeper/i)).toBeTruthy();
  });
});
