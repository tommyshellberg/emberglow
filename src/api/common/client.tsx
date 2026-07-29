import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios';

import { signOut } from '@/lib/auth';
import { getToken } from '@/lib/auth/utils';
import { getItem } from '@/lib/storage';

import { refreshAccessToken } from '../auth';
import { getApiUrl } from './get-api-url';

// Create axios instance with base configuration
const apiClient = axios.create({
  baseURL: getApiUrl(),
  headers: {
    'Content-Type': 'application/json',
  },
  // Axios defaults to no timeout. A request issued while the phone is locked
  // can outlive its socket (Doze kills it silently) and stay pending forever —
  // observed 2026-07-16 wedging completeQuest's reward fetch. 30s clears a
  // Render cold start while still guaranteeing every request settles.
  timeout: 30000,
});

// Track if we're currently refreshing the token
let isRefreshing = false;
// Store pending requests using Promises for better handling
let failedQueue: {
  resolve: (token: string) => void;
  reject: (reason?: any) => void;
}[] = [];

// Track refresh attempts and failures
let refreshAttempts = 0;
let lastRefreshAttempt = 0;
const MAX_REFRESH_ATTEMPTS = 3;
const REFRESH_ATTEMPT_WINDOW = 5 * 60 * 1000; // 5 minutes

// Extend the AxiosRequestConfig type to include our custom properties
interface CustomInternalAxiosRequestConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
}

// Process the failed queue
const processQueue = (error: Error | null, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error || !token) {
      prom.reject(error || new Error('Token refresh failed'));
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// A provisional user is one who has played through onboarding but not yet
// claimed an account. Their credentials live under a different storage key and
// are NOT refreshable through /auth/refresh-tokens, so a 401 on their behalf
// means "this call needed a real account", never "the session died" — and
// signing them out discards the only copy of their hero.
//
// Local to this module deliberately: the same expression is spelled out at a
// dozen call sites across services, and unifying those is a wider change than
// this file. What matters here is that all three sign-out paths below agree.
const hasProvisionalCredentials = (): boolean =>
  !!getItem('provisionalAccessToken');

// Check if we should attempt token refresh
const shouldAttemptRefresh = (): boolean => {
  const now = Date.now();

  // Reset counter if outside the time window
  if (now - lastRefreshAttempt > REFRESH_ATTEMPT_WINDOW) {
    refreshAttempts = 0;
  }

  return refreshAttempts < MAX_REFRESH_ATTEMPTS;
};

// Record a refresh attempt
const recordRefreshAttempt = () => {
  refreshAttempts++;
  lastRefreshAttempt = Date.now();
};

// SIMPLIFIED Request Interceptor: Only attach the token
apiClient.interceptors.request.use(
  (config) => {
    const tokenData = getToken();
    // A provisional user has no full-account token, but their provisional JWT
    // authenticates the same server endpoints (a provisional user is a real
    // User server-side). Without this fallback every account-scoped request
    // from a provisional session went out with NO Authorization header at all,
    // 401'd as anonymous, and burned the refresh budget — the "suddenly logged
    // out" 401 storm on Settings/Profile. The full token wins when both exist
    // (brief window mid-conversion, before the provisional keys are cleared).
    const accessToken =
      tokenData?.access ?? getItem<string>('provisionalAccessToken');

    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }

    // Log invitation-related requests in development only
    if (__DEV__ && config.url?.includes('/invitations/')) {
      console.log('========================================');
      console.log('[API Client] Invitation Request');
      console.log('Method:', config.method?.toUpperCase());
      console.log('URL:', config.url);
      console.log('Data:', config.data);
      console.log('Timestamp:', new Date().toISOString());
      console.log('========================================');
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response Interceptor: Handles 401 and token refresh
apiClient.interceptors.response.use(
  (response) => {
    // Log invitation-related responses in development only
    if (__DEV__ && response.config.url?.includes('/invitations/')) {
      console.log('========================================');
      console.log('[API Client] Invitation Response');
      console.log('Status:', response.status);
      console.log('URL:', response.config.url);
      console.log('Response Data:', response.data);
      console.log('Timestamp:', new Date().toISOString());
      console.log('========================================');
    }
    return response;
  },
  async (error: AxiosError) => {
    const originalRequest = error.config as CustomInternalAxiosRequestConfig;

    if (!error.response || !originalRequest) {
      console.error('Axios error without response or config:', error);
      return Promise.reject(error);
    }

    if (error.response.status === 401 && !originalRequest._retry) {
      // Check if we've exceeded refresh attempts
      if (!shouldAttemptRefresh()) {
        console.error(
          `[API Client] Exceeded max refresh attempts (${MAX_REFRESH_ATTEMPTS})`
        );

        // Never escalate for a provisional user. The escalation below ends in a
        // `cancelable: false` alert whose only button calls signOut() (see
        // use-token-refresh-error-handler.ts), which clears the provisional
        // keys and destroys an unclaimed hero — while the provisional token
        // itself is still perfectly valid, often for weeks.
        //
        // Reaching here needs only three failing authenticated calls inside the
        // five-minute window, and a provisional user's calls to account-scoped
        // endpoints 401 every time, so this was reachable on an ordinary cold
        // start. Reject with the underlying 401 and let the caller decide; the
        // two refresh-failure branches further down already behave this way.
        if (hasProvisionalCredentials()) {
          if (__DEV__) {
            console.log(
              '[API Client] Refresh budget exhausted for a provisional user — rejecting without escalating'
            );
          }
          return Promise.reject(error);
        }

        // Create a custom error for the UI to handle
        const exhaustedError = new Error('TOKEN_REFRESH_EXHAUSTED');
        (exhaustedError as any).code = 'TOKEN_REFRESH_EXHAUSTED';
        (exhaustedError as any).attempts = refreshAttempts;

        // Try to handle the error through our global handler
        import('@/lib/hooks/use-token-refresh-error-handler')
          .then(({ handleTokenRefreshExhaustion }) => {
            handleTokenRefreshExhaustion(exhaustedError);
          })
          .catch(console.error);

        // Don't sign out immediately - let the UI decide what to do
        return Promise.reject(exhaustedError);
      }

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((newToken) => {
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
            return apiClient(originalRequest);
          })
          .catch((err) => {
            console.error('Refresh failed while request was queued:', err);
            return Promise.reject(err);
          });
      }

      originalRequest._retry = true;
      isRefreshing = true;
      recordRefreshAttempt();

      try {
        if (__DEV__) {
          console.log(
            `[API Client] Refreshing token (attempt ${refreshAttempts}/${MAX_REFRESH_ATTEMPTS})`
          );
        }
        const newTokens = await refreshAccessToken();

        if (newTokens?.access?.token) {
          originalRequest.headers.Authorization = `Bearer ${newTokens.access.token}`;

          processQueue(null, newTokens.access.token);

          // Reset refresh attempts on success
          refreshAttempts = 0;
          if (__DEV__) {
            console.log(
              '[API Client] Token refresh successful, attempts reset'
            );
          }

          return apiClient(originalRequest);
        } else {
          console.error(
            'Token refresh failed: No new access token string received.'
          );
          const refreshError = new Error(
            'Token refresh failed: No new access token string received.'
          );
          processQueue(refreshError);

          // Check if this is a provisional user before signing out
          if (!hasProvisionalCredentials()) {
            signOut();
          } else if (__DEV__) {
            console.log(
              '[API Client] Not signing out provisional user on token refresh failure'
            );
          }
          return Promise.reject(refreshError);
        }
      } catch (refreshError) {
        console.error('Token refresh failed catastrophically:', refreshError);
        processQueue(refreshError as Error);

        // Check if this is a provisional user before signing out
        if (!hasProvisionalCredentials()) {
          signOut();
        } else if (__DEV__) {
          console.log(
            '[API Client] Not signing out provisional user on catastrophic token refresh failure'
          );
        }
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

// Export for testing purposes
export const __resetRefreshAttempts = () => {
  refreshAttempts = 0;
  lastRefreshAttempt = 0;
};

export { apiClient };
