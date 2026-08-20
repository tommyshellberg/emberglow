import * as ExpoNotifications from 'expo-notifications';

import { cancelLegacyStreakWarningNotification } from '@/lib/services/notifications';

jest.mock('expo-notifications', () => ({
  cancelScheduledNotificationAsync: jest.fn().mockResolvedValue(undefined),
}));

describe('cancelLegacyStreakWarningNotification', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('cancels the legacy streak-warning id', async () => {
    await cancelLegacyStreakWarningNotification();

    expect(
      ExpoNotifications.cancelScheduledNotificationAsync
    ).toHaveBeenCalledWith('streak-warning');
  });
});
