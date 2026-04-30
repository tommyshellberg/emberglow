import { Env } from '@env';
import { Feather } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { format } from 'date-fns';
import * as Linking from 'expo-linking';
import { useRouter } from 'expo-router';
import * as Updates from 'expo-updates';
import { Crown, Flame, Globe } from 'lucide-react-native';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text as RNText,
} from 'react-native';
import * as Localize from 'react-native-localize';
import { OneSignal } from 'react-native-onesignal';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, EyebrowLabel, ListItem, Switch } from '@/components/emberglow';
import {
  BottomSheetKeyboardAwareScrollView,
  FocusAwareStatusBar,
  ScreenContainer,
  ScreenHeader,
  ScrollView,
  Text,
  View,
} from '@/components/ui';
import { background } from '@/components/ui/colors';
import { Modal, useModal } from '@/components/ui/modal';
import { useNotificationSettings } from '@/hooks/use-notification-settings';
import { useAuth } from '@/lib';
import { wipeGuestSession } from '@/lib/auth';
import { TIMEZONES } from '@/lib/constants/timezones';
import { usePremiumAccess } from '@/lib/hooks/use-premium-access';
import { posthogClient } from '@/lib/posthog';
import {
  areNotificationsEnabled,
  cancelDailyReminderNotification,
  cancelStreakWarningNotification,
  requestNotificationPermissions,
  scheduleDailyReminderNotification,
} from '@/lib/services/notifications';
import { getUserDetails } from '@/lib/services/user';
import { getItem, setItem } from '@/lib/storage';
import { useSettingsStore } from '@/store/settings-store';
import type { NarratorVoice, User } from '@/store/types';
import { useUserStore } from '@/store/user-store';
import { colors, fontFamily, radii, spacing } from '@/theme';
import { getEffectiveNarratorVoice } from '@/utils/audio-utils';

import {
  handleDeleteAccount,
  handleManageSubscription,
} from '../utils/account';

// Constants
const APP_VERSION = Env.VERSION || '1.0.0';
const NOTIFICATIONS_ENABLED_KEY = 'notificationsEnabled';
const CONTACT_EMAIL = 'hello@emberglowapp.com';
// Sub-row indent — aligns nested rows (Reminder/Streak time) under their
// parent's title text: ListItem's 42px leading tile + its 14px leading gap.
const SUB_ROW_INDENT = 56;
const ICON_SIZE = 20;
const CHEVRON_SIZE = 18;

// Pure helper — doesn't depend on component state, so it lives at module
// scope rather than being recreated on every render.
function handleEmailContact() {
  Linking.openURL(`mailto:${CONTACT_EMAIL}`);
}

type AccountSectionProps = {
  user: User | null;
  isGuest: boolean;
  hasPremiumAccess: boolean;
  onManageSubscription: () => void;
  onLogout: () => void;
};

function AccountSection({
  user,
  isGuest,
  hasPremiumAccess,
  onManageSubscription,
  onLogout,
}: AccountSectionProps) {
  // A guest (provisional user) HAS a user object — /users/me succeeds with
  // their provisional JWT — but its email is a generated
  // <uuid>@unquestapp.com placeholder, not an identity they chose or could
  // sign in with. A guest reaching this screen at all is an anomaly (the
  // resolver holds guests at the signup prompt; enforcement proper arrives
  // with Expo protected routes), so instead of a Logout they can't come back
  // from — or nothing, which leaves them silently stuck — they get the one
  // honest exit: start over. Same wipe the dead-session path uses.
  const accountSubtitle = isGuest
    ? 'Guest — progress saved on this device'
    : user?.email || 'Not signed in';

  const handleStartOver = () => {
    Alert.alert(
      'Start Over',
      'This clears your guest character and all progress so you can begin fresh. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Start Over',
          style: 'destructive',
          onPress: () => wipeGuestSession(),
        },
      ]
    );
  };

  return (
    <>
      <View style={styles.card}>
        <ListItem
          testID="settings-row-account"
          subtitleTestID="settings-account-email"
          leading={
            <Feather name="user" size={ICON_SIZE} color={colors.text.accent} />
          }
          title="Account"
          subtitle={accountSubtitle}
        />
        <View style={styles.divider} />
        <ListItem
          leading={<Crown size={ICON_SIZE} color={colors.text.accent} />}
          title="emberglow Premium"
          subtitle={
            hasPremiumAccess
              ? 'Manage subscription'
              : 'View subscription options'
          }
          trailing={
            <Feather
              name="chevron-right"
              size={CHEVRON_SIZE}
              color={colors.text.muted}
            />
          }
          onPress={onManageSubscription}
        />
      </View>

      {user && !isGuest && (
        <View style={styles.logoutWrapper}>
          <Button
            testID="settings-logout-button"
            variant="secondary"
            label="Logout"
            onPress={onLogout}
          />
        </View>
      )}
      {isGuest && (
        <View style={styles.logoutWrapper}>
          <Button
            variant="secondary"
            label="Start Over"
            onPress={handleStartOver}
          />
        </View>
      )}
    </>
  );
}

type TimeSubRowProps = {
  testID: string;
  showPicker: boolean;
  onRequestShowPicker: () => void;
  value: Date;
  onChangeTime: (event: any, date?: Date) => void;
  displayText: string;
};

/** Shared "Reminder Time" / "Streak Warning time" nested row — value pill that
 * swaps for the native DateTimePicker in place when tapped. */
function TimeSubRow({
  testID,
  showPicker,
  onRequestShowPicker,
  value,
  onChangeTime,
  displayText,
}: TimeSubRowProps) {
  return (
    <>
      <View style={styles.divider} />
      <ListItem
        testID={testID}
        style={styles.subRow}
        title="Reminder Time"
        trailing={
          showPicker ? (
            <DateTimePicker
              value={value}
              mode="time"
              display="compact"
              onChange={onChangeTime}
              minuteInterval={15}
            />
          ) : (
            <Pressable onPress={onRequestShowPicker} style={styles.timePill}>
              <RNText style={styles.timePillText}>{displayText}</RNText>
            </Pressable>
          )
        }
      />
    </>
  );
}

type PreferencesSectionProps = {
  selectedTimezoneLabel: string;
  onTimezonePress: () => void;
  narratorVoiceLabel: string;
  onNarratorVoiceToggle: () => void;
  notificationsEnabled: boolean;
  onNotificationsToggle: (value: boolean) => void;
  dailyReminderEnabled: boolean;
  onToggleReminder: (value: boolean) => void;
  showTimePicker: boolean;
  onRequestShowTimePicker: () => void;
  reminderTimeValue: Date;
  onReminderTimeChange: (event: any, date?: Date) => void;
  reminderTimeDisplay: string;
  streakWarningEnabled: boolean;
  onToggleStreakWarning: (value: boolean) => void;
  showStreakTimePicker: boolean;
  onRequestShowStreakTimePicker: () => void;
  streakTimeValue: Date;
  onStreakTimeChange: (event: any, date?: Date) => void;
  streakTimeDisplay: string;
  reEngagementEnabled: boolean;
  onToggleReEngagement: (value: boolean) => void;
};

function PreferencesSection({
  selectedTimezoneLabel,
  onTimezonePress,
  narratorVoiceLabel,
  onNarratorVoiceToggle,
  notificationsEnabled,
  onNotificationsToggle,
  dailyReminderEnabled,
  onToggleReminder,
  showTimePicker,
  onRequestShowTimePicker,
  reminderTimeValue,
  onReminderTimeChange,
  reminderTimeDisplay,
  streakWarningEnabled,
  onToggleStreakWarning,
  showStreakTimePicker,
  onRequestShowStreakTimePicker,
  streakTimeValue,
  onStreakTimeChange,
  streakTimeDisplay,
  reEngagementEnabled,
  onToggleReEngagement,
}: PreferencesSectionProps) {
  return (
    <>
      <EyebrowLabel tone="muted" style={styles.sectionLabel}>
        PREFERENCES
      </EyebrowLabel>

      <View style={styles.card}>
        <ListItem
          testID="settings-row-timezone"
          leading={<Globe size={ICON_SIZE} color={colors.text.accent} />}
          title="Timezone"
          subtitle={selectedTimezoneLabel}
          trailing={
            <Feather
              name="chevron-right"
              size={CHEVRON_SIZE}
              color={colors.text.muted}
            />
          }
          onPress={onTimezonePress}
        />

        <View style={styles.divider} />
        <ListItem
          testID="settings-row-notifications"
          leading={
            <Feather name="mic" size={ICON_SIZE} color={colors.text.accent} />
          }
          title="Narrator voice"
          subtitle={narratorVoiceLabel}
          onPress={onNarratorVoiceToggle}
        />

        <View style={styles.divider} />
        <ListItem
          leading={
            <Feather name="bell" size={ICON_SIZE} color={colors.text.accent} />
          }
          title="Notifications"
          subtitle={notificationsEnabled ? 'Enabled' : 'Disabled'}
          trailing={
            <Switch
              testID="settings-toggle-notifications"
              accessibilityLabel="Notifications"
              checked={notificationsEnabled}
              onChange={onNotificationsToggle}
            />
          }
        />

        {/* Only show notification sub-settings when notifications are enabled */}
        {notificationsEnabled && (
          <>
            <View style={styles.divider} />
            <ListItem
              testID="settings-row-daily-reminder"
              leading={
                <Feather
                  name="clock"
                  size={ICON_SIZE}
                  color={colors.text.accent}
                />
              }
              title="Daily Reminder"
              subtitle={dailyReminderEnabled ? 'Enabled' : 'Disabled'}
              trailing={
                <Switch
                  testID="settings-toggle-daily-reminder"
                  checked={dailyReminderEnabled}
                  onChange={onToggleReminder}
                />
              }
            />

            {dailyReminderEnabled && (
              <TimeSubRow
                testID="settings-row-reminder-time"
                showPicker={showTimePicker}
                onRequestShowPicker={onRequestShowTimePicker}
                value={reminderTimeValue}
                onChangeTime={onReminderTimeChange}
                displayText={reminderTimeDisplay}
              />
            )}

            <View style={styles.divider} />
            <ListItem
              testID="settings-row-streak-warning"
              leading={<Flame size={ICON_SIZE} color={colors.text.accent} />}
              title="Streak Warning"
              subtitle={streakWarningEnabled ? 'Enabled' : 'Disabled'}
              trailing={
                <Switch
                  testID="settings-toggle-streak-warning"
                  checked={streakWarningEnabled}
                  onChange={onToggleStreakWarning}
                />
              }
            />

            {streakWarningEnabled && (
              <TimeSubRow
                testID="settings-row-streak-warning-time"
                showPicker={showStreakTimePicker}
                onRequestShowPicker={onRequestShowStreakTimePicker}
                value={streakTimeValue}
                onChangeTime={onStreakTimeChange}
                displayText={streakTimeDisplay}
              />
            )}

            <View style={styles.divider} />
            <ListItem
              leading={
                <Feather
                  name="refresh-cw"
                  size={ICON_SIZE}
                  color={colors.text.accent}
                />
              }
              title="Re-engagement reminders"
              subtitle="Occasional reminders to pick your journey back up when you've been away."
              trailing={
                <Switch
                  accessibilityLabel="Re-engagement reminders"
                  checked={reEngagementEnabled}
                  onChange={onToggleReEngagement}
                />
              }
            />
          </>
        )}
      </View>
    </>
  );
}

function SupportSection() {
  return (
    <>
      <EyebrowLabel tone="muted" style={styles.sectionLabel}>
        SUPPORT
      </EyebrowLabel>

      <View style={styles.card}>
        <ListItem
          leading={
            <Feather name="mail" size={ICON_SIZE} color={colors.text.accent} />
          }
          title="Contact Us"
          subtitle={CONTACT_EMAIL}
          trailing={
            <Feather
              name="chevron-right"
              size={CHEVRON_SIZE}
              color={colors.text.muted}
            />
          }
          onPress={handleEmailContact}
        />
        <View style={styles.divider} />
        <ListItem
          leading={
            <Feather
              name="help-circle"
              size={ICON_SIZE}
              color={colors.text.accent}
            />
          }
          title="Request a Feature"
          subtitle={CONTACT_EMAIL}
          trailing={
            <Feather
              name="chevron-right"
              size={CHEVRON_SIZE}
              color={colors.text.muted}
            />
          }
          onPress={handleEmailContact}
        />
      </View>
    </>
  );
}

function LegalSection() {
  return (
    <>
      <EyebrowLabel tone="muted" style={styles.sectionLabel}>
        LEGAL
      </EyebrowLabel>

      <View style={styles.card}>
        <ListItem
          leading={
            <Feather
              name="shield"
              size={ICON_SIZE}
              color={colors.text.accent}
            />
          }
          title="Terms of Use & Privacy Policy"
          trailing={
            <Feather
              name="chevron-right"
              size={CHEVRON_SIZE}
              color={colors.text.muted}
            />
          }
          onPress={() => Linking.openURL('https://emberglowapp.com/terms')}
        />
      </View>
    </>
  );
}

function DangerZoneSection({
  onDeleteAccount,
}: {
  onDeleteAccount: () => void;
}) {
  return (
    <>
      <EyebrowLabel tone="muted" style={styles.sectionLabel}>
        DANGER ZONE
      </EyebrowLabel>

      <View style={styles.dangerZone}>
        <Text className="mb-4 text-center text-neutral-200">
          Deleting your account will remove all your personal data.
        </Text>
        <Button
          variant="outline"
          fullWidth
          onPress={onDeleteAccount}
          style={styles.deleteButton}
        >
          <RNText style={styles.deleteButtonLabel}>Delete Account</RNText>
        </Button>
      </View>
    </>
  );
}

function DebugSection({ user }: { user: User | null }) {
  return (
    <>
      <EyebrowLabel tone="muted" style={styles.sectionLabel}>
        DEBUG
      </EyebrowLabel>

      <View style={styles.card}>
        <ListItem
          leading={
            <Feather name="code" size={ICON_SIZE} color={colors.text.accent} />
          }
          title="Check OneSignal ID"
          subtitle="Verify user ID mapping"
          trailing={
            <Feather
              name="chevron-right"
              size={CHEVRON_SIZE}
              color={colors.text.muted}
            />
          }
          onPress={async () => {
            try {
              const onesignalId = await OneSignal.User.getOnesignalId();
              const externalId = await OneSignal.User.getExternalId();
              const mongodbUserId = user?.id || 'Not logged in';

              Alert.alert(
                'OneSignal Debug Info',
                `OneSignal ID: ${onesignalId || 'Not set'}\n\n` +
                  `External ID: ${externalId || 'Not set'}\n\n` +
                  `MongoDB User ID: ${mongodbUserId}\n\n` +
                  `Match: ${externalId === mongodbUserId ? '✅ Yes' : '❌ No'}`,
                [{ text: 'OK' }]
              );
            } catch (error) {
              const errorMessage =
                error instanceof Error ? error.message : 'Unknown error';
              Alert.alert(
                'Error',
                'Failed to get OneSignal info: ' + errorMessage
              );
            }
          }}
        />
        <View style={styles.divider} />
        <ListItem
          leading={
            <Feather name="bell" size={ICON_SIZE} color={colors.text.accent} />
          }
          title="Check Notification Status"
          subtitle="Debug push subscription"
          trailing={
            <Feather
              name="chevron-right"
              size={CHEVRON_SIZE}
              color={colors.text.muted}
            />
          }
          onPress={async () => {
            try {
              // Get all notification status info
              const permissionStatus =
                await OneSignal.Notifications.getPermissionAsync();
              const pushSubscription = OneSignal.User.pushSubscription;
              const isOptedIn = await pushSubscription.getOptedInAsync();
              const subscriptionId = await pushSubscription.getIdAsync();
              const token = await pushSubscription.getTokenAsync();

              // Get notification settings
              const userPreference = getItem(NOTIFICATIONS_ENABLED_KEY);

              Alert.alert(
                'OneSignal Notification Status',
                `System Permission: ${permissionStatus ? '✅ Granted' : '❌ Denied'}\n\n` +
                  `Push Subscription:\n` +
                  `  - Opted In: ${isOptedIn ? '✅ Yes' : '❌ No'}\n` +
                  `  - Subscription ID: ${subscriptionId ? '✅ ' + subscriptionId.substring(0, 20) + '...' : '❌ Not set'}\n` +
                  `  - Push Token: ${token ? '✅ ' + token.substring(0, 20) + '...' : '❌ Not set'}\n\n` +
                  `User Preference: ${userPreference === 'true' ? '✅ Enabled' : userPreference === 'false' ? '❌ Disabled' : '⚠️ Not set'}`,
                [{ text: 'OK' }]
              );
            } catch (error) {
              const errorMessage =
                error instanceof Error ? error.message : 'Unknown error';
              Alert.alert(
                'Error',
                'Failed to get notification status: ' + errorMessage
              );
            }
          }}
        />
      </View>
    </>
  );
}

type TimezoneModalListProps = {
  selectedTimezone: string;
  onSelect: (timezone: string) => void;
  bottomInset: number;
};

function TimezoneModalList({
  selectedTimezone,
  onSelect,
  bottomInset,
}: TimezoneModalListProps) {
  return (
    <BottomSheetKeyboardAwareScrollView>
      {TIMEZONES.map((timezone) => (
        <ListItem
          key={timezone.value}
          testID={`timezone-option-${timezone.value}`}
          title={timezone.label}
          trailing={
            selectedTimezone === timezone.value ? (
              <Feather
                name="check"
                size={CHEVRON_SIZE}
                color={colors.accent.primary}
              />
            ) : undefined
          }
          onPress={() => onSelect(timezone.value)}
        />
      ))}
      <View style={{ height: bottomInset + 8 }} />
    </BottomSheetKeyboardAwareScrollView>
  );
}

export default function Settings() {
  const router = useRouter();
  const { signOut } = useAuth();
  const insets = useSafeAreaInsets();
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const user = useUserStore((state) => state.user);
  const [isLoading, setIsLoading] = useState(true);
  const {
    dailyReminder,
    setDailyReminder,
    streakWarning,
    setStreakWarning,
    reEngagement,
    setReEngagement,
  } = useSettingsStore();
  // No separate narratorVoice subscription needed: the selector-less
  // useSettingsStore() call above already re-renders this component on any
  // settings-store change (zustand's set() always produces a new state
  // object), so the narrator voice row picks up changes through that broad
  // subscription. The effective value itself is derived (explicit choice ??
  // character default) via getEffectiveNarratorVoice, which reads
  // getState() and so does not itself trigger a re-render.
  const effectiveVoice = getEffectiveNarratorVoice();
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [showStreakTimePicker, setShowStreakTimePicker] = useState(false);
  const [updateId, setUpdateId] = useState<string | null>(null);
  const timezoneModal = useModal();
  const [selectedTimezone, setSelectedTimezone] = useState('UTC');
  const lastSentStreakSettings = useRef<string>('');
  const lastSentReEngagementSettings = useRef<string | null>(null);
  const {
    settings: notificationSettings,
    updateSettings,
    isLoading: isLoadingSettings,
  } = useNotificationSettings();
  const { hasPremiumAccess } = usePremiumAccess();

  // Load notification settings on mount
  useEffect(() => {
    const checkNotifications = async () => {
      const enabled = await areNotificationsEnabled();
      setNotificationsEnabled(enabled);
    };

    checkNotifications();
  }, []);

  // Fetch user data if needed
  useEffect(() => {
    const fetchUserIfNeeded = async () => {
      try {
        setIsLoading(true);
        if (!user) {
          const userData = await getUserDetails();
          useUserStore.getState().setUser(userData);
        }
      } catch (error) {
        console.error('Error fetching user data in Settings:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserIfNeeded();
  }, [user]);

  // Get EAS Update ID
  useEffect(() => {
    if (!__DEV__ && Updates.updateId) {
      setUpdateId(Updates.updateId);
    }
  }, []);

  // Detect device timezone on mount and load from server
  useEffect(() => {
    if (notificationSettings?.timezone) {
      setSelectedTimezone(notificationSettings.timezone);
    } else {
      const deviceTimezone = Localize.getTimeZone();
      // Check if the device timezone is in our supported list
      const isSupported = TIMEZONES.some((tz) => tz.value === deviceTimezone);
      if (isSupported) {
        setSelectedTimezone(deviceTimezone);
      }
    }
  }, [notificationSettings]);

  // Update local streak warning and re-engagement state when server data loads
  useEffect(() => {
    if (notificationSettings?.streakWarning) {
      setStreakWarning(notificationSettings.streakWarning);
      // Initialize the ref so we don't send an update immediately
      lastSentStreakSettings.current = JSON.stringify(
        notificationSettings.streakWarning
      );
    }
    if (notificationSettings?.reEngagement) {
      setReEngagement(notificationSettings.reEngagement);
      // Initialize the ref so we don't send an update immediately
      lastSentReEngagementSettings.current = JSON.stringify(
        notificationSettings.reEngagement
      );
    }
  }, [notificationSettings, setStreakWarning, setReEngagement]);

  // Send update to server when streak settings change
  useEffect(() => {
    const currentSettings = JSON.stringify(streakWarning);
    // Destructured so `time` narrows to non-null; the server requires it.
    const { time } = streakWarning;

    // Only send if settings actually changed and we have valid settings
    if (currentSettings !== lastSentStreakSettings.current && time) {
      lastSentStreakSettings.current = currentSettings;

      // Cancel local notifications
      cancelStreakWarningNotification();

      // Send to server
      updateSettings({ streakWarning: { ...streakWarning, time } });
    }
  }, [streakWarning, updateSettings]);

  // Send update to server when re-engagement settings change
  useEffect(() => {
    const serialized = JSON.stringify(reEngagement);
    if (lastSentReEngagementSettings.current === serialized) return;
    lastSentReEngagementSettings.current = serialized;
    updateSettings({ reEngagement });
  }, [reEngagement, updateSettings]);

  // Handle notification toggle
  const handleNotificationsToggle = async (value: boolean) => {
    try {
      if (value) {
        // Requesting permissions
        const granted = await requestNotificationPermissions();

        if (!granted) {
          Alert.alert(
            'Permission Required',
            'Please enable notifications in your device settings to receive quest updates.',
            [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Open Settings', onPress: () => Linking.openSettings() },
            ]
          );
        }

        setNotificationsEnabled(granted);
      } else {
        // Disabling notifications
        setItem(NOTIFICATIONS_ENABLED_KEY, 'false');
        setNotificationsEnabled(false);
      }
    } catch (error) {
      console.error('Error toggling notifications:', error);
      Alert.alert('Error', 'Failed to update notification settings.');
    }
  };

  // Handle logout
  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          await signOut();
          router.replace('/login');
        },
      },
    ]);
  };

  const handleToggleReminder = async (value: boolean) => {
    if (value) {
      // If enabling and no time is set, set a default time (5:00 PM)
      const hour = dailyReminder.time?.hour || 17;
      const minute = dailyReminder.time?.minute || 0;

      // Schedule the notification
      const success = await scheduleDailyReminderNotification(hour, minute);

      // Update state
      setDailyReminder({
        enabled: success,
        time: { hour, minute },
      });
    } else {
      // Cancel the notification if disabling
      await cancelDailyReminderNotification();

      // Update state but preserve the time
      setDailyReminder({
        ...dailyReminder,
        enabled: false,
      });
    }
  };

  const handleTimeChange = async (event: any, selectedDate?: Date) => {
    setShowTimePicker(false);
    if (selectedDate) {
      const hour = selectedDate.getHours();
      const minute = selectedDate.getMinutes();

      // Schedule with new time
      const success = await scheduleDailyReminderNotification(hour, minute);

      // Update state
      setDailyReminder({
        enabled: success,
        time: { hour, minute },
      });
    }
  };

  // Get formatted reminder time
  const getReminderTimeDisplay = () => {
    if (!dailyReminder.time) return '--:--';

    const date = new Date();
    date.setHours(dailyReminder.time.hour);
    date.setMinutes(dailyReminder.time.minute);

    return format(date, 'h:mm a');
  };

  const handleToggleStreakWarning = async (value: boolean) => {
    // Default time if none set
    const hour = streakWarning.time?.hour || 18;
    const minute = streakWarning.time?.minute || 0;

    const newSettings = {
      enabled: value,
      time: { hour, minute },
    };

    // Update local state
    setStreakWarning(newSettings);

    // Update server immediately for toggle changes
    updateSettings({ streakWarning: newSettings });

    // Cancel local notifications since we're using server-side now
    await cancelStreakWarningNotification();
  };

  const handleToggleReEngagement = (value: boolean) => {
    setReEngagement({ enabled: value });
  };

  const handleStreakTimeChange = async (event: any, selectedDate?: Date) => {
    setShowStreakTimePicker(false);

    if (selectedDate) {
      const hour = selectedDate.getHours();
      const minute = selectedDate.getMinutes();

      // Round minutes to nearest 15-minute interval
      const roundedMinute = Math.round(minute / 15) * 15;
      const adjustedMinute = roundedMinute === 60 ? 0 : roundedMinute;
      const adjustedHour = roundedMinute === 60 ? (hour + 1) % 24 : hour;

      // Only update local state here
      const newSettings = {
        enabled: true,
        time: { hour: adjustedHour, minute: adjustedMinute },
      };
      setStreakWarning(newSettings);
    }
  };

  // Get formatted streak reminder time
  const getStreakTimeDisplay = () => {
    if (!streakWarning.time) return '--:--';

    const date = new Date();
    date.setHours(streakWarning.time.hour);
    date.setMinutes(streakWarning.time.minute);

    return format(date, 'h:mm a');
  };

  // Handle timezone change
  const handleTimezoneChange = async (timezone: string) => {
    setSelectedTimezone(timezone);
    timezoneModal.dismiss();
    // Update timezone on server
    updateSettings({ timezone });
  };

  const handleNarratorVoiceToggle = () => {
    const next: NarratorVoice = effectiveVoice === 'female' ? 'male' : 'female';
    useSettingsStore.getState().setNarratorVoice(next);
    posthogClient.capture('settings_narrator_voice_changed', { voice: next });
  };

  // In your render method, handle loading state
  if (isLoading || isLoadingSettings) {
    return (
      <View className="flex-1 items-center justify-center">
        <FocusAwareStatusBar />
        <ActivityIndicator size="large" color={colors.accent.primary} />
        <Text className="mt-4 text-white">Loading settings...</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 flex-col">
      <FocusAwareStatusBar />

      <ScreenContainer>
        <ScreenHeader
          title="Settings"
          subtitle="Manage your account, preferences, and app settings."
        />

        <ScrollView testID="settings-screen" className="flex-1">
          <View className="px-4">
            <AccountSection
              user={user}
              isGuest={!!getItem('provisionalAccessToken')}
              hasPremiumAccess={hasPremiumAccess}
              onManageSubscription={() =>
                handleManageSubscription(setIsLoading)
              }
              onLogout={handleLogout}
            />

            <PreferencesSection
              selectedTimezoneLabel={
                TIMEZONES.find((tz) => tz.value === selectedTimezone)?.label ||
                selectedTimezone
              }
              onTimezonePress={() => timezoneModal.present()}
              narratorVoiceLabel={
                effectiveVoice === 'female' ? 'Female' : 'Male'
              }
              onNarratorVoiceToggle={handleNarratorVoiceToggle}
              notificationsEnabled={notificationsEnabled}
              onNotificationsToggle={handleNotificationsToggle}
              dailyReminderEnabled={dailyReminder.enabled}
              onToggleReminder={handleToggleReminder}
              showTimePicker={showTimePicker}
              onRequestShowTimePicker={() => setShowTimePicker(true)}
              reminderTimeValue={
                new Date(
                  new Date().setHours(
                    dailyReminder.time?.hour || 0,
                    dailyReminder.time?.minute || 0
                  )
                )
              }
              onReminderTimeChange={handleTimeChange}
              reminderTimeDisplay={getReminderTimeDisplay()}
              streakWarningEnabled={streakWarning.enabled}
              onToggleStreakWarning={handleToggleStreakWarning}
              showStreakTimePicker={showStreakTimePicker}
              onRequestShowStreakTimePicker={() =>
                setShowStreakTimePicker(true)
              }
              streakTimeValue={
                new Date(
                  new Date().setHours(
                    streakWarning.time?.hour || 0,
                    streakWarning.time?.minute || 0
                  )
                )
              }
              onStreakTimeChange={handleStreakTimeChange}
              streakTimeDisplay={getStreakTimeDisplay()}
              reEngagementEnabled={reEngagement.enabled}
              onToggleReEngagement={handleToggleReEngagement}
            />

            <SupportSection />
            <LegalSection />
            <DangerZoneSection
              onDeleteAccount={() => handleDeleteAccount(setIsLoading)}
            />

            {__DEV__ && <DebugSection user={user} />}

            {/* Version Info */}
            <View className="mb-6 mt-8">
              <Text className="text-center text-neutral-300">
                Version {APP_VERSION}
              </Text>
              {updateId && (
                <Text className="mt-1 text-center text-xs text-neutral-300">
                  Update: {updateId.slice(0, 7)}
                </Text>
              )}
            </View>
          </View>
        </ScrollView>
      </ScreenContainer>

      {/* Timezone Picker Modal */}
      <Modal
        ref={timezoneModal.ref}
        snapPoints={['70%']}
        title="Select Timezone"
        backgroundStyle={{ backgroundColor: background }}
      >
        <TimezoneModalList
          selectedTimezone={selectedTimezone}
          onSelect={handleTimezoneChange}
          bottomInset={insets.bottom}
        />
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface.raised,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border.hairline,
    overflow: 'hidden',
    marginBottom: spacing[5],
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border.hairline,
  },
  sectionLabel: {
    marginBottom: spacing[2],
  },
  logoutWrapper: {
    alignItems: 'center',
    marginTop: spacing[4],
    marginBottom: spacing[5],
  },
  subRow: {
    marginLeft: SUB_ROW_INDENT,
  },
  timePill: {
    borderRadius: radii.md,
    backgroundColor: colors.fill.faint,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
  },
  timePillText: {
    fontFamily: fontFamily.medium,
    fontSize: 14,
    color: colors.text.primary,
    textAlign: 'center',
  },
  dangerZone: {
    marginBottom: spacing[5],
  },
  deleteButton: {
    borderColor: colors.status.danger,
  },
  deleteButtonLabel: {
    fontFamily: fontFamily.semibold,
    fontSize: 16,
    color: colors.status.danger,
  },
});
