import { usePostHog } from 'posthog-react-native';
import React from 'react';
import { Alert, Linking } from 'react-native';

import {
  getDefaultReminderTime,
  type ReminderTimeValue,
} from '@/lib/reminder-time';
import {
  areNotificationsEnabled,
  requestNotificationPermissions,
  scheduleDailyReminderNotification,
} from '@/lib/services/notifications';
import { useSettingsStore } from '@/store/settings-store';

type Surface = 'onboarding' | 'sheet';

/**
 * Side effects behind the daily-reminder opt-in, shared by both surfaces.
 * Permission ladder: already-granted → schedule; never-asked → request now
 * (users who skipped at app-introduction still have the iOS one-shot);
 * denied → no enable (Settings must never show "Enabled" for a reminder
 * that can't fire) + deep-link alert.
 */
export function useReminderOptIn(surface: Surface) {
  const posthog = usePostHog();
  const setDailyReminder = useSettingsStore((state) => state.setDailyReminder);

  const initialTime = React.useMemo(
    () => getDefaultReminderTime(new Date()),
    []
  );

  const accept = React.useCallback(
    async (time: ReminderTimeValue) => {
      const alreadyGranted = await areNotificationsEnabled();
      const granted =
        alreadyGranted || (await requestNotificationPermissions());
      const permissionState = alreadyGranted
        ? 'granted'
        : granted
          ? 'newly_granted'
          : 'denied';

      if (granted) {
        const success = await scheduleDailyReminderNotification(
          time.hour,
          time.minute
        );
        setDailyReminder({ enabled: success, time });
      } else {
        Alert.alert(
          'Permission Required',
          'Please enable notifications in your device settings to receive your daily reminder.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Open Settings', onPress: () => Linking.openSettings() },
          ]
        );
      }

      posthog.capture('set_daily_reminder', {
        surface,
        hour: time.hour,
        minute: time.minute,
        permission_state: permissionState,
      });
    },
    [posthog, setDailyReminder, surface]
  );

  const decline = React.useCallback(() => {
    posthog.capture('declined_daily_reminder', { surface });
  }, [posthog, surface]);

  return { initialTime, accept, decline };
}
