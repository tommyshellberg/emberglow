import * as ExpoNotifications from 'expo-notifications';

import { cancelPresenceWarningNotification } from './notifications';

jest.mock('@env', () => ({ Env: { APP_ENV: 'test' } }));
jest.mock('react-native-onesignal', () => ({ OneSignal: {} }));
jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));
jest.mock('expo-notifications', () => ({
  cancelScheduledNotificationAsync: jest.fn().mockResolvedValue(undefined),
  dismissNotificationAsync: jest.fn().mockResolvedValue(undefined),
  scheduleNotificationAsync: jest.fn().mockResolvedValue('id'),
  setNotificationChannelAsync: jest.fn(),
  AndroidImportance: { MAX: 5 },
  AndroidNotificationVisibility: { PUBLIC: 1 },
}));
jest.mock('@/store/character-store', () => ({
  useCharacterStore: { getState: jest.fn() },
}));
jest.mock('@/store/settings-store', () => ({
  useSettingsStore: { getState: jest.fn() },
}));
jest.mock('@/lib/storage', () => ({ getItem: jest.fn(), setItem: jest.fn() }));

describe('cancelPresenceWarningNotification', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('dismisses an already-delivered warning, not just the scheduled one', async () => {
    // The warning fires ~WARNING_DELAY_MS after leaving; a lock detected
    // after that point must clear the banner sitting on the lock screen.
    const result = await cancelPresenceWarningNotification();

    expect(result).toBe(true);
    expect(ExpoNotifications.dismissNotificationAsync).toHaveBeenCalledWith(
      'presence-warning'
    );
  });
});
