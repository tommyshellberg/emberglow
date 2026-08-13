import { Platform } from 'react-native';
import {
  PlayInstallReferrer,
  type PlayInstallReferrerCallback,
} from 'react-native-play-install-referrer';

import { matchInvite, resolveInviteCode } from '@/lib/services/invite-link';
import { useInviteStore } from '@/store/invite-store';

const ANDROID_REFERRER_TIMEOUT_MS = 2000;

/**
 * True only when the server said the code itself is gone: 404 (never existed
 * or deleted) or 410 (expired). Any other status — 401 (token refresh lost a
 * race), 429 (rate limited), 5xx — or a transport failure says nothing about
 * the code, so the stash must survive for a retry. Deliberately narrower than
 * "any 4xx": while the server's invite routes are not yet deployed, every
 * resolve 404s at the router level, so ship the server side first or codes
 * tapped in the gap are still lost.
 */
function isCodeDeadError(error: unknown): boolean {
  const status = (error as { response?: { status?: number } } | undefined)
    ?.response?.status;
  return status === 404 || status === 410;
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
 * The single consumer of invite-attribution signals. Priority order:
 *
 *  1. A stashed universal-link code always wins — it's an explicit,
 *     high-confidence signal, so we resolve it directly whenever one exists,
 *     no matter how old this install is. The universal-link route stashes on
 *     every tap; this runs on home mount and after provisional signup.
 *  2. Otherwise, once per install (`matchChecked`), ask the server to
 *     fingerprint-match, passing the Android install referrer when we can
 *     get one in time.
 *
 * Never throws. `matchChecked` is set only after a *completed* attempt.
 * A resolve failure on the stashed code is split by cause:
 *  - The server said the code itself is dead (404/410): retrying forever
 *    would wedge attribution permanently. The stash is cleared and this run
 *    falls through to fingerprint matching instead.
 *  - Anything else (transport failure, 401, 429, 5xx): the stash is
 *    preserved and `matchChecked` stays false so the next run retries the
 *    same resolve, mirroring the server's stamp-only-on-match idempotency.
 */
export async function checkInviteMatch(): Promise<void> {
  try {
    // Peek rather than consume: only clear the stash once resolveInviteCode
    // has actually succeeded or definitively failed (404/410). Consuming it
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
        if (!isCodeDeadError(error)) {
          // Preserve the stash, leave matchChecked false, bail out entirely
          // so the next run retries this resolve.
          return;
        }
        // Dead code (404/410) — clear the stash and fall through below to
        // attempt fingerprint matching in this same run.
        useInviteStore.getState().consumeStashedCode();
      }
    }

    if (useInviteStore.getState().matchChecked) {
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
