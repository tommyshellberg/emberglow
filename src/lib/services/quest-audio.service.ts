import type { AudioPlayer } from 'expo-audio';
import { createAudioPlayer, setAudioModeAsync } from 'expo-audio';

import { audioCacheService } from '@/lib/services/audio-cache.service';
import { getItem, setItem } from '@/lib/storage';

/**
 * S3-relative path to the single looped ambient track (Task 14). NOTE: this
 * is a code-side constant only — the actual audio asset must be uploaded to
 * S3 at this path (ops task, not code). If it's missing,
 * `audioCacheService.getAudioSource` resolves to `null` and `playAmbient()`
 * silently skips playback rather than crashing.
 */
const AMBIENT_TRACK_PATH = 'ambient/emberglow-nights.mp3';

export const MUTED_KEY = 'quest-audio-muted';

const FULL_VOLUME = 1;

let player: AudioPlayer | null = null;

function isMuted(): boolean {
  return !!getItem(MUTED_KEY);
}

async function playAmbient(): Promise<void> {
  try {
    if (isMuted()) {
      return;
    }

    await setAudioModeAsync({
      shouldPlayInBackground: false,
      playsInSilentMode: true,
    });

    const src = await audioCacheService.getAudioSource(AMBIENT_TRACK_PATH);
    if (!src) {
      console.warn(
        `quest-audio: no ambient audio source found at ${AMBIENT_TRACK_PATH}; skipping playback`
      );
      return;
    }

    if (!player) {
      player = createAudioPlayer(src);
    } else {
      player.replace(src);
    }

    player.loop = true;
    player.volume = FULL_VOLUME;
    player.play();
  } catch (error) {
    console.warn('quest-audio: failed to play ambient track', error);
  }
}

async function fadeOut(): Promise<void> {
  try {
    if (!player) {
      return;
    }
    // A ramped fade is nice-to-have; a direct pause is simple and robust
    // under test and still satisfies the "music stops when leaving IN_APP"
    // requirement without a timer to clean up.
    player.volume = 0;
    player.pause();
  } catch (error) {
    console.warn('quest-audio: failed to fade out ambient track', error);
  }
}

async function resume(): Promise<void> {
  try {
    if (isMuted() || !player) {
      return;
    }
    player.volume = FULL_VOLUME;
    player.play();
  } catch (error) {
    console.warn('quest-audio: failed to resume ambient track', error);
  }
}

async function setMuted(muted: boolean): Promise<void> {
  try {
    setItem(MUTED_KEY, muted);
    if (muted) {
      player?.pause();
    } else {
      await resume();
    }
  } catch (error) {
    console.warn('quest-audio: failed to set muted state', error);
  }
}

function teardown(): void {
  try {
    player?.remove();
  } catch (error) {
    console.warn('quest-audio: failed to tear down ambient player', error);
  } finally {
    player = null;
  }
}

export const questAudio = {
  playAmbient,
  fadeOut,
  resume,
  setMuted,
  teardown,
};
