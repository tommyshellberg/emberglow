/**
 * Profile Screen Custom Hooks
 *
 * Extracted from profile.tsx to separate concerns and improve testability.
 */

import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';

import { getUserDetails } from '@/lib/services/user';
import { getItem } from '@/lib/storage';
import { useCharacterStore } from '@/store/character-store';
import type { CharacterType } from '@/store/types';

import { CHARACTER_SYNC } from '@/features/profile/constants/profile-constants';
import type { UserWithLegacyCharacter } from '@/features/profile/types/profile-types';

/**
 * Custom hook to sync character data from server when user has no local character
 *
 * This handles the case where verified users return to the app and need to restore
 * their character data from the server, or provisional users need to be redirected
 * to onboarding.
 *
 * @param dependencies - Optional dependencies for testing (characterStore, storage, userService, router)
 * @returns isRedirecting - True if user is being redirected to onboarding
 */
export function useCharacterSync(dependencies?: {
  characterStore?: typeof useCharacterStore;
  getStorageItem?: typeof getItem;
  getUserDetails?: typeof getUserDetails;
  router?: ReturnType<typeof useRouter>;
}) {
  // Use provided dependencies or defaults for production
  const characterStore = dependencies?.characterStore || useCharacterStore;
  const getStorageItem = dependencies?.getStorageItem || getItem;
  const getUserDetailsFunc = dependencies?.getUserDetails || getUserDetails;
  const providedRouter = dependencies?.router;

  const router = useRouter();
  const actualRouter = providedRouter || router;
  const character = characterStore((state) => state.character);
  const [isRedirecting, setIsRedirecting] = useState(false);

  useEffect(() => {
    if (!character && !isRedirecting) {
      const syncCharacterFromUser = async () => {
        try {
          const user: UserWithLegacyCharacter = await getUserDetailsFunc();

          // Check if user has character data at the top level (legacy format)
          // Level is optional and will default to 1 if missing
          const hasLegacyCharacterData = user?.type && user?.name;

          if (hasLegacyCharacterData) {
            // Create character from user data
            const characterStoreInstance = characterStore.getState();
            characterStoreInstance.createCharacter(
              user.type as CharacterType,
              user.name!
            );

            // Update with level and XP data
            const level = user.level || 1;

            characterStoreInstance.updateCharacter({
              type: user.type!,
              name: user.name!,
              level,
              currentXP: user.xp || 0,
            });

            // Update streak if available
            if (user.dailyQuestStreak !== undefined) {
              characterStoreInstance.setStreak(user.dailyQuestStreak);
            }
          } else {
            // Only redirect to onboarding if this is truly a new user
            // Check for provisional data to determine if they're in onboarding
            const hasProvisionalData = !!(
              getStorageItem('provisionalUserId') ||
              getStorageItem('provisionalAccessToken') ||
              getStorageItem('provisionalEmail')
            );

            if (hasProvisionalData) {
              // User is in onboarding flow, redirect to choose character
              setIsRedirecting(true);
              setTimeout(() => {
                actualRouter.replace('/onboarding/choose-character');
              }, CHARACTER_SYNC.redirectDelay);
            }
            // For verified users without character data, we'll show a message
            // rather than redirecting to onboarding
          }
        } catch (error) {
          // TODO: Replace console.error with logger service
          console.error('Error syncing character data:', error);
        }
      };

      syncCharacterFromUser();
    }
  }, [character, actualRouter, isRedirecting, characterStore, getStorageItem, getUserDetailsFunc]);

  return { isRedirecting };
}
