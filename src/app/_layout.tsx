// Import  global CSS file
import '../../global.css';

import { Env } from '@env';
import {
  SourceSans3_300Light,
  SourceSans3_400Regular,
  SourceSans3_500Medium,
  SourceSans3_600SemiBold,
  SourceSans3_700Bold,
} from '@expo-google-fonts/source-sans-3';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { ThemeProvider } from '@react-navigation/native';
import * as Sentry from '@sentry/react-native';
import { isRunningInExpoGo } from 'expo';
import { useFonts } from 'expo-font';
import { Stack, useNavigationContainerRef, useRouter } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import React, { useCallback, useEffect } from 'react';
import { AppState, type AppStateStatus, Platform, View } from 'react-native';
import BackgroundService from 'react-native-bg-actions';
import FlashMessage from 'react-native-flash-message';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { LogLevel, OneSignal } from 'react-native-onesignal';
import { ReducedMotionConfig, ReduceMotion } from 'react-native-reanimated';

import { APIProvider } from '@/api';
import { LazyWebSocketProvider } from '@/components/providers/lazy-websocket-provider';
import { PostHogNavigationTracker } from '@/components/providers/posthog-navigation-tracker';
import { PostHogProviderWrapper } from '@/components/providers/posthog-provider-wrapper';
import { SafeAreaView, UpdateNotificationBar } from '@/components/ui';
import colors from '@/components/ui/colors';
import { hydrateAuth, loadSelectedTheme, useAuth } from '@/lib';
import { useTokenRefreshErrorHandler } from '@/lib/hooks/use-token-refresh-error-handler';
import useLockStateDetection from '@/lib/hooks/useLockStateDetection';
import { scheduleStreakWarningNotification } from '@/lib/services/notifications';
import { getQuestRunStatus } from '@/lib/services/quest-run-service';
import { revenueCatService } from '@/lib/services/revenuecat-service';
import { initializeTimezoneSync } from '@/lib/services/timezone-service';
import { useThemeConfig } from '@/lib/use-theme-config';
import { useCharacterStore } from '@/store/character-store';
import { useQuestStore } from '@/store/quest-store';

import NavigationGate from './navigation-gate';

export { ErrorBoundary } from '@/components/ErrorBoundary';

const navigationIntegration = Sentry.reactNavigationIntegration({
  enableTimeToInitialDisplay: !isRunningInExpoGo(),
});

const integrations =
  Env.APP_ENV === 'production'
    ? [
        Sentry.mobileReplayIntegration({
          enableExperimentalViewRenderer: true,
          maskAllText: false,
          maskAllImages: false,
          maskAllVectors: false,
        }),
        Sentry.reactNativeTracingIntegration(),
        navigationIntegration,
      ]
    : [Sentry.reactNativeTracingIntegration(), navigationIntegration];

Sentry.init({
  dsn: 'https://6d85dbe3783d343a049b93fa8afaf144@o4508966745997312.ingest.us.sentry.io/4508966747570176',
  replaysSessionSampleRate: 1.0,
  replaysOnErrorSampleRate: 1.0,
  integrations: integrations,
  tracesSampleRate: 1.0,
});

// Keep the splash screen visible until we explicitly hide it
SplashScreen.preventAutoHideAsync().catch(() => {
  /* reloading the app might trigger some race conditions, ignore them */
});

// Perform the hydration here so it happens as early as possible
const hydrationPromise = Promise.all([hydrateAuth(), loadSelectedTheme()]);

// Quest failure handler function
const handleQuestFailure = (questRunId: string) => {
  console.log('[Push Notification] Handling quest failure for:', questRunId);
  const questStore = useQuestStore.getState();

  if (
    questStore.cooperativeQuestRun?.id === questRunId ||
    questStore.activeQuest?.id === questRunId
  ) {
    console.log('[Push Notification] Marking quest as failed');
    questStore.failQuest();

    // Stop Android background service
    if (Platform.OS === 'android' && BackgroundService.isRunning()) {
      console.log('[Push Notification] Stopping Android background service');
      BackgroundService.stop();
    }
  }
};

function RootLayout() {
  // Load custom fonts
  const [fontsLoaded] = useFonts({
    SourceSans3_300Light,
    SourceSans3_400Regular,
    SourceSans3_500Medium,
    SourceSans3_600SemiBold,
    SourceSans3_700Bold,
  });

  // Get auth status
  const authStatus = useAuth((state) => state.status);
  const [hydrationFinished, setHydrationFinished] = React.useState(false);
  const router = useRouter();
  const appStateRef = React.useRef<AppStateStatus>(AppState.currentState);

  useEffect(() => {
    async function prepare() {
      try {
        await hydrationPromise;
      } catch (e) {
        console.warn('Error during app initialization:', e);
      } finally {
        // Indicate that the initial async operations are done
        setHydrationFinished(true);
      }
    }
    prepare();
  }, []);

  const ref = useNavigationContainerRef();
  React.useEffect(() => {
    if (ref) {
      navigationIntegration.registerNavigationContainer(ref);
    }
  }, [ref]);

  useEffect(() => {
    if (Env.ONESIGNAL_APP_ID) {
      // Enable verbose logging for debugging (can be removed for production)
      OneSignal.Debug.setLogLevel(LogLevel.Verbose);

      // Initialize OneSignal
      OneSignal.initialize(Env.ONESIGNAL_APP_ID);
      if (Platform.OS === 'ios') {
        OneSignal.LiveActivities.setupDefault();
      }

      // Mark OneSignal as initialized globally
      (global as any).isOneSignalInitialized = true;

      // If we have a logged-in user, set their external ID now
      const { useUserStore } = require('@/store/user-store');
      const { getItem } = require('@/lib/storage');
      const user = useUserStore.getState().user;

      if (user?.id) {
        console.log(
          '[OneSignal] Setting external ID for existing user:',
          user.id
        );
        OneSignal.login(user.id);
      } else {
        // Check for provisional user
        const provisionalUserId = getItem('provisionalUserId');
        if (provisionalUserId) {
          console.log(
            '[OneSignal] Setting external ID for provisional user:',
            provisionalUserId
          );
          OneSignal.login(provisionalUserId);
        }
      }

      // Debug: Check current OneSignal user state
      const debugCheckOneSignalUser = async () => {
        try {
          const onesignalId = await OneSignal.User.getOnesignalId();
          const externalId = await OneSignal.User.getExternalId();

          // Check push subscription status
          const pushSubscription = OneSignal.User.pushSubscription;
          const isOptedIn = await pushSubscription.getOptedInAsync();
          const subscriptionId = await pushSubscription.getIdAsync();
          const token = await pushSubscription.getTokenAsync();

          console.log('========================================');
          console.log('[OneSignal Debug] Current User State:');
          console.log('OneSignal ID:', onesignalId);
          console.log('External ID (MongoDB User ID):', externalId);
          console.log('Push Subscription Status:');
          console.log('  - Opted In:', isOptedIn);
          console.log('  - Subscription ID:', subscriptionId || 'Not set');
          console.log('  - Push Token:', token || 'Not set');
          console.log('Platform:', Platform.OS);
          console.log('========================================');
        } catch (error) {
          console.error('[OneSignal Debug] Error getting user info:', error);
        }
      };

      debugCheckOneSignalUser();

      // Handle notification opens for cooperative quest invitations
      OneSignal.Notifications.addEventListener('click', (event) => {
        console.log('Notification clicked:', event);

        // Check if this is a cooperative quest invitation notification
        const { notification } = event;
        const additionalData = notification.additionalData as any;

        if (additionalData?.type === 'cooperative_quest_invitation') {
          // Navigate to the join cooperative quest screen
          // This will happen after the app is ready and authenticated
          setTimeout(() => {
            router.push('/join-cooperative-quest');
          }, 1000);
        } else if (
          additionalData?.type === 'quest_failed' &&
          additionalData?.questRunId
        ) {
          // Handle quest failure notification
          handleQuestFailure(additionalData.questRunId);
        }
      });

      // Handle notifications received while app is in foreground
      OneSignal.Notifications.addEventListener(
        'foregroundWillDisplay',
        (event) => {
          console.log('Notification received in foreground:', event);

          const { notification } = event;
          const additionalData = notification.additionalData as any;

          if (
            additionalData?.type === 'quest_failed' &&
            additionalData?.questRunId
          ) {
            // Handle quest failure immediately
            handleQuestFailure(additionalData.questRunId);
          }

          // Display the notification
          event.preventDefault();
          event.notification.display();
        }
      );
    }
  }, [router]);

  // Initialize RevenueCat SDK on app launch (following official docs)
  useEffect(() => {
    // Skip RevenueCat initialization in development to avoid bundle ID mismatch errors
    // Development mode already grants premium access (see revenuecat-service.ts line 131-134)
    if (__DEV__ && Env.APP_ENV === 'development') {
      console.log(
        '[RevenueCat] Skipping SDK initialization in development mode'
      );
      return;
    }

    try {
      // Enable test mode in development first
      // Commented out to test actual paywall behavior
      // if (__DEV__) {
      //   revenueCatService.enableTestMode();
      // }

      // Initialize RevenueCat SDK without user ID (per documentation)
      revenueCatService.initialize();

      console.log('[RevenueCat] SDK configured on app launch');
    } catch (error) {
      console.error('[RevenueCat] Failed to configure SDK:', error);
      // Don't crash the app if RevenueCat fails to initialize
    }
  }, []); // Empty dependency array - only run once on mount

  // Handle app state changes to check quest status when app comes to foreground
  useEffect(() => {
    const subscription = AppState.addEventListener(
      'change',
      async (nextAppState) => {
        if (
          (appStateRef.current === 'inactive' ||
            appStateRef.current === 'background') &&
          nextAppState === 'active'
        ) {
          // App has come to foreground
          console.log('[App State] App foregrounded, checking quest status');

          // Check if we have an active cooperative quest that might have failed
          const questStore = useQuestStore.getState();
          if (
            questStore.cooperativeQuestRun?.status === 'active' &&
            questStore.cooperativeQuestRun?.id
          ) {
            try {
              // Single status check when app comes to foreground
              const status = await getQuestRunStatus(
                questStore.cooperativeQuestRun.id
              );
              console.log(
                '[App State] Quest status check result:',
                status.status
              );

              if (status.status === 'failed') {
                console.log('[App State] Quest has failed, handling failure');
                handleQuestFailure(status.id);
              }
            } catch (error) {
              console.error('[App State] Failed to check quest status:', error);
            }
          }
        }
        appStateRef.current = nextAppState;
      }
    );

    return () => {
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    // Initialize timezone sync
    const cleanupTimezoneSync = initializeTimezoneSync();

    // Check streak status on app launch
    const lastCompletedQuestTimestamp =
      useQuestStore.getState().lastCompletedQuestTimestamp;
    const characterStore = useCharacterStore.getState();
    const dailyQuestStreak = characterStore.dailyQuestStreak;

    // First check if streak should be reset (24+ hours since last completion)
    if (lastCompletedQuestTimestamp && dailyQuestStreak > 0) {
      const now = Date.now();
      const hoursSinceLastCompletion =
        (now - lastCompletedQuestTimestamp) / (1000 * 60 * 60);

      if (hoursSinceLastCompletion > 24) {
        // Reset the streak if it's been more than 24 hours
        characterStore.resetStreak();
        console.log(
          'Streak reset: More than 24 hours since last quest completion'
        );
        return; // No need to schedule warning if streak is already broken
      }
    }

    // If streak is still active, check if we need to schedule a warning
    if (dailyQuestStreak > 0) {
      // Check if user has completed a quest today
      const now = new Date();
      const lastCompletionDate = lastCompletedQuestTimestamp
        ? new Date(lastCompletedQuestTimestamp)
        : null;

      // If no quest completed today and there's an active streak, schedule warning
      if (
        !lastCompletionDate ||
        lastCompletionDate.getDate() !== now.getDate() ||
        lastCompletionDate.getMonth() !== now.getMonth() ||
        lastCompletionDate.getFullYear() !== now.getFullYear()
      ) {
        // Only this part needs to be async
        scheduleStreakWarningNotification().catch(console.error);
      }
    }

    // Cleanup on unmount
    return () => {
      cleanupTimezoneSync();
    };
  }, []);

  const onLayoutRootView = useCallback(async () => {
    // Check all flags: hydration promise resolved, auth status is final, and fonts are loaded
    if (hydrationFinished && authStatus !== 'hydrating' && fontsLoaded) {
      await SplashScreen.hideAsync();
    }
  }, [hydrationFinished, authStatus, fontsLoaded]);

  // Activate lock detection for the whole main app.
  useLockStateDetection();

  // Handle token refresh exhaustion
  useTokenRefreshErrorHandler();

  // Return null until hydration promise is done, auth status is final, and fonts are loaded
  if (!hydrationFinished || authStatus === 'hydrating' || !fontsLoaded) {
    return null;
  }

  // Always render the Stack - let child layouts handle redirects
  return (
    <Providers onLayout={onLayoutRootView}>
      <NavigationGate />
      <PostHogNavigationTracker />
      <Stack
        screenOptions={{
          contentStyle: { backgroundColor: colors.black },
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen name="(app)" options={{ headerShown: false }} />
        <Stack.Screen name="onboarding" options={{ headerShown: false }} />
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="pending-quest" options={{ headerShown: false }} />
        <Stack.Screen
          name="cooperative-pending-quest"
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="first-quest-result"
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="quest-completed-signup"
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="streak-celebration"
          options={{
            headerShown: false,
            animation: 'fade',
          }}
        />
        <Stack.Screen
          name="restoration"
          options={{
            headerShown: false,
            animation: 'fade',
          }}
        />
        <Stack.Screen
          name="cooperative-quest-menu"
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="create-cooperative-quest"
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="join-cooperative-quest"
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="cooperative-quest-lobby/[lobbyId]"
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="cooperative-quest-ready"
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="auth/magiclink/verify"
          options={{ headerShown: false }}
        />
      </Stack>
    </Providers>
  );
}

function Providers({
  children,
  onLayout,
}: {
  children: React.ReactNode;
  onLayout?: () => void;
}) {
  const theme = useThemeConfig();
  return (
    <View className="flex-1 bg-background">
      <SafeAreaView
        className="flex-1 bg-background"
        edges={['top', 'left', 'right']}
      >
        <GestureHandlerRootView
          className={theme.dark ? `dark flex-1` : undefined}
          onLayout={onLayout}
        >
          <KeyboardProvider>
            <ThemeProvider value={theme}>
              <PostHogProviderWrapper
                apiKey={Env.POSTHOG_API_KEY}
                options={{
                  host: 'https://us.i.posthog.com',
                }}
              >
                <APIProvider>
                  <LazyWebSocketProvider>
                    <BottomSheetModalProvider>
                      <ReducedMotionConfig mode={ReduceMotion.Never} />
                      <UpdateNotificationBar />
                      {children}
                      <FlashMessage position="top" />
                    </BottomSheetModalProvider>
                  </LazyWebSocketProvider>
                </APIProvider>
              </PostHogProviderWrapper>
            </ThemeProvider>
          </KeyboardProvider>
        </GestureHandlerRootView>
      </SafeAreaView>
    </View>
  );
}
export default Sentry.wrap(RootLayout);
