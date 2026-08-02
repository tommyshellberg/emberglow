import * as ExpoNotifications from 'expo-notifications';
import { OneSignal } from 'react-native-onesignal';

import { getItem } from '@/lib/storage';

import { scheduleDailyReminderNotification } from './notifications';

jest.mock('expo-notifications', () => ({
  scheduleNotificationAsync: jest.fn().mockResolvedValue('id'),
  cancelScheduledNotificationAsync: jest.fn().mockResolvedValue(undefined),
  setNotificationHandler: jest.fn(),
  setNotificationChannelAsync: jest.fn(),
  AndroidImportance: { MAX: 5 },
  AndroidNotificationPriority: { MAX: 'max' },
  AndroidNotificationVisibility: { PUBLIC: 1 },
}));

jest.mock('react-native-onesignal', () => ({
  OneSignal: {
    initialize: jest.fn(),
    Notifications: {
      getPermissionAsync: jest.fn(),
      addEventListener: jest.fn(),
      requestPermission: jest.fn(),
    },
    User: {
      pushSubscription: {
        getOptedInAsync: jest.fn().mockResolvedValue(true),
        getIdAsync: jest.fn().mockResolvedValue('sub-id'),
        getTokenAsync: jest.fn().mockResolvedValue('token'),
        optIn: jest.fn(),
      },
      getOnesignalId: jest.fn().mockResolvedValue('osid'),
      getExternalId: jest.fn().mockResolvedValue('extid'),
    },
  },
  LogLevel: { Verbose: 'VERBOSE' },
}));

jest.mock('expo-router', () => ({ router: { navigate: jest.fn() } }));

jest.mock('@/lib/storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

const mockGetPermission = OneSignal.Notifications
  .getPermissionAsync as jest.Mock;
const mockSchedule = ExpoNotifications.scheduleNotificationAsync as jest.Mock;
const mockGetItem = getItem as jest.Mock;

describe('scheduleDailyReminderNotification', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetItem.mockReturnValue(null); // user preference unset
  });

  it('returns false and schedules nothing when permission is denied', async () => {
    mockGetPermission.mockResolvedValue(false);

    const result = await scheduleDailyReminderNotification(19, 30);

    expect(result).toBe(false);
    expect(mockSchedule).not.toHaveBeenCalled();
  });

  it('schedules a daily trigger and returns true when permission is granted', async () => {
    mockGetPermission.mockResolvedValue(true);

    const result = await scheduleDailyReminderNotification(19, 30);

    expect(result).toBe(true);
    expect(mockSchedule).toHaveBeenCalledWith(
      expect.objectContaining({
        identifier: 'daily-reminder',
        trigger: expect.objectContaining({ hour: 19, minute: 30 }),
      })
    );
  });
});
