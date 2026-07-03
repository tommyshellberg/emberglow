import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { router } from 'expo-router';

import { queryClient } from '@/api/common/api-provider';
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
    const accessToken = tokenData?.access;

    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    } else {
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
          const hasProvisionalToken = !!getItem('provisionalAccessToken');
          if (!hasProvisionalToken) {
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
        const hasProvisionalToken = !!getItem('provisionalAccessToken');
        if (!hasProvisionalToken) {
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

    // Spirit Fading backstop: a stale client that slipped past the local gate
    // gets a 403 SPIRIT_FADED from the server. Refetch user details so the faded
    // state is authoritative, then route home to show the FadingCard. `replace`
    // (not `push`) so concurrent in-flight requests that both 403 don't stack
    // duplicate home entries — home is the final state, not a stack step.
    if (
      error.response?.status === 403 &&
      (error.response?.data as any)?.errorCode === 'SPIRIT_FADED'
    ) {
      queryClient.invalidateQueries({ queryKey: ['user', 'details'] });
      router.replace('/(app)');
      return Promise.reject(error);
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
