import {
  setAudioModeAsync,
  useAudioPlayer,
  useAudioPlayerStatus,
} from 'expo-audio';
import { useEffect } from 'react';
import { AppState } from 'react-native';

import { useSettingsStore } from '@/store/settings-store';

const TRACK_VOLUME = 0.35;

/**
 * Owns the looping ambient music that plays across the onboarding flow.
 *
 * Must be called exactly once, from `src/app/onboarding/_layout.tsx` — never
 * from a screen. A player owned by a screen is released on navigation, so the
 * track would restart on every screen change instead of playing continuously
 * across the whole flow.
 *
 * `enabled` lets the layout keep the hook above its early-return `Redirect`s
 * (required by the rules of hooks) while still suppressing playback on
 * branches where onboarding shouldn't be heard, e.g. when onboarding is
 * already complete and the layout is about to redirect away. Omitting it
 * behaves as "play", so Task 9's no-argument call is unaffected.
 *
 * `playsInSilentMode: false` is deliberate: unlike narration (which the user
 * explicitly starts by tapping play, see StoryNarration.tsx), this music is
 * ambient audio nobody requested, so the iOS silent switch should mute it.
 *
 * The audio session is global and last-write-wins, and this hook is NOT the
 * only writer: StoryNarration sets `playsInSilentMode: true`. The two really
 * can coexist — the root navigator is a Stack and navigation-gate.tsx pushes
 * /pending-quest, so the onboarding layout is blurred but stays mounted
 * underneath while narration plays on /first-quest-result. That is why the
 * layout gates this hook on `useIsFocused()` (onboarding/_layout.tsx) and why
 * the mode is re-applied and awaited on every (re)start below rather than
 * written once on mount: playback must never run under someone else's
 * session mode.
 */
export const useOnboardingMusic = (
  enabled: boolean = true
): { isPlaying: boolean } => {
  const onboardingSoundEnabled = useSettingsStore(
    (s) => s.onboardingSoundEnabled
  );
  const player = useAudioPlayer(
    require('@/../assets/audio/music/midnight-campfire.mp3')
  );
  const status = useAudioPlayerStatus(player);

  useEffect(() => {
    player.loop = true;
    player.volume = TRACK_VOLUME;
  }, [player]);

  useEffect(() => {
    if (!enabled || !onboardingSoundEnabled) {
      player.pause();
      return;
    }

    let cancelled = false;

    const start = async () => {
      try {
        await setAudioModeAsync({
          playsInSilentMode: false,
          shouldPlayInBackground: false,
        });
      } catch (error) {
        // Never let session config block the music: the worst case is a track
        // playing under the previously configured mode, which is still better
        // than silent onboarding. StoryNarration.tsx handles its own
        // setAudioModeAsync rejection the same way.
        console.warn('Failed to configure the onboarding audio session', error);
      }
      // The user can mute (or leave the flow) while the call above is still in
      // flight; without this the continuation would start the music again
      // right after the re-run of this effect paused it.
      if (cancelled) return;
      // The user can also LOCK THE PHONE while the call above is in flight —
      // first-quest explicitly tells them to. iOS refuses to activate an
      // audio session for a backgrounded app, so play() would throw
      // (REACT-NATIVE-71). Backgrounded music isn't wanted anyway: skip, and
      // let the next enabled/focus change start playback back in the flow.
      // `=== 'background'`, NOT `!== 'active'`: currentState is null until
      // the native module reports in (and 'unknown' on some Android
      // launches), so only a KNOWN background state may suppress playback —
      // the catch below covers whatever slips through.
      if (AppState.currentState === 'background') return;
      try {
        player.play();
      } catch (error) {
        // The check above can't fully close the window — the app can
        // background between it and this synchronous native call, and iOS
        // then throws "Session activation failed" (REACT-NATIVE-71). Ambient
        // music failing to start must never surface as an unhandled
        // rejection.
        console.warn('Failed to start the onboarding music', error);
      }
    };
    start();

    return () => {
      cancelled = true;
    };
  }, [enabled, onboardingSoundEnabled, player]);

  return { isPlaying: status.playing ?? false };
};
