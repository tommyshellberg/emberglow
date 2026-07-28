import { posthogClient } from '@/lib/posthog';
import { fireEvent, render, waitFor } from '@/lib/test-utils';
import { useCharacterStore } from '@/store/character-store';
import { useSettingsStore } from '@/store/settings-store';

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

// Mock the stores used in Settings. Backed by a real (non-persisted)
// zustand store rather than a static jest.fn() so that setState/getState
// and selector-based subscriptions (used by the narrator voice row) behave
// like production: the row re-renders when the store changes.
jest.mock('@/store/settings-store', () => {
  const { create } = require('zustand');
  const useSettingsStore = create((set: any) => ({
    dailyReminder: { enabled: false, time: null },
    streakWarning: { enabled: false, time: null },
    setDailyReminder: (reminder: any) => set({ dailyReminder: reminder }),
    setStreakWarning: (streakWarning: any) => set({ streakWarning }),
    narratorVoice: null,
    setNarratorVoice: (voice: any) => set({ narratorVoice: voice }),
  }));
  return { useSettingsStore };
});

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

  it('toggles narrator voice and persists the explicit choice', async () => {
    useSettingsStore.setState({ narratorVoice: null });
    // Bard's default voice is female (see DEFAULT_VOICE_BY_CHARACTER in
    // audio-utils.ts). Asserting "Female" here only passes if the row
    // genuinely derives its label from the character default — a row that
    // hardcodes "Male" (a plausible copy-paste bug) would fail this
    // assertion instead of coincidentally matching it.
    useCharacterStore.setState({
      character: { type: 'bard', name: 'Test', level: 1, currentXP: 0 },
    });

    const { getByText, findByText } = render(<Settings />);

    const row = await findByText('Narrator voice');
    expect(getByText('Female')).toBeOnTheScreen();

    fireEvent.press(row);

    expect(useSettingsStore.getState().narratorVoice).toBe('male');
    expect(await findByText('Male')).toBeOnTheScreen();
    expect(posthogClient.capture).toHaveBeenCalledWith(
      'settings_narrator_voice_changed',
      { voice: 'male' }
    );

    // Second press must flip back to female. Combined with the first
    // press (which expected 'male'), this catches a toggle hardcoded to
    // always set either value: an "always female" bug is already caught by
    // the first press above; an "always male" bug would coincidentally
    // match the first press's expectation but fails here.
    fireEvent.press(getByText('Narrator voice'));

    expect(useSettingsStore.getState().narratorVoice).toBe('female');
    expect(await findByText('Female')).toBeOnTheScreen();
  });
});
