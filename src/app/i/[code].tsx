import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useRef } from 'react';
import { View } from 'react-native';

import { getAccessToken } from '@/api/token';
import { hasProvisionalSession } from '@/lib/auth/provisional-session';
import { checkInviteMatch } from '@/lib/invite/check-invite-match';
import { useInviteStore } from '@/store/invite-store';
import { colors } from '@/theme';

/**
 * Universal-link entry point for `https://www.emberglowapp.com/i/{code}`.
 *
 * Always stash, never resolve here: `checkInviteMatch` is the single
 * consumer, and it owns the isSelf/alreadyFriends filter and the
 * keep-the-stash-on-transport-failure retry policy. Resolving inline
 * duplicated both and got both wrong. With any session (full account or
 * provisional guest — the API client authenticates either), kick the
 * consumer off immediately so the confirm modal is queued by the time home
 * mounts; without one, the stash waits for onboarding or the next home
 * mount to consume it.
 */
export default function InviteLinkScreen() {
  const params = useLocalSearchParams();
  const code = params.code as string;
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    useInviteStore.getState().stashCode(code);

    if (getAccessToken() || hasProvisionalSession()) {
      // Fire and forget: checkInviteMatch never throws, and navigation must
      // not wait on the network — the stash survives any failure.
      void checkInviteMatch();
    }

    router.replace('/');
  }, [code]);

  return <View style={{ flex: 1, backgroundColor: colors.surface.app }} />;
}
