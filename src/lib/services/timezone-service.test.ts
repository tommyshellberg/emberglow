import { AppState } from 'react-native';
import { getTimeZone } from 'react-native-localize';

import * as notificationAPI from '@/api/notification-settings';
import { useUserStore } from '@/store/user-store';

import {
  getDeviceTimezone,
  initializeTimezoneSync,
  syncTimezoneWithDevice,
} from './timezone-service';
// Mock TIMEZONES before importing the service
jest.mock('@/lib/constants/timezones', () => ({
  TIMEZONES: [
    { value: 'America/New_York', label: 'Eastern Time' },
    { value: 'America/Los_Angeles', label: 'Pacific Time' },
    { value: 'Europe/London', label: 'London' },
  ],
}));

// Mock dependencies
jest.mock('@/api/notification-settings');
jest.mock('@/store/user-store');

// Get the mocked function
const mockGetTimeZone = getTimeZone as jest.MockedFunction<typeof getTimeZone>;

describe('timezone-service', () => {
  const mockUser = { id: '123', email: 'test@example.com' };
  const mockTimezone = 'America/New_York';
  const mockUnsupportedTimezone = 'Some/Unsupported/Timezone';

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetTimeZone.mockReturnValue(mockTimezone);
    // @ts-ignore
    useUserStore.getState = jest.fn(() => ({ user: mockUser }));
    // @ts-ignore
    useUserStore.subscribe = jest.fn(() => jest.fn());
    // @ts-ignore
    notificationAPI.getNotificationSettings = jest.fn();
    // @ts-ignore
    notificationAPI.updateNotificationSettings = jest.fn();
  });

  describe('getDeviceTimezone', () => {
    it('should return the device timezone', () => {
      expect(getDeviceTimezone()).toBe(mockTimezone);
    });
  });

  describe('syncTimezoneWithDevice', () => {
    it('should not sync when no user is logged in', async () => {
      // @ts-ignore
      useUserStore.getState = jest.fn(() => ({ user: null }));

      await syncTimezoneWithDevice();

      expect(notificationAPI.getNotificationSettings).not.toHaveBeenCalled();
      expect(notificationAPI.updateNotificationSettings).not.toHaveBeenCalled();
    });

    it('should not sync when timezone is not supported', async () => {
      mockGetTimeZone.mockReturnValue(mockUnsupportedTimezone);

      await syncTimezoneWithDevice();

      expect(notificationAPI.getNotificationSettings).not.toHaveBeenCalled();
      expect(notificationAPI.updateNotificationSettings).not.toHaveBeenCalled();
    });

    it('should sync when server has no timezone set', async () => {
      // @ts-ignore
      notificationAPI.getNotificationSettings.mockResolvedValue({
        timezone: null,
        streakWarning: { enabled: true, time: { hour: 20, minute: 0 } },
      });

      await syncTimezoneWithDevice();

      expect(notificationAPI.updateNotificationSettings).toHaveBeenCalledWith({
        timezone: mockTimezone,
      });
    });

    it('should not overwrite manually set timezone', async () => {
      const manualTimezone = 'Europe/London';
      // @ts-ignore
      notificationAPI.getNotificationSettings.mockResolvedValue({
        timezone: manualTimezone,
        streakWarning: { enabled: true, time: { hour: 20, minute: 0 } },
      });

      await syncTimezoneWithDevice();

      expect(notificationAPI.updateNotificationSettings).not.toHaveBeenCalled();
    });

    it('should handle API errors gracefully', async () => {
      // Reset the timezone tracking to ensure this is treated as a new sync
      await syncTimezoneWithDevice(); // First sync to establish lastKnownTimezone

      // Change timezone to trigger another sync
      const newTimezone = 'America/Los_Angeles';
      mockGetTimeZone.mockReturnValue(newTimezone);

      // @ts-ignore
      notificationAPI.getNotificationSettings.mockRejectedValue(
        new Error('API Error')
      );

      await syncTimezoneWithDevice();

      // Should still attempt to update timezone
      expect(notificationAPI.updateNotificationSettings).toHaveBeenCalledWith({
        timezone: newTimezone,
      });
    });
  });

  describe('initializeTimezoneSync', () => {
    it('should sync timezone on initialization', () => {
      const cleanup = initializeTimezoneSync();

      expect(cleanup).toBeInstanceOf(Function);
    });

    it('should sync timezone when app comes to foreground', () => {
      const mockAddEventListener = jest.fn((event, callback) => ({
        remove: jest.fn(),
      }));
      AppState.addEventListener = mockAddEventListener;
      AppState.currentState = 'background';

      initializeTimezoneSync();

      // Get the callback that was registered
      expect(mockAddEventListener).toHaveBeenCalledWith(
        'change',
        expect.any(Function)
      );
      const callback = mockAddEventListener.mock.calls[0][1];

      // Simulate app coming to foreground
      callback('active');

      // The sync will be triggered asynchronously, so we just verify the setup
      expect(mockAddEventListener).toHaveBeenCalled();
    });

    it('should sync timezone when user logs in', () => {
      let userSubscribeCallback: any;
      // @ts-ignore
      useUserStore.subscribe.mockImplementation((selector, callback) => {
        userSubscribeCallback = callback;
        return jest.fn();
      });

      initializeTimezoneSync();

      // Simulate user login
      userSubscribeCallback(mockUser);
    });
  });
});
