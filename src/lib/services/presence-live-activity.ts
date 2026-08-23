/**
 * Local (device-side) Live Activity updates for the presence realtime-fail
 * flow. These are plain ActivityKit updates through the OneSignal bridge —
 * they work offline and involve no push. The ONLY remote tile push in the
 * feature is the server's fail (server-owned; never sent from here).
 *
 * `startDefault` with an existing id updates the activity in place — the
 * same mechanism quest-timer.ts uses everywhere. Attributes re-send `title`
 * only: the widget reads nothing else from attributes. All display copy is
 * derived in Swift from `status`, so a local `failed` flip and the server's
 * `failed` push render identically by construction.
 *
 * Spec: docs/superpowers/specs/2026-07-06-presence-realtime-fail-design.md
 */
import { Platform } from 'react-native';
import { OneSignal } from 'react-native-onesignal';

export type PresenceTileParams = {
  activityId: string | null;
  title: string;
  durationMinutes: number;
};

const toEpochSeconds = (ms: number) => Math.round(ms / 1000);

function updateTile(
  params: PresenceTileParams,
  content: Record<string, unknown>
): void {
  if (Platform.OS !== 'ios' || !params.activityId) return;
  try {
    OneSignal.LiveActivities.startDefault(
      params.activityId,
      { title: params.title },
      { durationMinutes: params.durationMinutes, ...content }
    );
  } catch (error) {
    console.error('[PresenceLiveActivity] tile update failed:', error);
  }
}

/** Flip to the visible grace countdown ("Refocus — failing in 0:29"). */
export function flipLiveActivityToGrace(
  params: PresenceTileParams & { graceEndsAt: number } // epoch ms
): void {
  updateTile(params, {
    status: 'warning',
    graceEndsAt: toEpochSeconds(params.graceEndsAt),
  });
}

/** Revert to the running-quest tile, anchored at the true quest start. */
export function revertLiveActivityToActive(
  params: PresenceTileParams & { startedAt: number } // epoch ms
): void {
  updateTile(params, {
    status: 'active',
    startedAt: toEpochSeconds(params.startedAt),
  });
}

/** Offline-fallback fail flip — used ONLY when the away report never
 * reached the server (otherwise the server pushes the failed tile). */
export function flipLiveActivityToFailed(params: PresenceTileParams): void {
  updateTile(params, { status: 'failed' });
}
