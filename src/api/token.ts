import { getItem, removeItem, setItem } from '@/lib/auth/secure-token-storage';
import { getToken, removeToken, setToken } from '@/lib/auth/utils';

// The keys actually used to persist expiry timestamps (see storeTokens /
// isTokenExpired / removeTokens below).
const ACCESS_TOKEN_EXPIRY_STORAGE_KEY = 'access_token_expiry';
const REFRESH_TOKEN_EXPIRY_STORAGE_KEY = 'refresh_token_expiry';

// Keys for the provisional (pre-signup) session's access/refresh tokens.
// Read and written across many call sites (websocket providers, quest
// services, navigation-state-resolver, etc.) — those all go through the
// helpers below rather than touching storage directly.
export const PROVISIONAL_ACCESS_TOKEN_KEY = 'provisionalAccessToken';
export const PROVISIONAL_REFRESH_TOKEN_KEY = 'provisionalRefreshToken';

// Types: now tokens are nested as returned by the server.
export interface AuthTokens {
  access: {
    token: string;
    expires: string;
  };
  refresh: {
    token: string;
    expires: string;
  };
}

/**
 * Store authentication tokens securely
 */
export const storeTokens = (tokens: AuthTokens) => {
  try {
    // Convert the structure to match what our utils expect
    setToken({
      access: tokens.access.token,
      refresh: tokens.refresh.token,
    });

    // Store token expiry alongside the token pair in secure storage.
    setItem(ACCESS_TOKEN_EXPIRY_STORAGE_KEY, tokens.access.expires);
    setItem(REFRESH_TOKEN_EXPIRY_STORAGE_KEY, tokens.refresh.expires);
  } catch (error) {
    console.error('Error storing tokens:', error);
    throw error;
  }
};

/**
 * Get the stored access token
 */
export const getAccessToken = () => {
  try {
    const tokens = getToken();
    return tokens?.access ?? null;
  } catch (error) {
    console.error('Error getting access token:', error);
    return null;
  }
};

/**
 * Get the stored refresh token
 */
export const getRefreshToken = () => {
  try {
    const tokens = getToken();
    return tokens?.refresh ?? null;
  } catch (error) {
    console.error('Error getting refresh token:', error);
    return null;
  }
};

/**
 * Check if the access token is expired
 */
export const isTokenExpired = () => {
  try {
    const expiryString = getItem<string>(ACCESS_TOKEN_EXPIRY_STORAGE_KEY);
    if (!expiryString) return true;

    const expiryDate = new Date(expiryString);
    // Add a small buffer (e.g., 10 seconds) to account for network latency
    const now = new Date(Date.now() + 10000);
    return now >= expiryDate;
  } catch (error) {
    console.error('Error checking token expiry:', error);
    return true; // Assume expired on error
  }
};

/**
 * Remove all tokens from secure storage
 */
export const removeTokens = () => {
  try {
    removeToken();
    removeItem(ACCESS_TOKEN_EXPIRY_STORAGE_KEY);
    removeItem(REFRESH_TOKEN_EXPIRY_STORAGE_KEY);
    return true;
  } catch (error) {
    console.error('Error removing tokens:', error);
    return false;
  }
};

/**
 * Provisional users (playing before signup) get their own access/refresh
 * token pair, separate from the full-auth `token` key managed above. These
 * are read at high frequency (every request's provisional-vs-full-auth
 * check), so they go through the same synchronous SecureStore-backed
 * storage as the main tokens.
 */
export const getProvisionalAccessToken = () =>
  getItem<string>(PROVISIONAL_ACCESS_TOKEN_KEY);
export const setProvisionalAccessToken = (value: string) =>
  setItem<string>(PROVISIONAL_ACCESS_TOKEN_KEY, value);
export const removeProvisionalAccessToken = () =>
  removeItem(PROVISIONAL_ACCESS_TOKEN_KEY);

export const getProvisionalRefreshToken = () =>
  getItem<string>(PROVISIONAL_REFRESH_TOKEN_KEY);
export const setProvisionalRefreshToken = (value: string) =>
  setItem<string>(PROVISIONAL_REFRESH_TOKEN_KEY, value);
export const removeProvisionalRefreshToken = () =>
  removeItem(PROVISIONAL_REFRESH_TOKEN_KEY);
