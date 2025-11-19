import { AppState, type AppStateStatus } from 'react-native';
import { getTimeZone } from 'react-native-localize';

import {
  getNotificationSettings,
  updateNotificationSettings,
} from '@/api/notification-settings';
import { TIMEZONES } from '@/lib/constants/timezones';
import { useUserStore } from '@/store/user-store';

let lastKnownTimezone: string | null = null;

/**
 * Get the current device timezone
 */
export const getDeviceTimezone = (): string => {
  return getTimeZone();
};

/**
 * Check if a timezone is supported by the app
 */
const isSupportedTimezone = (timezone: string): boolean => {
  return TIMEZONES.some((tz) => tz.value === timezone);
};

/**
 * Update the user's timezone on the server if it differs from the device timezone
 */
export const syncTimezoneWithDevice = async (): Promise<void> => {
  try {
    const user = useUserStore.getState().user;
    if (!user) {
      console.log('[Timezone] No user logged in, skipping timezone sync');
      return;
    }

    const deviceTimezone = getDeviceTimezone();

    // Check if the device timezone is supported
    if (!isSupportedTimezone(deviceTimezone)) {
      console.log('[Timezone] Device timezone not supported:', deviceTimezone);
      return;
    }

    // Skip if timezone hasn't changed
    if (deviceTimezone === lastKnownTimezone) {
      return;
    }

    console.log('[Timezone] Device timezone changed to:', deviceTimezone);

    // Get current server settings to avoid overwriting if user manually set a different timezone
    try {
      const currentSettings = await getNotificationSettings();

      // Only update if:
      // 1. Server has no timezone set, OR
      // 2. Server timezone matches our last known timezone (meaning it hasn't been manually changed)
      if (
        !currentSettings.timezone ||
        currentSettings.timezone === lastKnownTimezone
      ) {
        console.log('[Timezone] Updating server timezone to:', deviceTimezone);
        await updateNotificationSettings({ timezone: deviceTimezone });
      } else {
        console.log(
          '[Timezone] Server timezone manually set to:',
          currentSettings.timezone,
          '- not overwriting with device timezone'
        );
      }
    } catch (error) {
      // If we can't fetch settings, still try to update
      console.log(
        '[Timezone] Could not fetch current settings, updating anyway'
      );
      await updateNotificationSettings({ timezone: deviceTimezone });
    }

    lastKnownTimezone = deviceTimezone;
  } catch (error) {
    console.error('[Timezone] Failed to sync timezone:', error);
  }
};

/**
 * Initialize timezone detection and sync
 */
export const initializeTimezoneSync = (): (() => void) => {
  // Initial sync on app launch
  syncTimezoneWithDevice();

  // Listen for app state changes to detect timezone changes (e.g., when user travels)
  let appStateRef: AppStateStatus = AppState.currentState;

  const subscription = AppState.addEventListener('change', (nextAppState) => {
    if (appStateRef.match(/inactive|background/) && nextAppState === 'active') {
      // App has come to foreground - check if timezone changed
      syncTimezoneWithDevice();
    }
    appStateRef = nextAppState;
  });

  // Also listen for user login events
  const unsubscribeUserStore = useUserStore.subscribe(
    (state) => state.user,
    (user) => {
      if (user) {
        // User just logged in, sync timezone
        syncTimezoneWithDevice();
      } else {
        // User logged out, clear cached values
        lastKnownTimezone = null;
        lastServerTimezone = null;
      }
    }
  );

  // Return cleanup function
  return () => {
    subscription.remove();
    unsubscribeUserStore();
  };
};
