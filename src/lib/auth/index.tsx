import * as Sentry from '@sentry/react-native';
import Constants from 'expo-constants';
import { router } from 'expo-router';
import { Alert } from 'react-native';
import { OneSignal } from 'react-native-onesignal';
import { create } from 'zustand';

import { storeTokens } from '@/api/token';
import { posthogClient } from '@/lib/posthog';
import { revenueCatService } from '@/lib/services/revenuecat-service';
import { getUserDetails } from '@/lib/services/user';
import { getItem, removeItem } from '@/lib/storage';
import { useCharacterStore } from '@/store/character-store';
import { useOnboardingStore } from '@/store/onboarding-store';
import { usePOIStore } from '@/store/poi-store';
import { useUserStore } from '@/store/user-store';

import { createSelectors } from '../utils';
import type { TokenType, UserLoginResponse } from './utils';
import { getToken, removeToken, setToken } from './utils';

interface AuthState {
  token: TokenType | null;
  status: 'idle' | 'signOut' | 'signIn' | 'hydrating';
  signIn: (data: UserLoginResponse) => void;
  signOut: () => void;
  hydrate: () => Promise<void>;
}

const _useAuth = create<AuthState>((set, get) => ({
  status: 'idle',
  token: null,
  signIn: async (loginResponse) => {
    setToken({
      access: loginResponse.token.access,
      refresh: loginResponse.token.refresh,
    });

    set({
      status: 'signIn',
      token: {
        access: loginResponse.token.access,
        refresh: loginResponse.token.refresh,
      },
    });
    Sentry.setTag('authState', 'full');

    // Login to RevenueCat with user ID
    if (loginResponse.user?.id) {
      posthogClient.identify(loginResponse.user.id);
      try {
        await revenueCatService.loginUser(loginResponse.user.id);
        console.log(
          '[Auth] Logged into RevenueCat with user ID:',
          loginResponse.user.id
        );
      } catch (error) {
        console.error('[Auth] Failed to login to RevenueCat:', error);
        // Don't fail auth if RevenueCat login fails
      }
    }
  },

  signOut: async () => {
    removeToken();

    set({
      status: 'signOut',
      token: null,
    });
    Sentry.setTag('authState', 'signedOut');

    // Clear user store
    useUserStore.getState().clearUser();

    // Detach the PostHog person so a next login on this device doesn't
    // inherit this user's identity.
    posthogClient.reset();

    // Logout from RevenueCat
    try {
      await revenueCatService.logoutUser();
      console.log('[Auth] Logged out from RevenueCat');
    } catch (error) {
      console.error('[Auth] Failed to logout from RevenueCat:', error);
      // Don't fail signOut if RevenueCat logout fails
    }

    // Logout from OneSignal (only if initialized)
    if ((global as any).isOneSignalInitialized) {
      try {
        console.log('[Auth] Logging out from OneSignal');
        OneSignal.logout();

        // Debug: Verify the logout worked
        setTimeout(async () => {
          try {
            const externalId = await OneSignal.User.getExternalId();
            console.log(
              '[OneSignal Debug] After logout - External ID:',
              externalId
            );
            console.log(
              '[OneSignal Debug] Should be null/undefined:',
              !externalId
            );
          } catch (error) {
            console.error('[OneSignal Debug] Error verifying logout:', error);
          }
        }, 1000);
      } catch (error) {
        console.log('[Auth] OneSignal logout error:', error);
      }
    } else {
      console.log('[Auth] Skipping OneSignal logout - not initialized yet');
    }
  },

  hydrate: async () => {
    console.log('hydrating auth');
    set({ status: 'hydrating' });
    // 1) test‑only override
    if (__DEV__ && Constants.expoConfig?.extra?.maestroAccessToken) {
      storeTokens({
        access: {
          token: Constants.expoConfig.extra.maestroAccessToken,
          expires: new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString(),
        },
        refresh: {
          token: Constants.expoConfig.extra.maestroRefreshToken,
          expires: new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString(),
        },
      });
    }
    try {
      const userToken = getToken();
      console.log('userToken', userToken);

      // Check for provisional tokens if no regular token
      const provisionalToken = getItem<string>('provisionalAccessToken');
      const provisionalRefreshToken = getItem<string>(
        'provisionalRefreshToken'
      );

      if (userToken !== null) {
        set({ token: userToken });

        try {
          const user = await getUserDetails();
          console.log(
            '[Auth] User response during hydration:',
            JSON.stringify(user, null, 2)
          );
          useUserStore.getState().setUser(user);

          // Link OneSignal with the user's MongoDB ID
          if (user.id && (global as any).isOneSignalInitialized) {
            console.log('[Auth] Logging into OneSignal with user ID:', user.id);
            OneSignal.login(user.id);

            // Debug: Verify the login worked
            setTimeout(async () => {
              try {
                const externalId = await OneSignal.User.getExternalId();
                console.log(
                  '[OneSignal Debug] After login - External ID:',
                  externalId
                );
                console.log('[OneSignal Debug] Expected:', user.id);
                console.log('[OneSignal Debug] Match:', externalId === user.id);
              } catch (error) {
                console.error(
                  '[OneSignal Debug] Error verifying login:',
                  error
                );
              }
            }, 1000);
          } else if (user.id) {
            console.log(
              '[Auth] OneSignal not initialized yet, will login later'
            );
          }

          // Login to RevenueCat with user ID
          if (user.id) {
            posthogClient.identify(user.id);
            try {
              await revenueCatService.loginUser(user.id);
              console.log(
                '[Auth] Logged into RevenueCat during hydration with user ID:',
                user.id
              );
            } catch (error) {
              console.error(
                '[Auth] Failed to login to RevenueCat during hydration:',
                error
              );
              // Don't fail hydration if RevenueCat login fails
            }
          }

          // Sync character data if available
          // Check both nested character object and top-level properties
          const hasNestedCharacter = (user as any).character?.name;
          const hasTopLevelCharacter = user.name;

          if (hasNestedCharacter || hasTopLevelCharacter) {
            const characterStore = useCharacterStore.getState();

            // Handle both formats: nested character object or top-level properties
            const characterData = hasNestedCharacter
              ? {
                  type: (user as any).character.type,
                  name: (user as any).character.name,
                  level: (user as any).character.level || 1,
                  currentXP:
                    (user as any).character.currentXP ||
                    (user as any).character.xp ||
                    0,
                }
              : {
                  type: (user as any).type,
                  name: (user as any).name,
                  level: (user as any).level || 1,
                  currentXP: (user as any).xp || 0,
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
              type: characterData.type,
              name: characterData.name,
              level: characterData.level,
              currentXP: characterData.currentXP,
            });

            // Also update streak if provided
            if (user.dailyQuestStreak !== undefined) {
              // @TODO: Add this back when we properly sync streak
              characterStore.setStreak(user.dailyQuestStreak);
            }

            console.log('[Auth] Character data synchronized during hydration');
          } else {
            console.log('[Auth] No character data found during hydration');
          }

          set({ status: 'signIn', token: userToken });
          Sentry.setTag('authState', 'full');
        } catch (fetchError) {
          console.error(
            'Failed to fetch user details during hydration:',
            fetchError
          );
          // Don't sign out on user fetch failure - might just be network issue
          // Keep the token and let the user continue with cached data
          console.log('[Auth] Keeping user signed in despite fetch failure');
          // CRITICAL: Must set status to signIn so app can proceed offline
          set({ status: 'signIn', token: userToken });
          Sentry.setTag('authState', 'full');
        }
      } else if (provisionalToken) {
        // Handle provisional users
        console.log('[Auth] Found provisional token during hydration');

        // Create a token structure for provisional users
        const provisionalTokenData: TokenType = {
          access: provisionalToken,
          refresh: provisionalRefreshToken || provisionalToken, // Use access token as fallback
        };

        set({ status: 'signIn', token: provisionalTokenData });
        Sentry.setTag('authState', 'provisional');

        // Note: We don't fetch user details for provisional users yet
        // They will be fetched after quest completion when converting to full user
        console.log('[Auth] Provisional user hydrated successfully');
      } else {
        // No tokens found - set signOut status without calling logout methods
        // since the user was never logged in
        set({ status: 'signOut', token: null });
        Sentry.setTag('authState', 'signedOut');
      }
    } catch (e) {
      console.error('Error during hydration process:', e);
      // Don't sign out on hydration errors - let the user continue if possible
      // They might just have network issues or other temporary problems
      set({ status: 'signOut' }); // Set to signOut state but don't clear tokens
      Sentry.setTag('authState', 'signedOut');
    }
  },
}));

export const useAuth = createSelectors(_useAuth);

export const signIn = (response: UserLoginResponse) =>
  _useAuth.getState().signIn(response);
export const signOut = () => _useAuth.getState().signOut();
export const hydrateAuth = async () => _useAuth.getState().hydrate();

/**
 * Wipes the guest (provisional) session AND all local progress, signs out, and
 * lands the user on /onboarding/welcome.
 *
 * The navigation is explicit rather than left to the resolver. Leaning on the
 * resolver worked while the only callers were the `(app)` interceptors, but
 * the conversion gate added call sites on `/quest-completed-signup` and
 * `/login` — both members of PRE_ACCOUNT_ZONE, where
 * `isAlreadyAtTarget('onboarding', …)` answers true and NavigationGate
 * suppresses the redirect (`@/lib/navigation/is-already-at-target`). The user
 * acknowledged an alert promising a fresh start, lost their character, and did
 * not move. Every caller needs the exit, so the exit belongs here — the same
 * conclusion `login-form.tsx`'s `discardHeroAndStartOver` reached separately.
 *
 * Deliberately no salvage: grafting saved local progress onto a freshly
 * provisioned account is the split-brain shape that produced the PR #364
 * bug family (two accounts, divided quest data, empty journal). A dead
 * guest starts over — one branch, one honest outcome (Tommy, 2026-07-29).
 *
 * Device preferences (reminder times etc.) are intentionally left alone;
 * only identity and progress are wiped.
 *
 * Sibling key list: `hasProvisionalSession` in `./provisional-session`
 * decides whether a guest session EXISTS from two of these four keys
 * (deliberately not `provisionalRefreshToken`, which conversion leaves on
 * disk, nor `provisionalEmail`). If you change which keys conversion clears,
 * change that check too — it is what walls a guest out of the app, so a key
 * added here and not there leaves converted users gated forever.
 */
export const wipeGuestSession = () => {
  removeItem('provisionalAccessToken');
  removeItem('provisionalRefreshToken');
  removeItem('provisionalUserId');
  removeItem('provisionalEmail');

  // Call-time require, not a top-level import: quest-store reaches back to
  // this module (quest-store → quest-run-service → provisional-client →
  // lib/auth), and a static import would close that cycle at module init.
  const { useQuestStore } = require('@/store/quest-store');
  useQuestStore.getState().reset();
  usePOIStore.getState().reset();
  useCharacterStore.getState().resetCharacter();
  useOnboardingStore.getState().resetOnboarding();

  // Also clears the user store and detaches PostHog/RevenueCat/OneSignal.
  _useAuth.getState().signOut();

  router.replace('/onboarding/welcome');
};

/**
 * A provisional session is DEFINITIVELY dead: the server rejected its access
 * token AND its refresh token (or there was none). Nothing sent with those
 * credentials can ever succeed again, so holding onto them only buys an
 * endless 401 storm behind a working-looking app — the failure mode this
 * function exists to end.
 *
 * Tells the user, then wipes on acknowledge — never invisibly underneath
 * the notice, so the screen doesn't reset while they are reading why.
 *
 * Only call this on proof (a 401 for the refresh token itself). For plain
 * network failures the session must be left alone — see
 * refreshProvisionalTokens' result contract.
 */
export const endProvisionalSession = () => {
  Alert.alert(
    'Character Expired',
    'Sorry, but it looks like your temporary character expired — no worries, though, it only takes a couple of minutes to create a new one.',
    [{ text: 'Start Over', onPress: () => wipeGuestSession() }],
    { cancelable: false }
  );
};
