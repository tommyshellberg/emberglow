import { Env } from '@env';
import PostHog from 'posthog-react-native';

/**
 * Module-level PostHog client, shared between React (via the `client` prop on
 * PostHogProviderWrapper) and non-React code (services, stores, API layer).
 * Non-React code must import this instead of calling usePostHog.
 *
 * distinct_id convention: identify() is always called with the server-side
 * user id (Mongo id) — the same id passed to OneSignal.login and
 * revenueCatService.loginUser — so server-emitted PostHog events stitch to
 * the same person.
 */
export const posthogClient = new PostHog(Env.POSTHOG_API_KEY, {
  host: 'https://us.i.posthog.com',
  // Application Installed / Opened / Backgrounded — the baseline events for
  // retention insights. Manual $screen tracking stays in
  // PostHogNavigationTracker; touch/screen autocapture stays off.
  captureAppLifecycleEvents: true,
  // Disable PostHog in development to prevent annoying error messages
  disabled: __DEV__,
});
