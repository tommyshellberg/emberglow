/**
 * Login form constants
 */

/**
 * Contact email for support
 */
export const CONTACT_EMAIL = 'hello@emberglowapp.com';

/**
 * Terms of use and privacy policy URL
 */
export const TERMS_URL = 'https://emberglowapp.com/terms';

/**
 * Logo dimensions (width and height)
 */
export const LOGO_SIZE = 64;

/**
 * Number of send attempts before showing support contact info
 * After this many attempts, show the support email link
 */
export const SEND_ATTEMPTS_THRESHOLD = 2;

/**
 * Request timeout in milliseconds for magic link API calls
 */
export const REQUEST_TIMEOUT_MS = 10000;

/**
 * Brand name displayed in the app
 */
export const BRAND_NAME = 'emberglow';

/**
 * Shared with `login-form.tsx`'s social sign-in error mapping — a 409 from
 * either auth path (magic link or social) means the same thing to the user,
 * so both surfaces show the identical copy rather than each owning a
 * hand-typed duplicate that could drift.
 */
export const EMAIL_IN_USE_ERROR_MESSAGE =
  'This email address is already associated with an account. Please use a different email address.';

/** Ditto for the catch-all failure copy. */
export const GENERIC_SEND_ERROR_MESSAGE =
  'Login link failed to send. Please try again.';

/**
 * Shown when the request never reached the server — an axios error with no
 * response, and the aborted-conversion case (`ProvisionalRefreshUnavailable`),
 * which is the same situation one hop earlier. Both are retryable and neither
 * is the user's fault, so they say the same thing rather than each carrying a
 * hand-typed near-duplicate.
 */
export const NETWORK_ERROR_MESSAGE =
  'Network error. Please check your connection and try again.';
