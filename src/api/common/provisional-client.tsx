import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios';

import { endProvisionalSession } from '@/lib/auth';
import { getItem } from '@/lib/storage';

import { refreshProvisionalTokens } from '../auth';
import { getApiUrl } from './get-api-url';

// Create a separate axios instance for provisional users
const provisionalApiClient = axios.create({
  baseURL: getApiUrl(),
  headers: {
    'Content-Type': 'application/json',
  },
  // Same rationale as apiClient: axios defaults to no timeout, and a request
  // issued while the phone is locked can stay pending forever once the OS
  // drops the socket. 30s clears a Render cold start.
  timeout: 30000,
});

// Simple request interceptor that attaches the provisional token
provisionalApiClient.interceptors.request.use(
  (config) => {
    const provisionalToken = getItem<string>('provisionalAccessToken');

    if (provisionalToken) {
      config.headers.Authorization = `Bearer ${provisionalToken}`;
    }

    // Log invitation-related requests in development only
    if (__DEV__ && config.url?.includes('/invitations/')) {
      console.log('========================================');
      console.log('[Provisional API Client] Invitation Request');
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

// Add response interceptor for logging
provisionalApiClient.interceptors.response.use(
  (response) => {
    // Log invitation-related responses in development only
    if (__DEV__ && response.config.url?.includes('/invitations/')) {
      console.log('========================================');
      console.log('[Provisional API Client] Invitation Response');
      console.log('Status:', response.status);
      console.log('URL:', response.config.url);
      console.log('Response Data:', response.data);
      console.log('Timestamp:', new Date().toISOString());
      console.log('========================================');
    }
    return response;
  },
  async (error: AxiosError) => {
    const originalRequest = error?.config as
      | (InternalAxiosRequestConfig & { _retry?: boolean })
      | undefined;

    // A 401 here means the provisional access token itself was rejected —
    // this client always attaches it, so unlike apiClient there is no
    // "the header was simply missing" case. Refresh once and retry; a dead
    // verdict (the REFRESH token was rejected too) ends the session so the
    // navigation resolver can route to login/signup instead of leaving a
    // working-looking app that 401s forever.
    if (
      error?.response?.status === 401 &&
      originalRequest &&
      !originalRequest._retry
    ) {
      originalRequest._retry = true;

      // Single-flight inside refreshProvisionalTokens: concurrent 401s from
      // both clients share one POST (the server consumes refresh tokens on
      // use, so a second POST would misread a healthy session as dead).
      const result = await refreshProvisionalTokens();

      if (result?.status === 'refreshed') {
        originalRequest.headers.Authorization = `Bearer ${result.tokens.access.token}`;
        return provisionalApiClient(originalRequest);
      }

      if (result?.status === 'dead') {
        endProvisionalSession();
      }
      // 'error' (network flake, 5xx): the session survives; only this
      // request fails.
    }

    return Promise.reject(error);
  }
);

export { provisionalApiClient };
