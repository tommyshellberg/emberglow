import { act, renderHook } from '@testing-library/react-native';
import { Alert } from 'react-native';

import {
  areNotificationsEnabled,
  requestNotificationPermissions,
  scheduleDailyReminderNotification,
} from '@/lib/services/notifications';
import { useSettingsStore } from '@/store/settings-store';

import { useReminderOptIn } from './use-reminder-opt-in';

jest.mock('@/lib/services/notifications', () => ({
  areNotificationsEnabled: jest.fn(),
  requestNotificationPermissions: jest.fn(),
  scheduleDailyReminderNotification: jest.fn(),
}));

const mockCapture = jest.fn();
jest.mock('posthog-react-native', () => ({
  usePostHog: () => ({ capture: mockCapture }),
}));

const mockEnabled = areNotificationsEnabled as jest.Mock;
const mockRequest = requestNotificationPermissions as jest.Mock;
const mockSchedule = scheduleDailyReminderNotification as jest.Mock;

describe('useReminderOptIn', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Real store, reset per test; assert resulting state, never setter calls.
    useSettingsStore.setState({
      dailyReminder: { enabled: false, time: null },
    });
    jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  });

  it('enables and schedules when permission is already granted', async () => {
    mockEnabled.mockResolvedValue(true);
    mockSchedule.mockResolvedValue(true);

    const { result } = renderHook(() => useReminderOptIn('onboarding'));
    await act(() => result.current.accept({ hour: 20, minute: 45 }));

    expect(mockSchedule).toHaveBeenCalledWith(20, 45);
    expect(useSettingsStore.getState().dailyReminder).toEqual({
      enabled: true,
      time: { hour: 20, minute: 45 },
    });
    expect(mockRequest).not.toHaveBeenCalled();
    expect(mockCapture).toHaveBeenCalledWith('set_daily_reminder', {
      surface: 'onboarding',
      hour: 20,
      minute: 45,
      permission_state: 'granted',
    });
  });

  it('requests permission when missing, then enables on grant', async () => {
    mockEnabled.mockResolvedValue(false);
    mockRequest.mockResolvedValue(true);
    mockSchedule.mockResolvedValue(true);

    const { result } = renderHook(() => useReminderOptIn('sheet'));
    await act(() => result.current.accept({ hour: 8, minute: 0 }));

    expect(mockRequest).toHaveBeenCalledTimes(1);
    expect(useSettingsStore.getState().dailyReminder.enabled).toBe(true);
    expect(mockCapture).toHaveBeenCalledWith(
      'set_daily_reminder',
      expect.objectContaining({ permission_state: 'newly_granted' })
    );
  });

  it('does NOT enable and alerts with a Settings deep-link when denied', async () => {
    mockEnabled.mockResolvedValue(false);
    mockRequest.mockResolvedValue(false);

    const { result } = renderHook(() => useReminderOptIn('sheet'));
    await act(() => result.current.accept({ hour: 8, minute: 0 }));

    expect(mockSchedule).not.toHaveBeenCalled();
    expect(useSettingsStore.getState().dailyReminder.enabled).toBe(false);
    expect(Alert.alert).toHaveBeenCalledWith(
      'Permission Required',
      expect.any(String),
      expect.arrayContaining([
        expect.objectContaining({ text: 'Open Settings' }),
      ])
    );
    expect(mockCapture).toHaveBeenCalledWith(
      'set_daily_reminder',
      expect.objectContaining({ permission_state: 'denied' })
    );
  });

  it('keeps enabled false when scheduling itself fails', async () => {
    mockEnabled.mockResolvedValue(true);
    mockSchedule.mockResolvedValue(false);

    const { result } = renderHook(() => useReminderOptIn('onboarding'));
    await act(() => result.current.accept({ hour: 20, minute: 45 }));

    expect(useSettingsStore.getState().dailyReminder).toEqual({
      enabled: false,
      time: { hour: 20, minute: 45 },
    });
  });

  it('decline captures the declined event and touches nothing else', () => {
    const { result } = renderHook(() => useReminderOptIn('onboarding'));
    act(() => result.current.decline());

    expect(mockCapture).toHaveBeenCalledWith('declined_daily_reminder', {
      surface: 'onboarding',
    });
    expect(useSettingsStore.getState().dailyReminder.enabled).toBe(false);
  });
});
