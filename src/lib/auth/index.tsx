import Constants from 'expo-constants';
import { OneSignal } from 'react-native-onesignal';
import { create } from 'zustand';

import { storeTokens } from '@/api/token';
import { revenueCatService } from '@/lib/services/revenuecat-service';
import { getUserDetails } from '@/lib/services/user';
import { getItem } from '@/lib/storage';
import { useCharacterStore } from '@/store/character-store';
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

    // Login to RevenueCat with user ID
    if (loginResponse.user?.id) {
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

    // Clear user store
    useUserStore.getState().clearUser();

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
      const provisionalToken = getItem('provisionalAccessToken');
      const provisionalRefreshToken = getItem('provisionalRefreshToken');

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

            // Sync server-reported spirit (guard so pre-deploy server responses don't clobber state)
            if (user.spirit !== undefined) {
              characterStore.setSpiritState({
                spirit: user.spirit,
                spiritRestoredAt: user.spiritRestoredAt ?? null,
                restorationCount: user.restorationCount ?? 0,
              });
            }

            console.log('[Auth] Character data synchronized during hydration');
          } else {
            console.log('[Auth] No character data found during hydration');
          }

          set({ status: 'signIn', token: userToken });
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

        // Note: We don't fetch user details for provisional users yet
        // They will be fetched after quest completion when converting to full user
        console.log('[Auth] Provisional user hydrated successfully');
      } else {
        // No tokens found - set signOut status without calling logout methods
        // since the user was never logged in
        set({ status: 'signOut', token: null });
      }
    } catch (e) {
      console.error('Error during hydration process:', e);
      // Don't sign out on hydration errors - let the user continue if possible
      // They might just have network issues or other temporary problems
      set({ status: 'signOut' }); // Set to signOut state but don't clear tokens
    }
  },
}));

export const useAuth = createSelectors(_useAuth);

export const signIn = (response: UserLoginResponse) =>
  _useAuth.getState().signIn(response);
export const signOut = () => _useAuth.getState().signOut();
export const hydrateAuth = async () => _useAuth.getState().hydrate();
