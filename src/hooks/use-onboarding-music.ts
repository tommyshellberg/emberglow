import {
  setAudioModeAsync,
  useAudioPlayer,
  useAudioPlayerStatus,
} from 'expo-audio';
import { useEffect } from 'react';

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
 * This is the only other `setAudioModeAsync` call site in the app besides
 * StoryNarration's; the two can't be mounted at once (onboarding and
 * first-quest-result are sibling routes — Expo Router unmounts this layout,
 * and this player with it, before narration can ever mount), so there's no
 * last-write-wins conflict between the two calls.
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
    setAudioModeAsync({
      playsInSilentMode: false,
      shouldPlayInBackground: false,
    });
  }, []);

  useEffect(() => {
    player.loop = true;
    player.volume = TRACK_VOLUME;
  }, [player]);

  useEffect(() => {
    if (enabled && onboardingSoundEnabled) {
      player.play();
    } else {
      player.pause();
    }
  }, [enabled, onboardingSoundEnabled, player]);

  return { isPlaying: status.playing ?? false };
};
