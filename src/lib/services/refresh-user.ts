import { getUserDetails, type UserDetails } from '@/lib/services/user';
import { getItem } from '@/lib/storage';
import { useCharacterStore } from '@/store/character-store';
import { useUserStore } from '@/store/user-store';

type CharacterFields = Pick<
  UserDetails,
  'type' | 'name' | 'level' | 'xp' | 'dailyQuestStreak'
>;

/**
 * Write the server's character and streak into the character store.
 * This is the only place server values reach the streak. Cold start, login,
 * foreground, and quest completion all go through here.
 */
export function syncCharacterFromUser(user: CharacterFields): void {
  const store = useCharacterStore.getState();

  if (user.type && user.name) {
    if (!store.character) {
      store.createCharacter(user.type as any, user.name);
    }
    useCharacterStore.getState().updateCharacter({
      type: user.type as any,
      name: user.name,
      level: user.level || 1,
      currentXP: user.xp || 0,
    });
  }

  if (user.dailyQuestStreak !== undefined) {
    useCharacterStore.getState().setStreak(user.dailyQuestStreak);
  }
}

/**
 * Fetch /users/me and apply it locally. Safe to call often: provisional
 * users are skipped (they have no /users/me), and network failures keep the
 * cached values.
 */
export async function refreshUser(): Promise<void> {
  if (getItem('provisionalAccessToken')) {
    return;
  }
  try {
    const user = await getUserDetails();
    useUserStore.getState().setUser(user as any);
    syncCharacterFromUser(user);
  } catch (error) {
    console.warn('[refreshUser] Keeping cached user; fetch failed:', error);
  }
}
