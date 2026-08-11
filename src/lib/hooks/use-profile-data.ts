import { useCallback, useState } from 'react';

import { getUserDetails } from '@/lib/services/user';
import { useUserStore } from '@/store/user-store';

export function useProfileData() {
  const [userEmail, setUserEmail] = useState('');

  const fetchUserDetails = useCallback(async () => {
    try {
      const details = await getUserDetails();
      // The user store otherwise holds a sign-in-time snapshot, and the
      // profile stats prefer it over the fresh local counts
      // (profile.tsx:130-135). A player who finished quests after signing in
      // therefore saw an old "N quests completed" until they signed in again.
      // Same shape as the Settings screen's fetch (settings.tsx:665-668).
      useUserStore.getState().setUser(details);
      setUserEmail(details.email.toLowerCase());
    } catch (error) {
      console.error('Failed to fetch user details:', error);
    }
  }, []);

  return {
    userEmail,
    fetchUserDetails,
  };
}
