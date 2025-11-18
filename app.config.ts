/* eslint-disable max-lines-per-function */
import 'dotenv/config';

import type { ConfigContext, ExpoConfig } from '@expo/config';
import type { AppIconBadgeConfig } from 'app-icon-badge/types';

import { ClientEnv, Env } from './env';
import colors from './src/components/ui/colors';

const appIconBadgeConfig: AppIconBadgeConfig = {
  enabled: Env.APP_ENV !== 'production',
  badges: [
    {
      text: Env.APP_ENV,
      type: 'banner',
      color: 'white',
    },
    {
      text: Env.VERSION.toString(),
      type: 'ribbon',
      color: 'white',
    },
  ],
};

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
  newArchEnabled: true,
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
    buildNumber: Env.VERSION.split('.').pop() || '0',
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
    permissions: [
      'android.permission.FOREGROUND_SERVICE',
      'android.permission.FOREGROUND_SERVICE_DATA_SYNC',
      'android.permission.WAKE_LOCK',
      'com.android.vending.BILLING',
    ],
    // use the last digit of semver
    versionCode: parseInt(Env.VERSION.split('.').pop() || '0'),
    // Allow HTTP connections in staging for local dev server
    ...(Env.APP_ENV !== 'production' && {
      usesCleartextTraffic: true,
    }),
  },
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
    ['app-icon-badge', appIconBadgeConfig],
    ['react-native-edge-to-edge'],
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
