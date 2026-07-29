import { posthogClient } from '@/lib/posthog';
import { fireEvent, render, screen, waitFor } from '@/lib/test-utils';
import { useCharacterStore } from '@/store/character-store';
import { useSettingsStore } from '@/store/settings-store';

import Settings from './settings';

// The guest Start Over flow delegates the wipe to lib/auth. The module is
// also consumed by providers in the render tree (websocket provider reads
// useAuth), so the mock must keep those exports alive.
jest.mock('@/lib/auth', () => ({
  wipeGuestSession: jest.fn(),
  endProvisionalSession: jest.fn(),
  signIn: jest.fn(),
  signOut: jest.fn(),
  hydrateAuth: jest.fn(),
  useAuth: jest.fn((selector: any) =>
    selector({ status: 'signIn', token: null })
  ),
}));

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
// like production: the row re-renders when the store changes. `nudges` in
// particular must re-render on change so tests can observe the resulting
// server-sync effect.
jest.mock('@/store/settings-store', () => {
  const { create } = require('zustand');
  const useSettingsStore = create((set: any) => ({
    dailyReminder: { enabled: false, time: null },
    streakWarning: { enabled: false, time: null },
    nudges: { enabled: true },
    setDailyReminder: (reminder: any) => set({ dailyReminder: reminder }),
    setStreakWarning: (streakWarning: any) => set({ streakWarning }),
    setNudges: (nudges: any) => set({ nudges }),
    narratorVoice: null,
    setNarratorVoice: (voice: any) => set({ narratorVoice: voice }),
  }));
  return { useSettingsStore };
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

  it('shows the account email and Logout for a full account', async () => {
    const { getByText } = render(<Settings />);
    await waitFor(() => {
      expect(getByText('test@example.com')).toBeTruthy();
      expect(getByText('Logout')).toBeTruthy();
    });
  });

  describe('provisional (guest) user', () => {
    beforeEach(() => {
      // A guest's /users/me succeeds since the provisional-token fallback, so
      // the user store holds their internal placeholder identity.
      const { getItem } = require('@/lib/storage');
      (getItem as jest.Mock).mockImplementation((key: string) =>
        key === 'provisionalAccessToken' ? 'prov-access-token' : null
      );
      const { useUserStore } = require('@/store/user-store');
      (useUserStore as jest.Mock).mockImplementation((selector: any) =>
        selector({
          user: { email: 'e284edc7-uuid@unquestapp.com' },
          setUser: jest.fn(),
        })
      );
    });

    afterEach(() => {
      const { getItem } = require('@/lib/storage');
      (getItem as jest.Mock).mockReset();
    });

    it('shows guest copy instead of the internal placeholder email', async () => {
      const { getByText, queryByText } = render(<Settings />);
      await waitFor(() => {
        expect(getByText('Account')).toBeTruthy();
      });
      // The uuid@unquestapp.com address is an implementation detail, not an
      // identity the user ever chose or could log in with.
      expect(queryByText(/unquestapp\.com/)).toBeNull();
      expect(getByText(/Guest/)).toBeTruthy();
    });

    it('offers Start Over instead of Logout to a guest', async () => {
      const { getByText, queryByText } = render(<Settings />);
      await waitFor(() => {
        expect(getByText('Account')).toBeTruthy();
      });
      // A guest has no credentials to log back in with — and the session
      // resurrects on the next cold start anyway (hydrate re-reads the
      // provisional keys). Offering Logout is a lie both ways. But offering
      // NOTHING leaves them silently stuck (Tommy, 2026-07-29): the honest
      // exit is starting over.
      expect(queryByText('Logout')).toBeNull();
      expect(getByText('Start Over')).toBeTruthy();
    });

    it('confirms before wiping when a guest chooses Start Over', async () => {
      const { Alert } = require('react-native');
      const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
      const { wipeGuestSession } = require('@/lib/auth');

      const { getByText } = render(<Settings />);
      await waitFor(() => {
        expect(getByText('Start Over')).toBeTruthy();
      });

      fireEvent.press(getByText('Start Over'));

      // Destructive, so never on a single tap.
      expect(wipeGuestSession).not.toHaveBeenCalled();
      const [, , buttons] = alertSpy.mock.calls[0];
      const confirm = (buttons as any[]).find(
        (b: any) => b.style === 'destructive'
      );
      confirm.onPress();

      expect(wipeGuestSession).toHaveBeenCalled();
      alertSpy.mockRestore();
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

describe('Nudges toggle', () => {
  beforeEach(() => {
    global.__DEV__ = false;
    useSettingsStore.setState({ nudges: { enabled: true } });
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
    fireEvent.press(toggle);
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
