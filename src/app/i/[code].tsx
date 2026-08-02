import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useRef } from 'react';
import { View } from 'react-native';

import { getAccessToken } from '@/api/token';
import { resolveInviteCode } from '@/lib/services/invite-link';
import { useInviteStore } from '@/store/invite-store';
import { colors } from '@/theme';

/**
 * Universal-link entry point for `https://emberglowapp.com/i/{code}`.
 *
 * With an existing session, resolve the code immediately and queue the
 * confirm modal via the invite store. Without one, stash the code —
 * Task 12's stash-first path finishes the job after provisional account
 * creation during onboarding.
 */
export default function InviteLinkScreen() {
  const params = useLocalSearchParams();
  const code = params.code as string;
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    async function run() {
      if (getAccessToken()) {
        try {
          const resolved = await resolveInviteCode(code);
          useInviteStore.getState().setPendingInvite({
            code: resolved.code,
            inviterName: resolved.inviter.characterName,
          });
        } catch {
          // Resolve failure: nothing to queue, just fall through to redirect.
        }
      } else {
        useInviteStore.getState().stashCode(code);
      }

      router.replace('/');
    }

    run();
  }, [code]);

  return <View style={{ flex: 1, backgroundColor: colors.surface.app }} />;
}
