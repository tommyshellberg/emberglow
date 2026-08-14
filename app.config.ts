/* eslint-disable max-lines-per-function */
import 'dotenv/config';

import type { ConfigContext, ExpoConfig } from '@expo/config';

import { ClientEnv, Env } from './env';
import colors from './src/components/ui/colors';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: Env.NAME,
  description: `${Env.NAME} Mobile App`,
  owner: Env.EXPO_ACCOUNT_OWNER,
  scheme: Env.SCHEME,
  slug: 'unquest-app',
  version: Env.VERSION.toString(),
  orientation: 'portrait',
  icon: './assets/images/icon.png',
  userInterfaceStyle: 'automatic',
  backgroundColor: colors.black,
  runtimeVersion: Env.VERSION.toString(),
  updates: {
    fallbackToCacheTimeout: 0,
    url: 'https://u.expo.dev/30766cfb-793b-416b-ac27-d37f2e0dff9a',
    checkAutomatically: 'ON_LOAD',
  },
  assetBundlePatterns: ['**/*'],
  ios: {
    supportsTablet: false,
    bundleIdentifier: Env.BUNDLE_ID,
    icon: './assets/images/app-icon.png',
    usesAppleSignIn: true,
    // Parity with the hand-added entitlement in Emberglow.entitlements —
    // prebuild regenerates that file from here (commit f4c6106 lost the
    // hand-added Google URL scheme exactly this way).
    // www, not apex: Vercel redirects apex → www, and both OS verifiers
    // require the association file directly on the declared host (a redirect
    // fails verification), so apex can never verify. Hand-shared apex links
    // still work via browser → redirect → fallback attribution.
    associatedDomains: ['applinks:www.emberglowapp.com'],
    config: {
      usesNonExemptEncryption: false,
    },
    infoPlist: {
      BGTaskSchedulerPermittedIdentifiers: ['$(PRODUCT_BUNDLE_IDENTIFIER)'],
      // Allow HTTP connections in staging for local dev server
      ...(Env.APP_ENV !== 'production' && {
        NSAppTransportSecurity: {
          NSAllowsArbitraryLoads: true,
        },
      }),
    },
    // Build number managed by EAS autoIncrement in eas.json
  },
  experiments: {
    typedRoutes: true,
  },
  android: {
    adaptiveIcon: {
      foregroundImage: './assets/images/icon.png',
      backgroundColor: '#051c25',
    },
    package: Env.PACKAGE,
    // Parity with the hand-added invite-links intent filter in
    // AndroidManifest.xml — same prebuild-wipe risk as associatedDomains.
    intentFilters: [
      {
        action: 'VIEW',
        autoVerify: true,
        data: [
          {
            scheme: 'https',
            host: 'www.emberglowapp.com',
            pathPrefix: '/i/',
          },
        ],
        category: ['BROWSABLE', 'DEFAULT'],
      },
    ],
    permissions: [
      'android.permission.FOREGROUND_SERVICE',
      'android.permission.FOREGROUND_SERVICE_SPECIAL_USE',
      'android.permission.WAKE_LOCK',
      'com.android.vending.BILLING',
    ],
    // versionCode managed by EAS remote version source (eas build:version:set)
    // Allow HTTP connections in staging for local dev server
    ...(Env.APP_ENV !== 'production' && {
      usesCleartextTraffic: true,
    }),
  },
  // Bare workflow: ios/ and android/ are committed and prebuild never runs,
  // so this plugins list has zero effect on the actual build — it's kept only
  // for parity if we ever return to Continuous Native Generation (CNG).
  // Do not chase `expo install --fix` advisories asking to add plugin entries
  // here (e.g. @react-native-community/datetimepicker, @sentry/react-native,
  // expo-audio) — they only matter under CNG.
  plugins: [
    [
      'expo-splash-screen',
      {
        image: './assets/images/icon.png',
        imageWidth: 200,
        resizeMode: 'contain',
        backgroundColor: '#051c25',
        autoHide: false,
      },
    ],
    ['expo-secure-store'],
    'expo-apple-authentication',
    [
      'expo-font',
      {
        fonts: ['./assets/fonts/Erstoria-Regular.ttf'],
      },
    ],
    [
      'expo-notifications',
      {
        color: '#051c25',
        enableBackgroundRemoteNotifications: true,
      },
    ],
    'expo-router',
    ['react-native-edge-to-edge'],
    [
      '@react-native-google-signin/google-signin',
      {
        // Reversed GOOGLE_IOS_CLIENT_ID; prebuild regenerates the Info.plist
        // URL scheme from this, so the hand-added entry no longer gets dropped.
        iosUrlScheme:
          'com.googleusercontent.apps.294858595704-9mp664qph89g16istbfoklhku760lnj5',
      },
    ],
    [
      '@sentry/react-native/expo',
      {
        url: 'https://sentry.io/',
        project: 'react-native',
        organization: 'vaedros-software-llc',
      },
    ],
    [
      'onesignal-expo-plugin',
      {
        mode: Env.APP_ENV === 'development' ? 'development' : 'production',
      },
    ],
  ],
  extra: {
    ...ClientEnv,
    eas: {
      projectId: Env.EAS_PROJECT_ID,
    },
    maestroAccessToken: process.env.MAESTRO_ACCESS_TOKEN,
    maestroRefreshToken: process.env.MAESTRO_REFRESH_TOKEN,
  },
});
