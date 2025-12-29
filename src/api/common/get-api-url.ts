/**
 * Platform-aware API URL resolution
 *
 * Returns the correct API base URL depending on the platform and device type:
 * - Android emulator: Uses 10.0.2.2 (special alias for host machine)
 * - iOS simulator: Uses localhost
 * - Real devices: Uses the configured IP address from env
 */

import * as Device from 'expo-device';
import { Platform } from 'react-native';

import { Env } from '@env';

// Extract port and path from the env URL for reuse
const extractPortAndPath = (url: string): { port: string; path: string } => {
  try {
    const urlObj = new URL(url);
    return {
      port: urlObj.port || '3001',
      path: urlObj.pathname,
    };
  } catch {
    // Fallback if URL parsing fails
    return { port: '3001', path: '/v1' };
  }
};

/**
 * Get the appropriate API URL for the current platform/device combination
 */
export const getApiUrl = (): string => {
  // In production, always use the configured URL
  if (Env.APP_ENV === 'production' || Env.APP_ENV === 'staging') {
    return Env.API_URL;
  }

  const { port, path } = extractPortAndPath(Env.API_URL);

  // Development environment - handle different platforms
  if (Platform.OS === 'android' && !Device.isDevice) {
    // Android emulator - use special alias that maps to host's localhost
    return `http://10.0.2.2:${port}${path}`;
  }

  if (Platform.OS === 'ios' && !Device.isDevice) {
    // iOS simulator - can use localhost directly
    return `http://localhost:${port}${path}`;
  }

  // Real device - use the configured URL (should be an IP address reachable on local network)
  // Note: .local hostnames work on iOS but not Android
  return Env.API_URL;
};
