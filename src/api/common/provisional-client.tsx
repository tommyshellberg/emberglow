import axios from 'axios';

import { getItem } from '@/lib/storage';

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
  (error) => {
    return Promise.reject(error);
  }
);

export { provisionalApiClient };
