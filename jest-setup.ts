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
    { countryCode: 'US', languageTag: 'en-US', languageCode: 'en', isRTL: false },
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

jest.mock('react-native-bg-actions', () => ({
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
