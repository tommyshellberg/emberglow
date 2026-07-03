import * as ExpoNotifications from 'expo-notifications';

import {
  cancelSpiritCommitmentReminders,
  scheduleSpiritCommitmentReminders,
} from './notifications';

jest.mock('@/lib/storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

jest.mock('react-native-onesignal', () => ({
  OneSignal: {
    Notifications: {
      getPermissionAsync: jest.fn().mockResolvedValue(true),
    },
    User: {
      pushSubscription: {
        getOptedInAsync: jest.fn().mockResolvedValue(true),
      },
    },
  },
}));

describe('spirit commitment reminders', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (
      ExpoNotifications.scheduleNotificationAsync as jest.Mock
    ).mockResolvedValue(undefined);
    (
      ExpoNotifications.cancelScheduledNotificationAsync as jest.Mock
    ).mockResolvedValue(undefined);
  });

  it('schedules 3 reminders with fixed identifiers', async () => {
    await scheduleSpiritCommitmentReminders(20, 0);

    expect(ExpoNotifications.scheduleNotificationAsync).toHaveBeenCalledTimes(
      3
    );

    const calls = (ExpoNotifications.scheduleNotificationAsync as jest.Mock)
      .mock.calls;
    const ids = calls.map((c: any) => c[0].identifier);

    expect(ids).toEqual([
      'spirit-commitment-1',
      'spirit-commitment-2',
      'spirit-commitment-3',
    ]);

    // Lock in the first call's routing payload and trigger type
    const firstPayload = calls[0][0];
    expect(firstPayload.content.data).toEqual({
      type: 'spirit_commitment',
      screen: '/(app)',
    });
    // 'timeInterval' is SchedulableTriggerInputTypes.TIME_INTERVAL
    expect(firstPayload.trigger.type).toBe('timeInterval');
  });

  it('cancels all 3 reminders', async () => {
    await cancelSpiritCommitmentReminders();

    expect(
      ExpoNotifications.cancelScheduledNotificationAsync
    ).toHaveBeenCalledTimes(3);
    expect(
      ExpoNotifications.cancelScheduledNotificationAsync
    ).toHaveBeenCalledWith('spirit-commitment-1');
    expect(
      ExpoNotifications.cancelScheduledNotificationAsync
    ).toHaveBeenCalledWith('spirit-commitment-2');
    expect(
      ExpoNotifications.cancelScheduledNotificationAsync
    ).toHaveBeenCalledWith('spirit-commitment-3');
  });
});
