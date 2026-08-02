import { BottomSheetModal } from '@gorhom/bottom-sheet';
import { fireEvent, screen } from '@testing-library/react-native';
import React from 'react';

import { render } from '@/lib/test-utils';
import { useAnnouncementStore } from '@/store/announcement-store';

import { DailyReminderSheet } from './daily-reminder-sheet';

const mockPosthogCapture = jest.fn();
jest.mock('posthog-react-native', () => ({
  usePostHog: () => ({ capture: mockPosthogCapture }),
}));

const mockAccept = jest.fn().mockResolvedValue(undefined);
const mockDecline = jest.fn();
jest.mock('@/components/reminder/use-reminder-opt-in', () => ({
  useReminderOptIn: (surface: string) => ({
    initialTime: { hour: 19, minute: 30 },
    accept: (time: unknown) => mockAccept(surface, time),
    decline: () => mockDecline(surface),
  }),
}));

describe('DailyReminderSheet', () => {
  let mockRef: any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockRef = { current: { dismiss: jest.fn() } };
    useAnnouncementStore.setState({ hasSeenDailyReminderPrompt: false });
  });

  it('renders the opt-in content', () => {
    render(<DailyReminderSheet ref={mockRef} />);
    expect(screen.getByText('When will you quest each day?')).toBeTruthy();
  });

  it('stamps seen + captures viewed on present (onChange index >= 0)', () => {
    render(<DailyReminderSheet ref={mockRef} />);

    // The mocked `BottomSheetModal` (jest-setup.ts) is a jest.fn() that
    // still records every render's props via .mock.calls, same pattern
    // bottom-sheet.test.tsx uses to assert `onDismiss` was forwarded. Pull
    // the `onChange` prop straight off the latest call and invoke it the
    // way the real gorhom sheet does when it finishes presenting (index 0).
    const mockedBottomSheetModal = BottomSheetModal as unknown as jest.Mock;
    const lastCallProps =
      mockedBottomSheetModal.mock.calls[
        mockedBottomSheetModal.mock.calls.length - 1
      ][0];

    lastCallProps.onChange(0);

    expect(useAnnouncementStore.getState().hasSeenDailyReminderPrompt).toBe(
      true
    );
    expect(mockPosthogCapture).toHaveBeenCalledWith(
      'daily_reminder_prompt_viewed',
      { surface: 'sheet' }
    );
  });

  it('does not stamp seen or capture viewed when the sheet closes (index < 0)', () => {
    render(<DailyReminderSheet ref={mockRef} />);

    const mockedBottomSheetModal = BottomSheetModal as unknown as jest.Mock;
    const lastCallProps =
      mockedBottomSheetModal.mock.calls[
        mockedBottomSheetModal.mock.calls.length - 1
      ][0];

    lastCallProps.onChange(-1);

    expect(useAnnouncementStore.getState().hasSeenDailyReminderPrompt).toBe(
      false
    );
    expect(mockPosthogCapture).not.toHaveBeenCalled();
  });

  it('accept path runs the hook with surface sheet and dismisses', async () => {
    render(<DailyReminderSheet ref={mockRef} />);
    fireEvent.press(screen.getByText('Set daily reminder'));
    await screen.findByText('When will you quest each day?'); // flush microtasks
    expect(mockAccept).toHaveBeenCalledWith('sheet', {
      hour: 19,
      minute: 30,
    });
    expect(mockRef.current.dismiss).toHaveBeenCalled();
  });

  it('skip path declines with surface sheet and dismisses', () => {
    render(<DailyReminderSheet ref={mockRef} />);
    fireEvent.press(screen.getByText('Skip for now'));
    expect(mockDecline).toHaveBeenCalledWith('sheet');
    expect(mockRef.current.dismiss).toHaveBeenCalled();
  });
});
