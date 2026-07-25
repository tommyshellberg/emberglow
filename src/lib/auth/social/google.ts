import { Env } from '@env';
import {
  GoogleSignin,
  statusCodes,
} from '@react-native-google-signin/google-signin';

import { SocialSignInCancelled } from './errors';

let configured = false;
function ensureConfigured() {
  if (configured) return;
  GoogleSignin.configure({
    webClientId: Env.GOOGLE_WEB_CLIENT_ID,
    iosClientId: Env.GOOGLE_IOS_CLIENT_ID,
  });
  configured = true;
}

/**
 * Runs the native Google Sign-In flow and returns the ID token the server
 * needs to verify the user.
 *
 * Installed version: `@react-native-google-signin/google-signin@16.1.2`.
 * In this version `GoogleSignin.signIn()` (the "Original Google Sign In"
 * API) represents user cancellation as a RESOLVED
 * `{ type: 'cancelled', data: null }` response, not a thrown error — the
 * package's `translateCancellationError` converts the native
 * `SIGN_IN_CANCELLED` error code into that resolved value internally before
 * `signIn()`'s promise ever settles. The success shape is always
 * `{ type: 'success', data: { idToken, ... } }`; there is no top-level
 * `result.idToken` in this version, so no shape-fallback is needed.
 *
 * The `catch` block below is belt-and-suspenders: `statusCodes.SIGN_IN_CANCELLED`
 * is still exported and documented, so this guards against a future
 * version (or an edge case in `addScopes`/`signInSilently` sharing the
 * error path) reverting to a thrown code instead of the resolved shape.
 */
export async function getGoogleCredential() {
  ensureConfigured();
  await GoogleSignin.hasPlayServices();

  let result;
  try {
    result = await GoogleSignin.signIn();
  } catch (e: any) {
    if (e?.code === statusCodes.SIGN_IN_CANCELLED) {
      throw new SocialSignInCancelled();
    }
    throw e;
  }

  if (result.type === 'cancelled') {
    throw new SocialSignInCancelled();
  }

  const idToken = result.data.idToken;
  if (!idToken) {
    throw new Error('Google returned no ID token');
  }

  return { provider: 'google' as const, idToken };
}
