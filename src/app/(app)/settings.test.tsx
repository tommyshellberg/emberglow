import { fireEvent, render, screen, waitFor } from '@/lib/test-utils';

import Settings from './settings';

// Mock lucide-react-native icons as simple mock functions
jest.mock('lucide-react-native', () => ({
  Crown: () => null,
  Flame: () => null,
  Globe: () => null,
}));

// Mock react-native-svg for lucide icons
jest.mock('react-native-svg', () => ({
  Svg: () => null,
  Path: () => null,
  Circle: () => null,
  Rect: () => null,
  Line: () => null,
  Polygon: () => null,
  Polyline: () => null,
  G: () => null,
}));

// Mock i18n to avoid storage issues
jest.mock('@/lib/i18n', () => ({
  translate: jest.fn((key) => key),
  useTranslation: jest.fn(() => ({
    t: (key: string) => key,
    changeLanguage: jest.fn(),
  })),
  useSelectedLanguage: jest.fn(() => 'en'),
}));

// Mock react-native-localize
jest.mock('react-native-localize', () => ({
  getLocales: jest.fn(() => [{ languageCode: 'en', countryCode: 'US' }]),
  getTimeZone: jest.fn(() => 'America/New_York'),
  uses24HourClock: jest.fn(() => false),
  usesMetricSystem: jest.fn(() => false),
}));

// Mock the navigation dependencies
jest.mock('expo-router', () => ({
  useRouter: () => ({
    replace: jest.fn(),
  }),
  Link: 'Link',
}));

// Mock the animation hooks
jest.mock('react-native-reanimated', () => {
  const Reanimated = require('react-native-reanimated/mock');
  Reanimated.default.call = () => {};
  return {
    ...Reanimated,
    useSharedValue: jest.fn(() => ({ value: 0 })),
    withTiming: jest.fn(() => 1),
    useAnimatedStyle: jest.fn(() => ({})),
  };
});

// Mock DateTimePicker
jest.mock('@react-native-community/datetimepicker', () => 'DateTimePicker');

// Mock the auth hook
jest.mock('@/lib', () => ({
  useAuth: () => ({
    signOut: jest.fn(),
  }),
}));

// Mock all notification services to return simple promises
jest.mock('@/lib/services/notifications', () => ({
  areNotificationsEnabled: jest.fn().mockResolvedValue(true),
  cancelDailyReminderNotification: jest.fn().mockResolvedValue(true),
  cancelStreakWarningNotification: jest.fn().mockResolvedValue(true),
  requestNotificationPermissions: jest.fn().mockResolvedValue(true),
  scheduleDailyReminderNotification: jest.fn().mockResolvedValue(true),
  scheduleStreakWarningNotification: jest.fn().mockResolvedValue(true),
}));

// Mock user service
jest.mock('@/lib/services/user', () => ({
  getUserDetails: jest.fn().mockResolvedValue({ email: 'test@example.com' }),
  deleteUserAccount: jest.fn(),
}));

// Mock the stores used in Settings. `nudges` is backed by real React state so
// that toggling the switch actually re-renders the component with the new
// value, letting tests observe the resulting server-sync effect.
jest.mock('@/store/settings-store', () => {
  const { useState } = require('react');
  return {
    useSettingsStore: jest.fn(() => {
      const [nudges, setNudges] = useState({ enabled: true });
      return {
        dailyReminder: { enabled: false, time: null },
        streakWarning: { enabled: false, time: null },
        nudges,
        setDailyReminder: jest.fn(),
        setStreakWarning: jest.fn(),
        setNudges,
      };
    }),
  };
});

// Mock the notification-settings hook so tests control what "server data"
// looks like on load and can observe outbound PATCH calls directly, without
// depending on TanStack Query's async resolution timing.
const mockUpdateSettings = jest.fn();
let mockNotificationSettingsData: unknown;

jest.mock('@/hooks/use-notification-settings', () => ({
  useNotificationSettings: () => ({
    settings: mockNotificationSettingsData,
    updateSettings: mockUpdateSettings,
    isLoading: false,
  }),
}));

jest.mock('@/store/user-store', () => ({
  useUserStore: jest.fn((selector) =>
    selector({
      user: { email: 'test@example.com' },
      setUser: jest.fn(),
    })
  ),
}));

// Mock expo-font
jest.mock('expo-font', () => ({
  isLoaded: jest.fn(() => true),
  loadAsync: jest.fn(() => Promise.resolve()),
}));

// Mock @expo/vector-icons
jest.mock('@expo/vector-icons', () => ({
  Feather: 'Feather',
}));

// Mock the UI components
jest.mock('@/components/ui', () => ({
  FocusAwareStatusBar: 'FocusAwareStatusBar',
  ScrollView: 'ScrollView',
  Text: 'Text',
  View: 'View',
  ScreenContainer: 'ScreenContainer',
  ScreenHeader: 'ScreenHeader',
  BottomSheetKeyboardAwareScrollView: 'BottomSheetKeyboardAwareScrollView',
}));

// Mock expo-linking
jest.mock('expo-linking', () => ({
  openURL: jest.fn(),
}));

// Mock storage
jest.mock('@/lib/storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
}));

// Mock OneSignal
jest.mock('react-native-onesignal', () => ({
  OneSignal: {
    Notifications: {
      requestPermission: jest.fn(),
      hasPermission: jest.fn(() => Promise.resolve(true)),
    },
  },
}));

// Mock @env
jest.mock('@env', () => ({
  Env: {
    VERSION: '1.0.0',
  },
}));

// Mock expo-updates
let mockUpdateId = 'abc123def456789';
jest.mock('expo-updates', () => ({
  get updateId() {
    return mockUpdateId;
  },
  checkForUpdateAsync: jest.fn(),
  fetchUpdateAsync: jest.fn(),
  reloadAsync: jest.fn(),
  useUpdates: jest.fn(() => ({
    isUpdateAvailable: false,
    isUpdatePending: false,
  })),
}));

// Test that the component renders without errors
describe('Settings Screen', () => {
  beforeEach(() => {
    // Reset __DEV__ for each test
    global.__DEV__ = false;
    // Reset mockUpdateId to default value
    mockUpdateId = 'abc123def456789';
  });

  afterEach(() => {
    // Restore __DEV__
    global.__DEV__ = true;
  });

  it('renders without crashing', async () => {
    const { getByText } = render(<Settings />);
    await waitFor(() => {
      // Look for content that's actually rendered as text, not just passed as props
      expect(getByText('Account')).toBeTruthy();
    });
  });

  it('displays EAS Update version when available in production', async () => {
    const { getByText } = render(<Settings />);

    await waitFor(() => {
      // Should display the shortened update ID
      expect(getByText('Update: abc123d')).toBeTruthy();
    });
  });

  it('does not display EAS Update version in development', async () => {
    // Set __DEV__ to true for this test
    global.__DEV__ = true;

    const { queryByText } = render(<Settings />);

    await waitFor(() => {
      // Should not display update ID in dev mode
      expect(queryByText(/Update:/)).toBeNull();
    });
  });

  it('does not display EAS Update version when updateId is null', async () => {
    // Set updateId to null for this test
    mockUpdateId = null;

    const { queryByText } = render(<Settings />);

    await waitFor(() => {
      // Should not display update section when updateId is null
      expect(queryByText(/Update:/)).toBeNull();
    });
  });
});

describe('Nudges toggle', () => {
  beforeEach(() => {
    global.__DEV__ = false;
    mockUpdateSettings.mockClear();
    mockNotificationSettingsData = undefined;
  });

  afterEach(() => {
    global.__DEV__ = true;
  });

  it('renders the Nudges row with its description', async () => {
    render(<Settings />);
    expect(await screen.findByText('Nudges')).toBeOnTheScreen();
    expect(
      screen.getByText(
        "Occasional reminders to pick your journey back up when you've been away."
      )
    ).toBeOnTheScreen();
  });

  it('sends { nudges: { enabled: false } } to the server when toggled off', async () => {
    render(<Settings />);
    const toggle = await screen.findByLabelText('Nudges');
    fireEvent(toggle, 'valueChange', false);
    await waitFor(() =>
      expect(mockUpdateSettings).toHaveBeenCalledWith({
        nudges: { enabled: false },
      })
    );
  });

  it('does not echo server state back as an update on load', async () => {
    mockNotificationSettingsData = { nudges: { enabled: true } };

    render(<Settings />);
    await screen.findByLabelText('Nudges');

    // Give the sync effects a chance to run; nothing should be sent because
    // the server value matches the store's default and the user never
    // touched the toggle.
    await waitFor(() => {
      expect(
        mockUpdateSettings.mock.calls.some(
          ([payload]) => payload && 'nudges' in payload
        )
      ).toBe(false);
    });
  });
});
