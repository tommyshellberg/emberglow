import axios from 'axios';
import { OneSignal } from 'react-native-onesignal';

import { endProvisionalSession, signIn } from '@/lib/auth';
import {
  ProvisionalRefreshUnavailable,
  ProvisionalSessionExpired,
} from '@/lib/auth/provisional-session';
import type {
  ExistingAccountSummary,
  SocialSignInOutcome,
} from '@/lib/auth/social';
import {
  ExistingAccountConfirmationRequired,
  NoAccountForIdentity,
} from '@/lib/auth/social';
import { posthogClient } from '@/lib/posthog';
import { getUserDetails } from '@/lib/services/user';
import { getItem, removeItem, setItem } from '@/lib/storage';
import { useCharacterStore } from '@/store/character-store';
import { useUserStore } from '@/store/user-store';

import { getApiUrl } from './common/get-api-url';
import * as tokenService from './token';

// Create a separate axios instance for auth requests to avoid circular dependencies
export const authClient = axios.create({
  baseURL: getApiUrl(),
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

// Types
export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

export interface RegisterResponse {
  user: User;
  tokens: tokenService.AuthTokens;
}

/**
 * The access token to carry as a conversion request's Bearer header, or null
 * when there is no provisional session at all.
 *
 * Why this exists: both conversion endpoints are `auth.optional` on the
 * server, which SWALLOWS an expired access token and continues with no
 * `req.user` — no 401, nothing to react to. Without `provisionalId` the
 * magic-link verify skips conversion entirely and 404s, which the client maps
 * to "That link has expired"; `/auth/social` likewise falls through to
 * `no-account-for-identity`. Either way the user loops forever and the
 * progress the whole gate exists to preserve is quietly lost.
 *
 * A gated veteran's access token is almost always stale on arrival: they
 * expire in 30 minutes and nothing behind the wall refreshes them — no
 * `(app)` screen mounts, so the interceptor that used to do it incidentally
 * never runs. `authClient` is a bare axios instance with no interceptors of
 * its own, so the refresh has to be explicit here.
 *
 * Ending the session requires SERVER PROOF — a 401 for the refresh token
 * itself. Nothing else does:
 *
 * - No refresh token on disk: we return the stored access token and let the
 *   conversion try. `doRefreshProvisionalTokens` reports `'dead'` for this
 *   case without any network call, and that is right for its OTHER caller —
 *   the provisional-client interceptor only asks after a 401 has already
 *   proven the access token rejected, so "nothing left to refresh with" really
 *   is unrecoverable there. Here we ask PROACTIVELY, with no such proof, so
 *   inheriting that verdict would hand `wipeGuestSession` (explicitly "no
 *   salvage") a working session's character, quests and POIs on no evidence.
 *   The state is reachable: `createProvisionalUser` stores the refresh token
 *   conditionally, and `hydrate()` still carries a fallback for installs
 *   without one. Its contract is deliberately NOT changed — the interceptor
 *   depends on it and is correct as written. Reported to PostHog rather than
 *   passed over in silence: this install shape mis-converts by construction,
 *   and it is otherwise invisible — the conversion endpoints answer 200.
 * - `'error'` (network flake, 5xx, timeout, malformed body): proof of nothing
 *   either, so the session is likewise left alone — but the conversion is
 *   ABANDONED rather than attempted, and the caller is told to retry.
 *
 * That last one is the asymmetry worth stating. Proceeding on a stale token
 * does not fail loudly: `auth.optional` swallows it, the server sees no
 * `req.user`, and a conversion degrades into a plain signup — a second
 * account, the hero orphaned, no error anywhere. Aborting costs the user a
 * retry. Orphaning costs them everything the gate exists to save, so the two
 * are not close. Aborting is NOT correct for the no-refresh-token case above:
 * that install can never refresh, so abandoning would strand it forever, while
 * proceeding at least succeeds whenever the stored token is still valid.
 *
 * `authClient`'s 10s timeout bounds the added wait.
 */
const freshProvisionalAccessToken = async (): Promise<string | null> => {
  const stored = getItem('provisionalAccessToken');
  if (typeof stored !== 'string' || stored.length === 0) {
    return null;
  }

  const refreshToken = getItem('provisionalRefreshToken');
  if (typeof refreshToken !== 'string' || refreshToken.length === 0) {
    posthogClient.capture('provisional_conversion_unrefreshable');
    return stored;
  }

  const result = await refreshProvisionalTokens();
  if (result.status === 'dead') {
    endProvisionalSession();
    throw new ProvisionalSessionExpired();
  }
  if (result.status === 'refreshed') {
    return result.tokens.access.token;
  }

  posthogClient.capture('provisional_conversion_refresh_unavailable');
  throw new ProvisionalRefreshUnavailable();
};

/**
 * Request a magic link for authentication
 */
export const requestMagicLink = async (email: string): Promise<void> => {
  // Outside the try: this is not a magic-link failure, and logging it as one
  // would bury the real cause under the wrong message.
  const provisionalToken = await freshProvisionalAccessToken();

  try {
    console.log('provisionalToken exists:', !!provisionalToken);

    const body = { email };

    // Prepare headers - add Authorization for provisional token if available
    const headers: { [key: string]: string } = {
      'Content-Type': 'application/json',
    };

    if (provisionalToken) {
      headers.Authorization = `Bearer ${provisionalToken}`;
      console.log(
        'Adding Bearer token for provisional user:',
        provisionalToken.substring(0, 20) + '...'
      );
    }

    // Use authClient with manual headers for provisional tokens
    const response = await authClient.post('/auth/magiclink', body, {
      headers,
    });
    console.log('magiclink response:', response.data);
    return response.data;
  } catch (error) {
    console.error('Magic link request error:', error);
    throw error;
  }
};

/**
 * Verify a magic link token and authenticate the user
 */
export const verifyMagicLink = async (
  token: string
): Promise<tokenService.AuthTokens> => {
  try {
    console.log('[VERIFY MAGIC LINK] - token: ', token);
    // throw error if token is not a string
    if (typeof token !== 'string') {
      throw new Error('Token is not a string');
    }
    const response = await authClient.get(
      `/auth/magiclink/verify?token=${token}`
    );
    // Expect the API to return tokens in the nested format:
    // { access: { token: string, expires: string }, refresh: { token: string, expires: string } }
    console.log('[VERIFY MAGIC LINK] - response data: ', response.data);
    tokenService.storeTokens(response.data);

    // Clear provisional user data after successful authentication
    removeItem('provisionalAccessToken');
    removeItem('provisionalUserId');
    removeItem('provisionalEmail');
    console.log('Cleared provisional user data after successful login');

    return response.data;
  } catch (error) {
    console.error('Magic link verification error:', error);
    throw error;
  }
};

/**
 * Shared post-auth orchestration: given tokens from ANY sign-in method
 * (magic link, Apple, Google, ...), updates the auth store, fetches and
 * stores user data, and identifies the user to analytics/push.
 *
 * Error/return contract for callers:
 * - Failures in the initial `signIn(...)` call, or a malformed `tokens`
 *   shape (missing `access`/`refresh`), throw RAW out of this function —
 *   there is no internal try/catch around that step. Callers must wrap
 *   this call themselves (`verifyMagicLinkAndSignIn` does; social sign-in
 *   callers must too).
 * - Failures from `getUserDetails()` onward (fetching/storing the user,
 *   analytics identify, character sync) are swallowed internally and the
 *   function still resolves `'app'` — verification/sign-in succeeded even
 *   if the follow-up user-data fetch didn't.
 * - The current implementation ALWAYS resolves `'app'`. The `'onboarding'`
 *   union member is reserved for future use and unreachable today — do
 *   not rely on the return value alone to route brand-new users; e.g. the
 *   social sign-in flow derives that routing decision from the server's
 *   `outcome` field instead.
 */
export const completeSignIn = async (
  tokens: tokenService.AuthTokens
): Promise<'onboarding' | 'app'> => {
  // Step 2: Update auth store with proper signIn call
  signIn({
    token: {
      access: tokens.access.token,
      refresh: tokens.refresh.token,
    },
  });

  // Step 3: Fetch and store user data
  try {
    const userResponse = await getUserDetails();
    console.log(
      '[Auth] User response from server:',
      JSON.stringify(userResponse, null, 2)
    );

    // Store user data in user store
    if (userResponse && userResponse.id && userResponse.email) {
      useUserStore.getState().setUser(userResponse);

      // Same id as OneSignal/RevenueCat — merges the anonymous history
      // into the server-side user in PostHog.
      posthogClient.identify(userResponse.id);

      // Link OneSignal with the user's MongoDB ID
      if ((global as any).isOneSignalInitialized) {
        console.log(
          '[Auth] Logging into OneSignal with user ID:',
          userResponse.id
        );
        OneSignal.login(userResponse.id);

        // Debug: Verify the login worked
        setTimeout(async () => {
          try {
            const externalId = await OneSignal.User.getExternalId();
            console.log(
              '[OneSignal Debug] After sign-in - External ID:',
              externalId
            );
            console.log('[OneSignal Debug] Expected:', userResponse.id);
            console.log(
              '[OneSignal Debug] Match:',
              externalId === userResponse.id
            );
          } catch (error) {
            console.error('[OneSignal Debug] Error verifying login:', error);
          }
        }, 1000);
      } else {
        console.log('[Auth] OneSignal not initialized yet, will login later');
      }

      // If user has character data from server, store it in character store
      // Check both nested character object and top-level properties
      if (userResponse?.type && userResponse?.name) {
        const characterStore = useCharacterStore.getState();

        // Handle both formats: nested character object or top-level properties
        const characterData = {
          type: (userResponse as any).type,
          name: (userResponse as any).name,
          level: (userResponse as any).level || 1,
          currentXP: (userResponse as any).xp || 0,
        };

        // First create the character if it doesn't exist locally
        if (!characterStore.character) {
          characterStore.createCharacter(
            characterData.type as any,
            characterData.name
          );
        }

        // Then update with the server data
        characterStore.updateCharacter({
          type: characterData.type || (userResponse as any).type,
          name: characterData.name || (userResponse as any).name,
          level: characterData.level || (userResponse as any).level || 1,
          currentXP: characterData.currentXP || (userResponse as any).xp || 0,
        });

        // Also update streak if provided
        if (userResponse.dailyQuestStreak !== undefined) {
          characterStore.setStreak(userResponse.dailyQuestStreak);
        }

        console.log('[Auth] Character data synchronized from server');
      } else {
        console.log('[Auth] No character data found in server response');
      }
    }

    console.log('[Auth] User data fetched and stored successfully');

    // Let the navigation resolver determine the correct route
    // Since we've cleared provisional data and signed in with real tokens,
    // the navigation resolver will detect this is a verified user and handle routing appropriately
    return 'app';
  } catch (fetchError) {
    console.error('Error fetching user data during verification:', fetchError);
    // If we can't fetch user data but verification succeeded, still let navigation resolver decide
    console.log(
      '[Auth] Failed to fetch user data, letting navigation resolver decide routing'
    );
    return 'app';
  }
};

/**
 * Comprehensive magic link verification that includes user fetching and auth store updates
 * Returns navigation target: 'onboarding' | 'app'
 */
export const verifyMagicLinkAndSignIn = async (
  token: string
): Promise<'onboarding' | 'app'> => {
  try {
    // Step 1: Verify the magic link and store tokens
    const tokens = await verifyMagicLink(token);
    console.log('[verifyMagicLinkAndSignIn] - tokens: ', tokens);

    // Steps 2-3: sign in + fetch/store user data (shared with other
    // sign-in methods) — kept inside this try so a failure here still
    // gets the magic-link-specific log below, same as before the split.
    return await completeSignIn(tokens);
  } catch (error) {
    console.error('Magic link verification failed:', error);
    throw error;
  }
};

/**
 * Exchange a native social sign-in credential (Google or Apple) for our own
 * session tokens, mirroring the magic-link verify flow's storage/cleanup
 * side effects so social-authenticated sessions are indistinguishable from
 * magic-link ones afterwards.
 *
 * Error contract: exactly ONE failure is translated — the server's
 * existing-account collision becomes `ExistingAccountConfirmationRequired`
 * (see below). Everything else is re-thrown as the very same object: network
 * failures, other non-2xx responses (including the generic email-in-use 409
 * the magic-link path also returns), and `completeSignIn`'s own raw throws
 * (see its JSDoc). Callers (the sign-in UI) must catch and render an error
 * state; `SocialSignInCancelled` from the native wrappers is a separate,
 * earlier failure mode this function never sees.
 *
 * `confirmExistingAccount` is the collision's second act: on catching
 * `ExistingAccountConfirmationRequired` the UI confirms with the user, then
 * replays the SAME credential with the flag set — no second native prompt.
 * The server had mutated nothing on the first, rejected attempt.
 *
 * Returns both `target` and the server's `outcome` because `completeSignIn`
 * always resolves `'app'` today (see its JSDoc) — routing brand-new
 * ('created') users differently is derived from `outcome` by the caller,
 * not from `target`.
 */
export const socialSignIn = async (
  credential: {
    provider: 'google' | 'apple';
    idToken: string;
    nonce?: string;
  },
  confirmExistingAccount = false
): Promise<{
  target: 'onboarding' | 'app';
  // `SocialSignInOutcome` documents the server's five known literals (see
  // its own JSDoc) for autocomplete/review purposes; `(string & {})` keeps
  // the type open so an outcome the server adds later doesn't fail to
  // compile here or at any caller — it just isn't one of the known cases
  // in a `switch`/equality check, which is a safer failure mode than a
  // hard type error shipping a stale client against a newer server.
  outcome: SocialSignInOutcome | (string & {});
}> => {
  // Refreshed first when a guest session exists — see
  // `freshProvisionalAccessToken`. A stale token here does not fail loudly;
  // it makes the server treat a conversion as a brand-new signup and strands
  // the hero this screen promised to keep.
  const provisionalToken = await freshProvisionalAccessToken();

  const headers: { [key: string]: string } = {
    'Content-Type': 'application/json',
  };
  if (provisionalToken) {
    headers.Authorization = `Bearer ${provisionalToken}`;
  }

  let response;
  try {
    response = await authClient.post(
      '/auth/social',
      // Always send the flag, never `undefined`/`null`: the server validates it
      // with `Joi.boolean().default(false)`, which 400s on an explicit null.
      { ...credential, confirmExistingAccount },
      { headers }
    );
  } catch (error) {
    // Branch on `details.reason` INSTEAD OF status — see
    // `ExistingAccountConfirmationRequired`'s doc for why status can't be it.
    //
    // The payload generic is spelled out because `isAxiosError`'s defaults to
    // `any` — left off, a typo in `reason`/`account` below would read
    // `undefined` and silently fall through to the generic error copy.
    const details = axios.isAxiosError<{
      details?: {
        reason?: string;
        account?: ExistingAccountSummary;
        email?: string;
      };
    }>(error)
      ? error.response?.data?.details
      : undefined;
    if (details?.reason === 'existing-account-confirmation-required') {
      throw new ExistingAccountConfirmationRequired(details.account ?? {});
    }
    if (details?.reason === 'no-account-for-identity') {
      // `?? ''` rather than a throw: the screen's copy already handles an empty
      // address (it drops the "for <email>" clause), and failing the whole
      // sign-in because a display string is missing would be a worse outcome
      // than a slightly vaguer sentence.
      throw new NoAccountForIdentity(details.email ?? '');
    }
    throw error;
  }

  const { tokens, outcome } = response.data;

  tokenService.storeTokens(tokens);

  // Clear provisional user data now that we have a real session, same as
  // verifyMagicLink. Must stay AFTER the post — an unconfirmed collision
  // throws above, and dismissing it has to leave the provisional session
  // intact so the local hero survives and the confirm re-post still carries
  // its Bearer header (and so still hits the provisional-conversion branch).
  removeItem('provisionalAccessToken');
  removeItem('provisionalUserId');
  removeItem('provisionalEmail');

  const target = await completeSignIn(tokens);
  return { target, outcome };
};

/**
 * Check if user is authenticated
 */
export const isAuthenticated = (): boolean => {
  const token = tokenService.getAccessToken();
  return !!token;
};

/**
 * Clear all authentication data
 */
export const logout = (): void => {
  try {
    tokenService.removeTokens();
  } catch (error) {
    console.error('Error during logout:', error);
    throw error;
  }
};

/**
 * Refresh the access token using the refresh token
 */
export const refreshAccessToken =
  async (): Promise<tokenService.AuthTokens | null> => {
    try {
      console.log('refreshing access token');
      const refreshToken = tokenService.getRefreshToken();
      console.log('refreshToken', refreshToken);
      if (!refreshToken) {
        return null;
      }

      const response = await authClient.post('/auth/refresh-tokens', {
        refreshToken,
      });

      // The server now returns nested tokens consistently:
      // { access: { token, expires }, refresh: { token, expires } }
      const newTokens: tokenService.AuthTokens = response.data;
      console.log('newTokens', newTokens);
      tokenService.storeTokens(newTokens);
      return newTokens;
    } catch (error) {
      console.error('Error refreshing token:', error);
      // If refresh fails, clear tokens
      tokenService.removeTokens();
      return null;
    }
  };

/**
 * Result of a provisional-session refresh. Discriminated so callers can tell
 * "the session is definitively dead" (server rejected the refresh token, or we
 * never had one) from "the refresh merely failed" (network, 5xx, malformed
 * response) — only the former may end the session; treating a flaky network as
 * death would destroy an unclaimed hero's server link over nothing.
 */
export type ProvisionalRefreshResult =
  | { status: 'refreshed'; tokens: tokenService.AuthTokens }
  | { status: 'dead' }
  | { status: 'error' };

const doRefreshProvisionalTokens =
  async (): Promise<ProvisionalRefreshResult> => {
    const refreshToken = getItem<string>('provisionalRefreshToken');
    if (typeof refreshToken !== 'string' || refreshToken.length === 0) {
      // The access token was rejected and there is nothing to refresh with:
      // unrecoverable by construction.
      return { status: 'dead' };
    }

    try {
      const response = await authClient.post('/auth/refresh-tokens', {
        refreshToken,
      });
      const tokens: tokenService.AuthTokens = response.data;
      if (!tokens?.access?.token || !tokens?.refresh?.token) {
        return { status: 'error' };
      }

      // The server rotates refresh tokens (the old doc is deleted on use), so
      // both halves must be stored back or the NEXT refresh would 401 against
      // a consumed token and falsely read as a dead session.
      setItem('provisionalAccessToken', tokens.access.token);
      setItem('provisionalRefreshToken', tokens.refresh.token);
      return { status: 'refreshed', tokens };
    } catch (error) {
      // Plain property check instead of axios.isAxiosError: the server's
      // refreshAuth answers 401 for every rejected refresh token, and only a
      // 401 proves the server itself disowned the session.
      const status = (error as { response?: { status?: number } })?.response
        ?.status;
      if (status === 401) {
        return { status: 'dead' };
      }
      console.error('Provisional token refresh failed:', error);
      return { status: 'error' };
    }
  };

// Single-flight: the server consumes the refresh token on first use, so two
// concurrent refreshes would have the loser present an already-deleted token,
// get a 401, and misdiagnose a healthy session as dead. Both axios clients
// funnel through here, so the deduplication must live at this level.
let provisionalRefreshInFlight: Promise<ProvisionalRefreshResult> | null = null;

export const refreshProvisionalTokens =
  (): Promise<ProvisionalRefreshResult> => {
    if (!provisionalRefreshInFlight) {
      provisionalRefreshInFlight = doRefreshProvisionalTokens().finally(() => {
        provisionalRefreshInFlight = null;
      });
    }
    return provisionalRefreshInFlight;
  };

/**
 * Remove all tokens (alias for backward compatibility)
 */
export const removeTokens = tokenService.removeTokens;

// Re-export token types for backward compatibility
export type { AuthTokens } from '@/api/token';
