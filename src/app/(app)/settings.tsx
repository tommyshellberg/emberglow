import { Env } from '@env';
import { Feather } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { format } from 'date-fns';
import * as Linking from 'expo-linking';
import { useRouter } from 'expo-router';
import * as Updates from 'expo-updates';
import { Crown, Flame, Globe } from 'lucide-react-native';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, Switch } from 'react-native';
import * as Localize from 'react-native-localize';
import { OneSignal } from 'react-native-onesignal';
import {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

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
import { TIMEZONES } from '@/lib/constants/timezones';
import { usePremiumAccess } from '@/lib/hooks/use-premium-access';
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
import { useUserStore } from '@/store/user-store';

import {
  handleDeleteAccount,
  handleManageSubscription,
} from '../utils/account';

// Constants
const APP_VERSION = Env.VERSION || '1.0.0';
const NOTIFICATIONS_ENABLED_KEY = 'notificationsEnabled';

export default function Settings() {
  const router = useRouter();
  const { signOut } = useAuth();
  const insets = useSafeAreaInsets();
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const user = useUserStore((state) => state.user);
  const [isLoading, setIsLoading] = useState(true);
  const { dailyReminder, setDailyReminder, streakWarning, setStreakWarning } =
    useSettingsStore();
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [showStreakTimePicker, setShowStreakTimePicker] = useState(false);
  const [updateId, setUpdateId] = useState<string | null>(null);
  const timezoneModal = useModal();
  const [selectedTimezone, setSelectedTimezone] = useState('UTC');
  const lastSentStreakSettings = useRef<string>('');
  const {
    settings: notificationSettings,
    updateSettings,
    isLoading: isLoadingSettings,
  } = useNotificationSettings();
  const { hasPremiumAccess } = usePremiumAccess();

  // Animation value for header
  const headerOpacity = useSharedValue(0);

  // Initialize animation
  useEffect(() => {
    headerOpacity.value = withTiming(1, { duration: 1000 });
  }, [headerOpacity]);

  // Animated style
  const headerStyle = useAnimatedStyle(() => ({
    opacity: headerOpacity.value,
  }));

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
      console.log('deviceTimezone', deviceTimezone);
      // Check if the device timezone is in our supported list
      const isSupported = TIMEZONES.some((tz) => tz.value === deviceTimezone);
      if (isSupported) {
        setSelectedTimezone(deviceTimezone);
      }
    }
  }, [notificationSettings]);

  // Update local streak warning state when server data loads
  useEffect(() => {
    if (notificationSettings?.streakWarning) {
      setStreakWarning(notificationSettings.streakWarning);
      // Initialize the ref so we don't send an update immediately
      lastSentStreakSettings.current = JSON.stringify(
        notificationSettings.streakWarning
      );
    }
  }, [notificationSettings, setStreakWarning]);

  // Send update to server when streak settings change
  useEffect(() => {
    const currentSettings = JSON.stringify(streakWarning);

    // Only send if settings actually changed and we have valid settings
    if (
      currentSettings !== lastSentStreakSettings.current &&
      streakWarning.time?.hour !== undefined &&
      streakWarning.time?.minute !== undefined
    ) {
      lastSentStreakSettings.current = currentSettings;

      // Cancel local notifications
      cancelStreakWarningNotification();

      // Send to server
      updateSettings({ streakWarning });
    }
  }, [streakWarning, updateSettings]);

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

  const handleEmail = (email: string) => {
    Linking.openURL(`mailto:${email}`);
  };

  // Define icon colors and backgrounds for consistency with the design
  const iconBgColor = 'bg-neutral-400';
  const iconColor = '#36B6D3';
  const contactEmail = 'hello@unquestapp.com';

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

  // In your render method, handle loading state
  if (isLoading || isLoadingSettings) {
    return (
      <View className="flex-1 items-center justify-center">
        <FocusAwareStatusBar />
        <ActivityIndicator size="large" color="#36B6D3" />
        <Text className="mt-4 text-white">Loading settings...</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 flex-col">
      <FocusAwareStatusBar />

      <ScreenContainer>
        {/* Header */}
        <ScreenHeader
          title="Settings"
          subtitle="Manage your account, preferences, and app settings."
        />

        <ScrollView className="flex-1">
          <View className="px-4">
            {/* Account Section */}
            <View className="mb-8">
              <View className="flex-row items-center">
                <View
                  className={`mr-4 size-14 ${iconBgColor} items-center justify-center rounded-full`}
                >
                  <Feather name="user" size={24} color={iconColor} />
                </View>
                <View className="flex-1">
                  <Text className="text-xl font-medium text-white">
                    Account
                  </Text>
                  <Text className="text-neutral-200">
                    {user?.email || 'Not signed in'}
                  </Text>
                </View>
              </View>

              {user && (
                <View
                  className="mx-auto mt-4 rounded-xl bg-primary-300 p-2"
                  style={{ width: '50%' }}
                  onTouchEnd={handleLogout}
                >
                  <Text className="text-center font-medium text-white">
                    Logout
                  </Text>
                </View>
              )}
            </View>

            {/* Premium Subscription Section - Always show */}
            <View className="mb-8">
              <Pressable
                className="flex-row items-center justify-between"
                onPress={handleManageSubscription}
              >
                <View className="flex-row items-center">
                  <View
                    className={`mr-4 size-14 ${iconBgColor} items-center justify-center rounded-full`}
                  >
                    <Crown size={24} color={iconColor} />
                  </View>
                  <View>
                    <Text className="text-xl font-medium text-white">
                      emberglow Premium
                    </Text>
                    <Text className="text-neutral-200">
                      {hasPremiumAccess
                        ? 'Manage subscription'
                        : 'View subscription options'}
                    </Text>
                  </View>
                </View>
                <Feather name="chevron-right" size={20} color="#5C7380" />
              </Pressable>
            </View>

            {/* Preferences Section */}
            <View className="mb-4">
              <Text className="mb-2 text-base uppercase text-neutral-300">
                PREFERENCES
              </Text>
            </View>

            {/* Timezone Selector */}
            <Pressable
              className="mb-4 flex-row items-center justify-between"
              onPress={() => {
                console.log('Timezone button pressed');
                timezoneModal.present();
              }}
            >
              <View className="flex-row items-center">
                <View
                  className={`mr-4 size-14 ${iconBgColor} items-center justify-center rounded-full`}
                >
                  <Globe size={24} color={iconColor} />
                </View>
                <View>
                  <Text className="text-xl font-medium text-white">
                    Timezone
                  </Text>
                  <Text className="text-neutral-200">
                    {TIMEZONES.find((tz) => tz.value === selectedTimezone)
                      ?.label || selectedTimezone}
                  </Text>
                </View>
              </View>
              <Feather name="chevron-right" size={20} color="#5C7380" />
            </Pressable>

            {/* Notifications */}
            <View className="mb-4 flex-row items-center justify-between">
              <View className="flex-row items-center">
                <View
                  className={`mr-4 size-14 ${iconBgColor} items-center justify-center rounded-full`}
                >
                  <Feather name="bell" size={24} color={iconColor} />
                </View>
                <View>
                  <Text className="text-xl font-medium text-white">
                    Notifications
                  </Text>
                  <Text className="text-neutral-200">
                    {notificationsEnabled ? 'Enabled' : 'Disabled'}
                  </Text>
                </View>
              </View>
              <Switch
                value={notificationsEnabled}
                onValueChange={handleNotificationsToggle}
                trackColor={{ false: '#2A4754', true: '#36B6D3' }}
              />
            </View>

            {/* Only show notification sub-settings when notifications are enabled */}
            {notificationsEnabled && (
              <>
                {/* Reminders - Updated to match other sections */}
                <View className="mb-4 flex-row items-center justify-between">
                  <View className="flex-row items-center">
                    <View
                      className={`mr-4 size-14 ${iconBgColor} items-center justify-center rounded-full`}
                    >
                      <Feather name="clock" size={24} color={iconColor} />
                    </View>
                    <View>
                      <Text className="text-xl font-medium text-white">
                        Daily Reminder
                      </Text>
                      <Text className="text-neutral-200">
                        {dailyReminder.enabled ? 'Enabled' : 'Disabled'}
                      </Text>
                    </View>
                  </View>
                  <Switch
                    value={dailyReminder.enabled}
                    onValueChange={handleToggleReminder}
                    trackColor={{ false: '#2A4754', true: '#36B6D3' }}
                  />
                </View>

                {/* Show time selector when reminder is enabled */}
                {dailyReminder.enabled && (
                  <View className="mb-6 ml-16">
                    <View className="flex-row items-center justify-between">
                      <Text className="text-neutral-200">Reminder Time</Text>

                      {!showTimePicker && (
                        <Pressable
                          onPress={() => setShowTimePicker(true)}
                          className="rounded-lg bg-neutral-400 px-4 py-2"
                        >
                          <Text className="text-center font-medium text-white">
                            {getReminderTimeDisplay()}
                          </Text>
                        </Pressable>
                      )}

                      {showTimePicker && (
                        <DateTimePicker
                          value={
                            new Date(
                              new Date().setHours(
                                dailyReminder.time?.hour || 0,
                                dailyReminder.time?.minute || 0
                              )
                            )
                          }
                          mode="time"
                          display="compact"
                          onChange={handleTimeChange}
                          minuteInterval={15}
                        />
                      )}
                    </View>
                  </View>
                )}

                {/* Streak Warning */}
                <View className="mb-4 flex-row items-center justify-between">
                  <View className="flex-row items-center">
                    <View
                      className={`mr-4 size-14 ${iconBgColor} items-center justify-center rounded-full`}
                    >
                      <Flame size={24} color={iconColor} />
                    </View>
                    <View>
                      <Text className="text-xl font-medium text-white">
                        Streak Warning
                      </Text>
                      <Text className="text-neutral-200">
                        {streakWarning.enabled ? 'Enabled' : 'Disabled'}
                      </Text>
                    </View>
                  </View>
                  <Switch
                    value={streakWarning.enabled}
                    onValueChange={handleToggleStreakWarning}
                    trackColor={{ false: '#2A4754', true: '#36B6D3' }}
                  />
                </View>

                {/* Show time selector when streak warning is enabled */}
                {streakWarning.enabled && (
                  <View className="mb-6 ml-16">
                    <View className="flex-row items-center justify-between">
                      <Text className="text-neutral-200">Reminder Time</Text>

                      {!showStreakTimePicker && (
                        <Pressable
                          onPress={() => setShowStreakTimePicker(true)}
                          className="rounded-lg bg-neutral-400 px-4 py-2"
                        >
                          <Text className="text-center font-medium text-white">
                            {getStreakTimeDisplay()}
                          </Text>
                        </Pressable>
                      )}

                      {showStreakTimePicker && (
                        <DateTimePicker
                          value={
                            new Date(
                              new Date().setHours(
                                streakWarning.time?.hour || 0,
                                streakWarning.time?.minute || 0
                              )
                            )
                          }
                          mode="time"
                          display="compact"
                          onChange={handleStreakTimeChange}
                          minuteInterval={15}
                        />
                      )}
                    </View>
                  </View>
                )}
              </>
            )}

            {/* Support Section */}
            <View className="mb-4">
              <Text className="mb-2 text-base uppercase text-neutral-300">
                SUPPORT
              </Text>
            </View>

            {/* Contact Us */}
            <View
              className="mb-4 flex-row items-center justify-between"
              onTouchEnd={() => handleEmail(contactEmail)}
            >
              <View className="flex-row items-center">
                <View
                  className={`mr-4 size-14 ${iconBgColor} items-center justify-center rounded-full`}
                >
                  <Feather name="mail" size={24} color={iconColor} />
                </View>
                <View>
                  <Text className="text-xl font-medium text-white">
                    Contact Us
                  </Text>
                  <Text className="text-neutral-200">{contactEmail}</Text>
                </View>
              </View>
            </View>

            {/* Request a Feature */}
            <View
              className="mb-8 flex-row items-center justify-between"
              onTouchEnd={() => handleEmail(contactEmail)}
            >
              <View className="flex-row items-center">
                <View
                  className={`mr-4 size-14 ${iconBgColor} items-center justify-center rounded-full`}
                >
                  <Feather name="help-circle" size={24} color={iconColor} />
                </View>
                <View>
                  <Text className="text-xl font-medium text-white">
                    Request a Feature
                  </Text>
                  <Text className="text-neutral-200">{contactEmail}</Text>
                </View>
              </View>
            </View>

            {/* Legal Section */}
            <View className="mb-4">
              <Text className="mb-2 text-base uppercase text-neutral-300">
                LEGAL
              </Text>
            </View>

            {/* Terms/Privacy Policy */}
            <Pressable
              className="mb-8 flex-row items-center justify-between"
              onPress={() => Linking.openURL('https://unquestapp.com/terms')}
            >
              <View className="flex-row items-center">
                <View
                  className={`mr-4 size-14 ${iconBgColor} items-center justify-center rounded-full`}
                >
                  <Feather name="shield" size={24} color={iconColor} />
                </View>
                <View>
                  <Text className="text-xl font-medium text-white">
                    Terms of Use & Privacy Policy
                  </Text>
                </View>
              </View>
              <Feather name="chevron-right" size={20} color="#5C7380" />
            </Pressable>

            {/* Danger Zone */}
            <View className="mb-4">
              <Text className="mb-2 text-base uppercase text-neutral-300">
                DANGER ZONE
              </Text>
            </View>

            <View className="mb-8 px-4">
              <Text className="mb-4 text-center text-neutral-200">
                Deleting your account will remove all your personal data.
              </Text>
              <View
                className="mx-auto rounded-full bg-red-500 p-2"
                style={{ width: '50%' }}
                onTouchEnd={handleDeleteAccount}
              >
                <Text className="text-center font-medium text-white">
                  Delete Account
                </Text>
              </View>
            </View>

            {/* Debug Section - Only in dev mode */}
            {__DEV__ && (
              <>
                <View className="mb-4">
                  <Text className="mb-2 text-base uppercase text-neutral-300">
                    DEBUG
                  </Text>
                </View>

                <Pressable
                  className="mb-4 flex-row items-center justify-between"
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
                      Alert.alert(
                        'Error',
                        'Failed to get OneSignal info: ' + error.message
                      );
                    }
                  }}
                >
                  <View className="flex-row items-center">
                    <View
                      className={`mr-4 size-14 ${iconBgColor} items-center justify-center rounded-full`}
                    >
                      <Feather name="code" size={24} color={iconColor} />
                    </View>
                    <View>
                      <Text className="text-xl font-medium text-white">
                        Check OneSignal ID
                      </Text>
                      <Text className="text-neutral-200">
                        Verify user ID mapping
                      </Text>
                    </View>
                  </View>
                  <Feather name="chevron-right" size={20} color="#5C7380" />
                </Pressable>

                <Pressable
                  className="mb-4 flex-row items-center justify-between"
                  onPress={async () => {
                    try {
                      // Get all notification status info
                      const permissionStatus =
                        await OneSignal.Notifications.getPermissionAsync();
                      const pushSubscription = OneSignal.User.pushSubscription;
                      const isOptedIn =
                        await pushSubscription.getOptedInAsync();
                      const subscriptionId =
                        await pushSubscription.getIdAsync();
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
                      Alert.alert(
                        'Error',
                        'Failed to get notification status: ' + error.message
                      );
                    }
                  }}
                >
                  <View className="flex-row items-center">
                    <View
                      className={`mr-4 size-14 ${iconBgColor} items-center justify-center rounded-full`}
                    >
                      <Feather name="bell" size={24} color={iconColor} />
                    </View>
                    <View>
                      <Text className="text-xl font-medium text-white">
                        Check Notification Status
                      </Text>
                      <Text className="text-neutral-200">
                        Debug push subscription
                      </Text>
                    </View>
                  </View>
                  <Feather name="chevron-right" size={20} color="#5C7380" />
                </Pressable>
              </>
            )}

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
        <BottomSheetKeyboardAwareScrollView>
          {TIMEZONES.map((timezone) => (
            <Pressable
              key={timezone.value}
              className="flex-row items-center justify-between border-b border-neutral-100 p-4"
              onPress={() => handleTimezoneChange(timezone.value)}
            >
              <Text className="text-base text-white">{timezone.label}</Text>
              {selectedTimezone === timezone.value && (
                <Feather name="check" size={20} color="#36B6D3" />
              )}
            </Pressable>
          ))}
          <View style={{ height: insets.bottom + 8 }} />
        </BottomSheetKeyboardAwareScrollView>
      </Modal>
    </View>
  );
}
