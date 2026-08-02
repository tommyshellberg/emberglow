import { Platform } from 'react-native';
import {
  PlayInstallReferrer,
  type PlayInstallReferrerCallback,
} from 'react-native-play-install-referrer';

import { matchInvite, resolveInviteCode } from '@/lib/services/invite-link';
import { useInviteStore } from '@/store/invite-store';

const ANDROID_REFERRER_TIMEOUT_MS = 2000;

/**
 * Wraps the native `PlayInstallReferrer.getInstallReferrerInfo` callback API
 * in a promise, bounded by a timeout — the underlying Play Install Referrer
 * service call can hang (no network, Play Store unavailable), and this is a
 * best-effort signal, not something worth blocking first launch on.
 * Resolves to `undefined` (never rejects) on any error, timeout, or missing
 * referrer info.
 */
function getAndroidInstallReferrer(): Promise<string | undefined> {
  return new Promise((resolve) => {
    let settled = false;
    const finish = (value: string | undefined) => {
      if (settled) return;
      settled = true;
      resolve(value);
    };

    const timer = setTimeout(
      () => finish(undefined),
      ANDROID_REFERRER_TIMEOUT_MS
    );

    const callback: PlayInstallReferrerCallback = (info, error) => {
      clearTimeout(timer);
      if (error || !info) {
        finish(undefined);
        return;
      }
      finish(info.installReferrer);
    };

    try {
      PlayInstallReferrer.getInstallReferrerInfo(callback);
    } catch {
      clearTimeout(timer);
      finish(undefined);
    }
  });
}

/**
 * First-launch invite-attribution decision. Priority order:
 *
 *  1. A stashed universal-link code (Task 13's route stashes it before this
 *     ever runs) always wins — it's an explicit, high-confidence signal, so
 *     we resolve it directly and never fall through to fingerprint matching.
 *  2. Otherwise, ask the server to fingerprint-match this install, passing
 *     the Android install referrer when we can get one in time.
 *
 * Never throws. `matchChecked` is set only after a *completed* attempt —
 * a network failure during either path leaves it false so the next launch
 * retries, mirroring the server's stamp-only-on-match idempotency.
 */
export async function checkInviteMatch(): Promise<void> {
  if (useInviteStore.getState().matchChecked) {
    return;
  }

  try {
    const stashedCode = useInviteStore.getState().consumeStashedCode();

    if (stashedCode) {
      const resolved = await resolveInviteCode(stashedCode);
      if (!resolved.isSelf && !resolved.alreadyFriends) {
        useInviteStore.getState().setPendingInvite({
          code: resolved.code,
          inviterName: resolved.inviter.characterName,
        });
      }
      useInviteStore.getState().setMatchChecked();
      return;
    }

    const installReferrer =
      Platform.OS === 'android' ? await getAndroidInstallReferrer() : undefined;

    const result = await matchInvite({
      platform: Platform.OS === 'android' ? 'android' : 'ios',
      installReferrer,
    });

    if (result.matched && result.kind === 'friend') {
      useInviteStore.getState().setPendingInvite({
        code: result.code,
        inviterName: result.inviter.characterName,
      });
    }

    useInviteStore.getState().setMatchChecked();
  } catch {
    // Leave matchChecked false so the next launch retries.
  }
}
