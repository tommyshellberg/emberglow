// Mock react-native-purchases FIRST - before any code that might import it
jest.mock('react-native-purchases', () => ({
  LOG_LEVEL: {
    VERBOSE: 'VERBOSE',
    DEBUG: 'DEBUG',
    INFO: 'INFO',
    WARN: 'WARN',
    ERROR: 'ERROR',
  },
  configure: jest.fn(),
  setLogLevel: jest.fn(),
  logIn: jest.fn().mockResolvedValue({ customerInfo: {} }),
  logOut: jest.fn().mockResolvedValue({ customerInfo: {} }),
  getCustomerInfo: jest.fn().mockResolvedValue({}),
  syncPurchases: jest.fn().mockResolvedValue({ customerInfo: {} }),
  isAnonymous: jest.fn().mockResolvedValue(true),
  purchasePackage: jest.fn().mockResolvedValue({ customerInfo: {} }),
  restorePurchases: jest.fn().mockResolvedValue({ customerInfo: {} }),
  getOfferings: jest.fn().mockResolvedValue({ all: {} }),
  checkTrialOrIntroDiscountEligibility: jest.fn().mockResolvedValue({}),
}));

jest.mock('react-native-purchases-ui', () => ({
  presentPaywallIfNeeded: jest.fn().mockResolvedValue({ result: 'CANCELLED' }),
  presentPaywall: jest.fn().mockResolvedValue({ result: 'CANCELLED' }),
}));

// Mock react-native-localize for timezone detection
jest.mock('react-native-localize', () => ({
  getTimeZone: jest.fn(() => 'America/New_York'),
  getLocales: jest.fn(() => [
    {
      countryCode: 'US',
      languageTag: 'en-US',
      languageCode: 'en',
      isRTL: false,
    },
  ]),
  getNumberFormatSettings: jest.fn(() => ({
    decimalSeparator: '.',
    groupingSeparator: ',',
  })),
  getCalendar: jest.fn(() => 'gregorian'),
  getCountry: jest.fn(() => 'US'),
  getCurrencies: jest.fn(() => ['USD']),
  getTemperatureUnit: jest.fn(() => 'fahrenheit'),
  uses24HourClock: jest.fn(() => false),
  usesMetricSystem: jest.fn(() => false),
  usesAutoDateAndTime: jest.fn(() => true),
  usesAutoTimeZone: jest.fn(() => true),
  findBestLanguageTag: jest.fn(() => ({
    languageTag: 'en-US',
    isRTL: false,
  })),
}));

// react-hook form setup for testing
// @ts-ignore
global.window = {};
// @ts-ignore
global.window = global;

// Mock OneSignal for LiveActivities
(global as any).OneSignal = {
  LiveActivities: {
    startDefault: jest.fn(),
    exit: jest.fn(),
    setupDefault: jest.fn(),
    updateDefault: jest.fn(),
  },
};

// Mock React Native components
jest.mock('react-native', () => {
  const RN = jest.requireActual('react-native');
  RN.StatusBar = {
    setBarStyle: jest.fn(),
    setBackgroundColor: jest.fn(),
    setTranslucent: jest.fn(),
    setHidden: jest.fn(),
  };
  return RN;
});

// Mock reanimated
jest.mock('react-native-reanimated', () => {
  const Reanimated = require('react-native-reanimated/mock');
  // Return all animations immediately
  Reanimated.default.reduceMotion = true;
  return {
    ...Reanimated,
    default: {
      ...Reanimated.default,
      call: jest.fn(),
    },
    useSharedValue: (val: any) => ({ value: val }),
    useAnimatedStyle: () => ({}),
    withTiming: (val: any) => val,
    withDelay: (_: any, val: any) => val,
    withSpring: (val: any) => val,
    withSequence: (...args: any[]) => args[args.length - 1],
    ReducedMotionConfig: jest.fn(({ children }: any) => children),
    ReduceMotion: {
      Never: 'never',
      Always: 'always',
      System: 'system',
    },
  };
});

// Mock expo-notifications to avoid warnings and errors
jest.mock('expo-notifications', () => ({
  getPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted' }),
  requestPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted' }),
  setNotificationHandler: jest.fn(),
  addNotificationReceivedListener: jest.fn(),
  addNotificationResponseReceivedListener: jest.fn(),
  removeNotificationSubscription: jest.fn(),
  scheduleNotificationAsync: jest.fn(),
  getExpoPushTokenAsync: jest.fn(),
  setNotificationChannelAsync: jest.fn(),
  cancelAllScheduledNotificationsAsync: jest.fn(),
  dismissAllNotificationsAsync: jest.fn(),
  getBadgeCountAsync: jest.fn(),
  setBadgeCountAsync: jest.fn(),
  getDevicePushTokenAsync: jest.fn(),
  getLastNotificationResponseAsync: jest.fn(),
  LiveActivities: {
    setupDefault: jest.fn(),
    endDefault: jest.fn(),
    startDefault: jest.fn(),
    updateDefault: jest.fn(),
  },
}));

// Mock expo-file-system with the SDK 54 File/Directory/Paths class API.
// jest-expo's bundled default mock (jest-expo/src/preset/setup.js) still
// targets the pre-54 legacy function API and doesn't export `Paths`, so any
// module-scope `new Directory(Paths.cache, ...)` (e.g. the audio-cache
// singleton, constructed at import time) crashes under the stock mock with
// "Cannot read properties of undefined (reading 'cache')". Tests that need
// to control File/Directory behavior in detail provide their own more
// specific `jest.mock('expo-file-system', ...)` (see
// audio-cache.service.test.ts), which overrides this default.
jest.mock('expo-file-system', () => {
  function uriOf(part: unknown): string {
    return typeof part === 'string' ? part : (part as { uri: string }).uri;
  }
  function withTrailingSlash(uri: string): string {
    return uri.endsWith('/') ? uri : `${uri}/`;
  }
  function joinUris(parts: unknown[]): string {
    return parts.reduce((acc: string, part) => {
      const next = uriOf(part);
      return acc ? `${withTrailingSlash(acc)}${next}` : next;
    }, '');
  }

  class MockDirectory {
    uri: string;
    constructor(...uris: unknown[]) {
      this.uri = withTrailingSlash(joinUris(uris));
    }
    create() {}
    delete() {}
    list() {
      return [];
    }
    get exists() {
      return false;
    }
  }

  class MockFile {
    uri: string;
    name: string;
    constructor(...uris: unknown[]) {
      this.uri = joinUris(uris);
      this.name = this.uri.split('/').filter(Boolean).pop() ?? '';
    }
    delete() {}
    get exists() {
      return false;
    }
    get modificationTime() {
      return null;
    }
    static downloadFileAsync(_url: string, destination: MockFile) {
      return Promise.resolve(destination);
    }
  }

  return {
    File: MockFile,
    Directory: MockDirectory,
    Paths: { cache: new MockDirectory('file:///mock-cache/') },
  };
});

jest.mock('react-native-background-actions', () => ({
  start: jest.fn().mockResolvedValue(undefined),
  stop: jest.fn().mockResolvedValue(undefined),
  isRunning: jest.fn().mockReturnValue(false),
  updateNotification: jest.fn().mockResolvedValue(undefined),
}));

// Mock API URL for testing
process.env.API_URL = 'http://test-api.example.com';

// react-hook form setup
(global as any).window = { ...global };

// Mock OneSignal
jest.mock('react-native-onesignal', () => ({
  OneSignal: {
    initialize: jest.fn(),
    Debug: {
      setLogLevel: jest.fn(),
    },
    LiveActivities: {
      setupDefault: jest.fn(),
      startDefault: jest.fn(),
      updateDefault: jest.fn(),
      endDefault: jest.fn(),
      exit: jest.fn(),
    },
  },
  LogLevel: {
    Verbose: 'VERBOSE',
  },
}));

// Mock @dev-plugins/react-query
jest.mock('@dev-plugins/react-query', () => ({
  useReactQueryDevTools: jest.fn(),
}));

jest.mock('posthog-react-native', () => ({
  usePostHog: () => ({
    capture: jest.fn(),
  }),
  PostHogProvider: ({ children }: { children: React.ReactNode }) => children,
  default: jest.fn().mockImplementation(() => ({
    capture: jest.fn(),
    identify: jest.fn(),
    reset: jest.fn(),
  })),
}));

// Shared module-level client (src/lib/posthog.ts) — mocked globally so
// services and stores that import it can run under test; suites assert on
// these fns directly.
jest.mock('@/lib/posthog', () => ({
  posthogClient: {
    capture: jest.fn(),
    identify: jest.fn(),
    reset: jest.fn(),
  },
}));

// Mock BlurView from expo-blur
jest.mock('expo-blur', () => ({
  BlurView: function MockBlurView(props: any) {
    return props.children;
  },
}));

// Mock @gorhom/bottom-sheet
jest.mock('@gorhom/bottom-sheet', () => {
  const React = jest.requireActual('react');
  const RN = jest.requireActual('react-native');

  return {
    BottomSheetModal: jest.fn(({ children }) => children),
    BottomSheetModalProvider: jest.fn(({ children }) => children),
    BottomSheetBackdrop: jest.fn(() => null),
    BottomSheetScrollView: jest.fn(({ children }) => children),
    BottomSheetTextInput: jest.fn((props) =>
      React.createElement(RN.TextInput, props)
    ),
    BottomSheetFlatList: jest.fn((props) =>
      React.createElement(RN.FlatList, props)
    ),
    createBottomSheetScrollableComponent: jest.fn(() =>
      jest.fn(({ children }) => children)
    ),
    SCROLLABLE_TYPE: {
      FLATLIST: 'FlatList',
      SCROLLVIEW: 'ScrollView',
      SECTIONLIST: 'SectionList',
      VIRTUALIZED_LIST: 'VirtualizedList',
    },
  };
});

// Mock react-native-safe-area-context
jest.mock('react-native-safe-area-context', () => {
  const inset = { top: 0, right: 0, bottom: 0, left: 0 };
  return {
    SafeAreaProvider: jest.fn(({ children }) => children),
    SafeAreaConsumer: jest.fn(({ children }) => children(inset)),
    SafeAreaView: jest.fn(({ children }) => children),
    useSafeAreaInsets: jest.fn(() => inset),
  };
});

// Mock @shopify/flash-list
jest.mock('@shopify/flash-list', () => {
  const React = jest.requireActual('react');
  const RN = jest.requireActual('react-native');

  return {
    FlashList: jest.fn((props) => React.createElement(RN.FlatList, props)),
  };
});

// Mock react-native-keyboard-controller
jest.mock('react-native-keyboard-controller', () => {
  const React = jest.requireActual('react');
  const RN = jest.requireActual('react-native');

  return {
    KeyboardAwareScrollView: jest.fn((props) =>
      React.createElement(RN.ScrollView, props)
    ),
    KeyboardAvoidingView: jest.fn((props) =>
      React.createElement(RN.View, props)
    ),
    KeyboardProvider: jest.fn(({ children }) => children),
    useKeyboardController: jest.fn(() => ({
      setEnabled: jest.fn(),
      setInputMode: jest.fn(),
    })),
  };
});

// Mock react-native-edge-to-edge to prevent timers from running after teardown
jest.mock('react-native-edge-to-edge', () => ({
  SystemBars: jest.fn(() => null),
  setStatusBarStyle: jest.fn(),
  setNavigationBarColor: jest.fn(),
  setNavigationBarStyle: jest.fn(),
  setSystemUIVisibility: jest.fn(),
}));

// Note: Removed invasive global mocks that were breaking other tests
// Test-specific mocks should be added in individual test files as needed

// Mock expo-apple-authentication for social sign-in
jest.mock('expo-apple-authentication', () => {
  const React = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');

  return {
    isAvailableAsync: jest.fn().mockResolvedValue(true),
    signInAsync: jest.fn(),
    AppleAuthenticationScope: { EMAIL: 1 },
    // Real component renders Apple's own native button and only accepts
    // `onPress` (plus style/layout props) — not a generic Pressable. This
    // stub forwards `onPress`, `testID`, `style`, and `buttonType` onto a
    // real RN `View` (a host component) so tests can find, press, and
    // inspect it, instead of the previous `mockReturnValue(null)`, which
    // made the button untestable.
    //
    // `fireEvent.press` walks up the element tree — including composite
    // elements — so it finds the `onPress` passed to this component
    // regardless of what the stub renders. The host type only matters for
    // prop visibility: `TouchableOpacity` spreads just its own known props,
    // dropping `buttonType` before it reaches the node a test can query;
    // `View` doesn't filter, so `buttonType` survives. `onPress` is still
    // forwarded here for shape fidelity with the real component's accepted
    // props, not because press needs it.
    AppleAuthenticationButton: jest.fn(
      ({ onPress, testID, style, buttonType }) =>
        React.createElement(View, { onPress, testID, style, buttonType })
    ),
    AppleAuthenticationButtonType: { SIGN_IN: 0, CONTINUE: 1 },
    AppleAuthenticationButtonStyle: { WHITE: 1 },
  };
});

// Mock expo-crypto for social sign-in nonce hashing
jest.mock('expo-crypto', () => ({
  digestStringAsync: jest.fn().mockResolvedValue('hashed-nonce'),
  randomUUID: jest.fn().mockReturnValue('raw-nonce'),
  CryptoDigestAlgorithm: { SHA256: 'SHA-256' },
}));

// Mock @react-native-google-signin/google-signin for social sign-in
jest.mock('@react-native-google-signin/google-signin', () => ({
  GoogleSignin: {
    configure: jest.fn(),
    hasPlayServices: jest.fn().mockResolvedValue(true),
    signOut: jest.fn().mockResolvedValue(undefined),
    signIn: jest.fn(),
  },
  statusCodes: { SIGN_IN_CANCELLED: 'SIGN_IN_CANCELLED' },
}));
