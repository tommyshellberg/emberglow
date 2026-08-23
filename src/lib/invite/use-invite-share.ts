import { useCallback, useState } from 'react';
import { Share } from 'react-native';

import { posthogClient } from '@/lib/posthog';
import { getInviteLink } from '@/lib/services/invite-link';

/**
 * The one way to invite a friend: fetch the caller's invite link and hand it
 * to the OS share sheet. Replaced the contacts-import flow (removed 2026-08-14
 * — too much friction, and two invite paths confused the profile screen).
 *
 * `src` tags both the shared URL and the analytics event so invite
 * conversion can be split by surface.
 */
export function useInviteShare(src: 'profile' | 'leaderboard' | 'coop_menu') {
  const [isSharing, setIsSharing] = useState(false);

  const shareInvite = useCallback(async () => {
    setIsSharing(true);
    try {
      const inviteLink = await getInviteLink();
      const sharedUrl = `${inviteLink.url}?src=${src}`;

      const result = await Share.share({
        message: `Join me on Emberglow! ${sharedUrl}`,
      });

      // Only capture if the user actually shared (not dismissed).
      if (result.action === Share.sharedAction) {
        posthogClient.capture('invite_link_shared', { src });
      }
    } catch {
      // Silently ignore errors (network failure, etc.).
    } finally {
      setIsSharing(false);
    }
  }, [src]);

  return { shareInvite, isSharing };
}
