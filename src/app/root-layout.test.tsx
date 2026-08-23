import { jest } from '@jest/globals';
import { act, render, waitFor } from '@testing-library/react-native';
import React from 'react';
import { Platform } from 'react-native';

// Import the component after mocks are set up
import RootLayout from './_layout';

// Mock environment variables
jest.mock('@env', () => ({
  Env: {
    ONESIGNAL_APP_ID: 'test-onesignal-app-id',
    POSTHOG_API_KEY: 'test-posthog-key',
    APP_ENV: 'test',
  },
}));

// Mock external dependencies
jest.mock('@sentry/react-native', () => ({
  init: jest.fn(),
  mobileReplayIntegration: jest.fn(() => ({})),
  reactNavigationIntegration: jest.fn(() => ({
    registerNavigationContainer: jest.fn(),
  })),
  reactNativeTracingIntegration: jest.fn(() => ({})),
  wrap: jest.fn((component) => component),
}));

const mockPush = jest.fn();
const mockReplace = jest.fn();

// Simple mock for expo-router
jest.mock('expo-router', () => {
  const Stack = ({ children }: any) => <div>{children}</div>;
  Stack.Screen = () => null; // Stack.Screen renders nothing

  return {
    Stack,
    useRouter: () => ({
      push: mockPush,
      replace: mockReplace,
    }),
    useNavigationContainerRef: jest.fn(() => ({
      current: null,
    })),
  };
});

jest.mock('expo-splash-screen', () => ({
  preventAutoHideAsync: jest.fn().mockResolvedValue(undefined),
  hideAsync: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('expo-font', () => ({
  useFonts: jest.fn(() => [true, null]),
}));

jest.mock('react-native-onesignal', () => ({
  OneSignal: {
    initialize: jest.fn(),
    login: jest.fn(),
    Debug: {
      setLogLevel: jest.fn(),
    },
    User: {
      getOnesignalId: jest.fn().mockResolvedValue('test-onesignal-id'),
      getExternalId: jest.fn().mockResolvedValue('test-external-id'),
      pushSubscription: {
        getOptedInAsync: jest.fn().mockResolvedValue(true),
        getIdAsync: jest.fn().mockResolvedValue('test-subscription-id'),
        getTokenAsync: jest.fn().mockResolvedValue('test-token'),
      },
    },
    Notifications: {
      addEventListener: jest.fn(),
    },
    LiveActivities: {
      setupDefault: jest.fn(),
    },
  },
  LogLevel: {
    Verbose: 'verbose',
  },
}));

jest.mock('react-native-background-actions', () => ({
  isRunning: jest.fn().mockReturnValue(false),
  stop: jest.fn(),
}));

jest.mock('@/lib', () => ({
  hydrateAuth: jest.fn().mockResolvedValue(undefined),
  loadSelectedTheme: jest.fn().mockResolvedValue(undefined),
  useAuth: jest.fn((selector) => selector({ status: 'signedIn' })),
}));

jest.mock('@/lib/use-theme-config', () => ({
  useThemeConfig: jest.fn(() => ({
    dark: false,
    colors: {
      primary: '#51B1A9',
      background: '#FFF1DC',
      text: '#1f0f0c',
      border: '#e7e3d4',
      card: '#F5F5F0',
    },
  })),
}));

jest.mock('@/components/ui/colors', () => ({
  __esModule: true,
  default: {
    white: '#FFF1DC',
    primary: {
      100: '#E0F7F6',
      200: '#B3E5E3',
      400: '#51B1A9',
    },
    neutral: {
      50: '#F9F9F9',
      100: '#F5F5F0',
      200: '#e7e3d4',
    },
    muted: {
      500: '#6B7280',
    },
  },
}));

jest.mock('nativewind', () => ({
  useColorScheme: jest.fn(() => ({ colorScheme: 'light' })),
}));

jest.mock('@/lib/services/quest-presence-runtime', () => ({
  usePresenceRuntime: jest.fn(),
}));

jest.mock('@/lib/services/notifications', () => ({
  cancelLegacyStreakWarningNotification: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@/lib/services/quest-run-service', () => ({
  getQuestRunStatus: jest.fn().mockResolvedValue({
    id: 'test-quest-run-id',
    status: 'active',
  }),
}));

jest.mock('@/lib/services/timezone-service', () => ({
  initializeTimezoneSync: jest.fn(() => jest.fn()),
}));

jest.mock('@/store/character-store', () => ({
  useCharacterStore: {
    getState: jest.fn(() => ({
      dailyQuestStreak: 5,
      resetStreak: jest.fn(),
    })),
  },
}));

jest.mock('@/store/quest-store', () => ({
  useQuestStore: {
    getState: jest.fn(() => ({
      lastCompletedQuestTimestamp: Date.now() - 1000 * 60 * 60, // 1 hour ago
      cooperativeQuestRun: null,
      activeQuest: null,
      failQuest: jest.fn(),
    })),
  },
}));

jest.mock('@/store/user-store', () => ({
  useUserStore: {
    getState: jest.fn(() => ({
      user: { id: 'test-user-id' },
    })),
  },
}));

// Mock API and component providers
jest.mock('@/api', () => ({
  APIProvider: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

jest.mock('@/components/providers/lazy-websocket-provider', () => ({
  LazyWebSocketProvider: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

jest.mock('@/components/providers/posthog-navigation-tracker', () => ({
  PostHogNavigationTracker: () => <div>PostHogNavigationTracker</div>,
}));

jest.mock('@/components/providers/posthog-provider-wrapper', () => ({
  PostHogProviderWrapper: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

jest.mock('@/components/ui', () => ({
  SafeAreaView: ({ children, ...props }: any) => (
    <div {...props}>{children}</div>
  ),
}));

jest.mock('@gorhom/bottom-sheet', () => ({
  BottomSheetModalProvider: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

jest.mock('@react-navigation/native', () => ({
  ThemeProvider: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  DarkTheme: {
    colors: {
      primary: '#51B1A9',
      background: '#1f0f0c',
      text: '#FFF1DC',
      border: '#e7e3d4',
      card: '#F5F5F0',
    },
  },
  DefaultTheme: {
    colors: {
      primary: '#51B1A9',
      background: '#FFF1DC',
      text: '#1f0f0c',
      border: '#e7e3d4',
      card: '#F5F5F0',
    },
  },
}));

jest.mock('react-native-flash-message', () => ({
  __esModule: true,
  default: (props: any) => <div {...props}>FlashMessage</div>,
}));

jest.mock('react-native-gesture-handler', () => ({
  GestureHandlerRootView: ({ children, ...props }: any) => (
    <div {...props}>{children}</div>
  ),
}));

jest.mock('react-native-keyboard-controller', () => ({
  KeyboardProvider: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

jest.mock('./navigation-gate', () => ({
  __esModule: true,
  default: () => <div>NavigationGate</div>,
}));

// Mock the global CSS import
jest.mock('../../global.css', () => ({}));

describe('RootLayout', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPush.mockClear();
    mockReplace.mockClear();
    Platform.OS = 'ios';
  });

  it('should render without crashing', async () => {
    const renderResult = render(<RootLayout />);

    await waitFor(
      () => {
        expect(renderResult.toJSON()).toBeTruthy();
      },
      { timeout: 3000 }
    );
  });

  it('should initialize OneSignal when ONESIGNAL_APP_ID is provided', async () => {
    const { OneSignal } = require('react-native-onesignal');

    render(<RootLayout />);

    await waitFor(() => {
      expect(OneSignal.initialize).toHaveBeenCalledWith(
        'test-onesignal-app-id'
      );
    });
  });

  it('should set up LiveActivities on iOS', async () => {
    Platform.OS = 'ios';
    const { OneSignal } = require('react-native-onesignal');

    render(<RootLayout />);

    await waitFor(() => {
      expect(OneSignal.LiveActivities.setupDefault).toHaveBeenCalled();
    });
  });

  it('should not set up LiveActivities on Android', async () => {
    Platform.OS = 'android';
    const { OneSignal } = require('react-native-onesignal');

    render(<RootLayout />);

    await waitFor(() => {
      expect(OneSignal.LiveActivities.setupDefault).not.toHaveBeenCalled();
    });
  });

  it('should login user to OneSignal if user exists', async () => {
    const { OneSignal } = require('react-native-onesignal');

    render(<RootLayout />);

    await waitFor(() => {
      expect(OneSignal.login).toHaveBeenCalledWith('test-user-id');
    });
  });

  it('should set up notification event listeners', async () => {
    const { OneSignal } = require('react-native-onesignal');

    render(<RootLayout />);

    await waitFor(() => {
      expect(OneSignal.Notifications.addEventListener).toHaveBeenCalledWith(
        'click',
        expect.any(Function)
      );
      expect(OneSignal.Notifications.addEventListener).toHaveBeenCalledWith(
        'foregroundWillDisplay',
        expect.any(Function)
      );
    });
  });

  it('should initialize timezone sync', async () => {
    const {
      initializeTimezoneSync,
    } = require('@/lib/services/timezone-service');

    render(<RootLayout />);

    await waitFor(() => {
      expect(initializeTimezoneSync).toHaveBeenCalled();
    });
  });

  it('cancels the legacy local streak warning on boot and never schedules one', async () => {
    const {
      cancelLegacyStreakWarningNotification,
    } = require('@/lib/services/notifications');
    const { useCharacterStore } = require('@/store/character-store');
    const { useQuestStore } = require('@/store/quest-store');

    useCharacterStore.getState.mockReturnValue({
      dailyQuestStreak: 3,
      resetStreak: jest.fn(),
    });
    useQuestStore.getState.mockReturnValue({
      lastCompletedQuestTimestamp: Date.now() - 20 * 60 * 60 * 1000,
      cooperativeQuestRun: null,
      activeQuest: null,
      failQuest: jest.fn(),
    });

    render(<RootLayout />);

    await waitFor(() => {
      expect(cancelLegacyStreakWarningNotification).toHaveBeenCalledTimes(1);
    });
  });

  it('should reset streak when more than 24 hours since last completion', async () => {
    const {
      cancelLegacyStreakWarningNotification,
    } = require('@/lib/services/notifications');
    const {
      initializeTimezoneSync,
    } = require('@/lib/services/timezone-service');
    const { useCharacterStore } = require('@/store/character-store');
    const { useQuestStore } = require('@/store/quest-store');
    const mockResetStreak = jest.fn();

    useCharacterStore.getState.mockReturnValue({
      dailyQuestStreak: 5,
      resetStreak: mockResetStreak,
    });

    // Mock last quest completion from 26 hours ago
    const moreThan24HoursAgo = Date.now() - 1000 * 60 * 60 * 26;
    useQuestStore.getState.mockReturnValue({
      lastCompletedQuestTimestamp: moreThan24HoursAgo,
      cooperativeQuestRun: null,
      activeQuest: null,
      failQuest: jest.fn(),
    });

    const renderResult = render(<RootLayout />);

    await waitFor(() => {
      expect(mockResetStreak).toHaveBeenCalled();
    });

    // The legacy local alarm must be cancelled even on the streak-reset path,
    // since it's an unconditional boot-time cleanup, not part of the streak logic.
    expect(cancelLegacyStreakWarningNotification).toHaveBeenCalledTimes(1);

    // The streak-reset branch must not bail out before the effect returns its
    // cleanup function, or the timezone-sync listener is never torn down.
    const cleanupTimezoneSync = initializeTimezoneSync.mock.results[0].value;
    renderResult.unmount();
    expect(cleanupTimezoneSync).toHaveBeenCalled();
  });

  it('cancels the legacy local streak warning on boot even with no active streak', async () => {
    const {
      cancelLegacyStreakWarningNotification,
    } = require('@/lib/services/notifications');
    const { useCharacterStore } = require('@/store/character-store');
    const { useQuestStore } = require('@/store/quest-store');

    useCharacterStore.getState.mockReturnValue({
      dailyQuestStreak: 0,
      resetStreak: jest.fn(),
    });
    useQuestStore.getState.mockReturnValue({
      lastCompletedQuestTimestamp: null,
      cooperativeQuestRun: null,
      activeQuest: null,
      failQuest: jest.fn(),
    });

    render(<RootLayout />);

    await waitFor(() => {
      expect(cancelLegacyStreakWarningNotification).toHaveBeenCalledTimes(1);
    });
  });

  it('should render all required Stack screens', async () => {
    const renderResult = render(<RootLayout />);

    await waitFor(
      () => {
        expect(renderResult.toJSON()).toBeTruthy();
      },
      { timeout: 3000 }
    );

    // Check that Stack screens are configured
    // This is a basic test since Stack is mocked
    expect(renderResult.toJSON()).toBeTruthy();
  });

  it('should return null when hydration is not finished', () => {
    const { hydrateAuth } = require('@/lib');

    // Mock hydration as not finished
    hydrateAuth.mockImplementation(() => new Promise(() => {})); // Never resolves

    const renderResult = render(<RootLayout />);

    // Should render null (empty container)
    expect(renderResult.toJSON()).toBeNull();
  });

  it('should return null when auth status is hydrating', () => {
    const { useAuth } = require('@/lib');

    // Mock auth as still hydrating
    useAuth.mockImplementation((selector) => selector({ status: 'hydrating' }));

    const renderResult = render(<RootLayout />);

    // Should render null (empty container)
    expect(renderResult.toJSON()).toBeNull();
  });

  it('should handle notification click for cooperative quest invitation', async () => {
    // Use fake timers for this test since there's a setTimeout in the code
    jest.useFakeTimers();

    const { OneSignal } = require('react-native-onesignal');

    render(<RootLayout />);

    // Wait for OneSignal to be initialized
    await waitFor(() => {
      expect(OneSignal.Notifications.addEventListener).toHaveBeenCalledWith(
        'click',
        expect.any(Function)
      );
    });

    // Get the click handler
    const clickHandler = (
      OneSignal.Notifications.addEventListener as jest.Mock
    ).mock.calls.find((call) => call[0] === 'click')[1];

    // Simulate notification click
    const mockEvent = {
      notification: {
        additionalData: {
          type: 'cooperative_quest_invitation',
        },
      },
    };

    clickHandler(mockEvent);

    // Fast-forward time by 1 second (the setTimeout delay in the code)
    jest.advanceTimersByTime(1000);

    // Should navigate to join cooperative quest page
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/join-cooperative-quest');
    });

    // Restore real timers
    jest.useRealTimers();
  });

  it('should route scheduled_quest_starting_soon/started/cancelled clicks to the event screen', async () => {
    // Use fake timers for this test since there's a setTimeout in the code
    jest.useFakeTimers();

    const { OneSignal } = require('react-native-onesignal');

    render(<RootLayout />);

    // Wait for OneSignal to be initialized
    await waitFor(() => {
      expect(OneSignal.Notifications.addEventListener).toHaveBeenCalledWith(
        'click',
        expect.any(Function)
      );
    });

    // Get the click handler
    const clickHandler = (
      OneSignal.Notifications.addEventListener as jest.Mock
    ).mock.calls.find((call) => call[0] === 'click')[1];

    for (const type of [
      'scheduled_quest_starting_soon',
      'scheduled_quest_started',
      'scheduled_quest_cancelled',
    ]) {
      mockPush.mockClear();

      // Simulate notification click
      const mockEvent = {
        notification: {
          additionalData: {
            type,
            questRunId: 'r1',
          },
        },
      };

      clickHandler(mockEvent);

      // Fast-forward time by 1 second (the setTimeout delay in the code)
      jest.advanceTimersByTime(1000);

      // Should navigate to the scheduled quest event screen
      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/scheduled-quest/r1');
      });
    }

    // Restore real timers
    jest.useRealTimers();
  });

  it('should route scheduled_quest_kicked clicks to the scheduled quest list', async () => {
    // Use fake timers for this test since there's a setTimeout in the code
    jest.useFakeTimers();

    const { OneSignal } = require('react-native-onesignal');

    render(<RootLayout />);

    // Wait for OneSignal to be initialized
    await waitFor(() => {
      expect(OneSignal.Notifications.addEventListener).toHaveBeenCalledWith(
        'click',
        expect.any(Function)
      );
    });

    // Get the click handler
    const clickHandler = (
      OneSignal.Notifications.addEventListener as jest.Mock
    ).mock.calls.find((call) => call[0] === 'click')[1];

    // Simulate notification click
    const mockEvent = {
      notification: {
        additionalData: {
          type: 'scheduled_quest_kicked',
        },
      },
    };

    clickHandler(mockEvent);

    // Fast-forward time by 1 second (the setTimeout delay in the code)
    jest.advanceTimersByTime(1000);

    // Should navigate to the scheduled quest list
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/scheduled-quest');
    });

    // Restore real timers
    jest.useRealTimers();
  });

  it('should handle quest failure notifications', async () => {
    const { OneSignal } = require('react-native-onesignal');
    const { useQuestStore } = require('@/store/quest-store');
    const mockFailQuest = jest.fn();

    useQuestStore.getState.mockReturnValue({
      lastCompletedQuestTimestamp: Date.now(),
      cooperativeQuestRun: {
        id: 'test-quest-run-id',
        status: 'active',
      },
      activeQuest: null,
      failQuest: mockFailQuest,
    });

    render(<RootLayout />);

    // Wait for OneSignal to be initialized
    await waitFor(() => {
      expect(OneSignal.Notifications.addEventListener).toHaveBeenCalledWith(
        'click',
        expect.any(Function)
      );
    });

    // Get the click handler
    const clickHandler = (
      OneSignal.Notifications.addEventListener as jest.Mock
    ).mock.calls.find((call) => call[0] === 'click')[1];

    // Simulate quest failure notification click
    const mockEvent = {
      notification: {
        additionalData: {
          type: 'quest_failed',
          questRunId: 'test-quest-run-id',
        },
      },
    };

    clickHandler(mockEvent);

    await waitFor(() => {
      expect(mockFailQuest).toHaveBeenCalled();
    });
  });

  it('should handle re-engagement notification click by navigating to home tab', async () => {
    // Use fake timers since there's a setTimeout in the handler
    jest.useFakeTimers();

    const { OneSignal } = require('react-native-onesignal');

    render(<RootLayout />);

    // Wait for OneSignal to be initialized
    await waitFor(() => {
      expect(OneSignal.Notifications.addEventListener).toHaveBeenCalledWith(
        'click',
        expect.any(Function)
      );
    });

    // Get the click handler
    const clickHandler = (
      OneSignal.Notifications.addEventListener as jest.Mock
    ).mock.calls.find((call) => call[0] === 'click')[1];

    // Simulate re-engagement notification click
    const mockEvent = {
      notification: {
        additionalData: {
          type: 're_engagement',
          phase: 'day3',
          screen: 'home',
          storylineSlug: 'vaedros',
        },
      },
    };

    clickHandler(mockEvent);

    // Fast-forward time by 1 second (the setTimeout delay in the code)
    jest.advanceTimersByTime(1000);

    // Should navigate to the home tab using replace (not push)
    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('/(app)');
    });

    // Restore real timers
    jest.useRealTimers();
  });

  it('should handle foreground notifications', async () => {
    const { OneSignal } = require('react-native-onesignal');
    const { useQuestStore } = require('@/store/quest-store');
    const mockFailQuest = jest.fn();

    useQuestStore.getState.mockReturnValue({
      lastCompletedQuestTimestamp: Date.now(),
      cooperativeQuestRun: null,
      activeQuest: {
        id: 'test-quest-run-id',
      },
      failQuest: mockFailQuest,
    });

    render(<RootLayout />);

    // Wait for OneSignal to be initialized
    await waitFor(() => {
      expect(OneSignal.Notifications.addEventListener).toHaveBeenCalledWith(
        'foregroundWillDisplay',
        expect.any(Function)
      );
    });

    // Get the foreground handler
    const foregroundHandler = (
      OneSignal.Notifications.addEventListener as jest.Mock
    ).mock.calls.find((call) => call[0] === 'foregroundWillDisplay')[1];

    // Simulate foreground notification
    const mockEvent = {
      notification: {
        additionalData: {
          type: 'quest_failed',
          questRunId: 'test-quest-run-id',
        },
        display: jest.fn(),
      },
      preventDefault: jest.fn(),
    };

    foregroundHandler(mockEvent);

    await waitFor(() => {
      expect(mockFailQuest).toHaveBeenCalled();
      expect(mockEvent.preventDefault).toHaveBeenCalled();
      expect(mockEvent.notification.display).toHaveBeenCalled();
    });
  });

  // Regression tests for the 2.0.0 production boot freeze: the splash was only
  // hidden from GestureHandlerRootView's onLayout, which never fires in release
  // builds on the SDK 54 / Fabric stack. expo-splash-screen 31.x blocks every
  // frame until hideAsync() is called, so the app froze on the splash forever.
  // Hiding must not depend on a layout event.
  describe('splash screen hiding', () => {
    it('hides the splash once hydration, auth, and fonts are ready — without any layout event', async () => {
      const { useAuth } = require('@/lib');
      const SplashScreen = require('expo-splash-screen');
      // Pin auth explicitly: earlier tests replace the useAuth implementation
      // with 'hydrating' and jest.clearAllMocks() does NOT restore it.
      useAuth.mockImplementation((selector: any) =>
        selector({ status: 'signIn' })
      );

      render(<RootLayout />);

      await waitFor(() => {
        expect(SplashScreen.hideAsync).toHaveBeenCalled();
      });
    });

    it('does not hide the splash while auth is still hydrating', async () => {
      const { useAuth } = require('@/lib');
      const SplashScreen = require('expo-splash-screen');
      useAuth.mockImplementation((selector: any) =>
        selector({ status: 'hydrating' })
      );

      render(<RootLayout />);

      // Flush effects and pending microtasks so a wrongly-fired hide would land
      await act(async () => {
        await new Promise((resolve) => setImmediate(resolve));
      });

      expect(SplashScreen.hideAsync).not.toHaveBeenCalled();
    });
  });
});
