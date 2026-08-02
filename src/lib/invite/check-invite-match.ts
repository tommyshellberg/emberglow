import { Platform } from 'react-native';
import {
  PlayInstallReferrer,
  type PlayInstallReferrerCallback,
} from 'react-native-play-install-referrer';

import { matchInvite, resolveInviteCode } from '@/lib/services/invite-link';
import { useInviteStore } from '@/store/invite-store';

const ANDROID_REFERRER_TIMEOUT_MS = 2000;

/**
 * True when `error` is an axios error carrying an HTTP 4xx response — a
 * client error the server actively rejected (e.g. the invite code doesn't
 * exist, or was deleted by its owner), as opposed to a transport failure
 * (offline, timeout, DNS) where axios never got a response at all.
 */
function isHttpClientError(error: unknown): boolean {
  const status = (error as { response?: { status?: number } } | undefined)
    ?.response?.status;
  return typeof status === 'number' && status >= 400 && status < 500;
}

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
 *     we resolve it directly and never fall through to fingerprint matching
 *     *unless the resolve fails with an HTTP 4xx* (see below).
 *  2. Otherwise, ask the server to fingerprint-match this install, passing
 *     the Android install referrer when we can get one in time.
 *
 * Never throws. `matchChecked` is set only after a *completed* attempt.
 * A resolve failure on the stashed code is split by cause:
 *  - Transport error (offline, timeout — axios never got a response): the
 *    stash is preserved and `matchChecked` stays false so the next launch
 *    retries the same resolve, mirroring the server's stamp-only-on-match
 *    idempotency.
 *  - HTTP 4xx (the server actively rejected the code — deleted by its owner,
 *    malformed, etc.): the code will never resolve, so retrying forever
 *    would wedge attribution permanently. The stash is cleared and this run
 *    falls through to fingerprint matching instead.
 */
export async function checkInviteMatch(): Promise<void> {
  if (useInviteStore.getState().matchChecked) {
    return;
  }

  try {
    // Peek rather than consume: only clear the stash once resolveInviteCode
    // has actually succeeded or definitively failed (4xx). Consuming it
    // upfront would destroy the code on a transport failure, so a retried
    // launch would silently fall through to fingerprint matching instead of
    // re-attempting the same resolve.
    const stashedCode = useInviteStore.getState().stashedCode;

    if (stashedCode) {
      try {
        const resolved = await resolveInviteCode(stashedCode);
        useInviteStore.getState().consumeStashedCode();
        if (!resolved.isSelf && !resolved.alreadyFriends) {
          useInviteStore.getState().setPendingInvite({
            code: resolved.code,
            inviterName: resolved.inviter.characterName,
          });
        }
        useInviteStore.getState().setMatchChecked();
        return;
      } catch (error) {
        if (!isHttpClientError(error)) {
          // Transport error — preserve the stash, leave matchChecked false,
          // bail out entirely so the next launch retries this resolve.
          return;
        }
        // Dead code (4xx) — clear the stash and fall through below to
        // attempt fingerprint matching in this same run.
        useInviteStore.getState().consumeStashedCode();
      }
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
