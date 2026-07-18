/**
 * Manual Jest mock for expo-audio.
 *
 * jest-expo 53 only auto-mocks native modules that ship a `mocks/` directory
 * inside their own package (see `attemptLookup` in jest-expo's
 * `preset/setup.js`) or that appear in its built-in moduleMocks list.
 * expo-audio has neither, so `requireNativeModule('ExpoAudio')` throws the
 * moment anything imports it. Hence this file — same reason the expo-av mock
 * it replaces existed.
 *
 * Unlike that mock, this one *succeeds* rather than throwing. The expo-av mock
 * had to throw synchronously because StoryNarration awaited audio setup inside
 * its mount effect, so a promise-resolving mock pushed the follow-up state
 * updates outside RNTL's act() scope. StoryNarration no longer does that: the
 * async source lookup is isolated in the outer component and the player itself
 * is created synchronously by `useAudioPlayer` from an already-resolved source.
 * That makes a working mock safe, and lets tests actually exercise playback
 * instead of only ever hitting the error branch.
 *
 * Status is module state rather than a per-player field so tests can stage a
 * playback state before render via `__setAudioStatus`. Call `__resetAudioMock`
 * in `beforeEach` — `clearMocks` won't reset the status object.
 */
import type { AudioStatus } from 'expo-audio';

const defaultStatus = (): AudioStatus =>
  ({
    id: 0,
    isLoaded: true,
    playing: false,
    didJustFinish: false,
    isBuffering: false,
    currentTime: 0,
    duration: 0,
    loop: false,
    mute: false,
    playbackRate: 1,
    shouldCorrectPitch: false,
    playbackState: 'readyToPlay',
    timeControlStatus: 'paused',
    reasonForWaitingToPlay: undefined,
  }) as unknown as AudioStatus;

let status: AudioStatus = defaultStatus();

/** Single player instance — referentially stable across re-renders. */
export const mockPlayer = {
  play: jest.fn(),
  pause: jest.fn(),
  seekTo: jest.fn(async () => {}),
  replace: jest.fn(),
  remove: jest.fn(),
  setPlaybackRate: jest.fn(),
};

export const useAudioPlayer = jest.fn(() => mockPlayer);
export const useAudioPlayerStatus = jest.fn(() => status);
export const createAudioPlayer = jest.fn(() => mockPlayer);
export const setAudioModeAsync = jest.fn(async () => {});

/** Stage playback status for the next render. */
export const __setAudioStatus = (next: Partial<AudioStatus>) => {
  status = { ...status, ...next };
};

export const __resetAudioMock = () => {
  status = defaultStatus();
  Object.values(mockPlayer).forEach((fn) => fn.mockClear());
  useAudioPlayer.mockClear();
  useAudioPlayerStatus.mockClear();
  createAudioPlayer.mockClear();
  setAudioModeAsync.mockClear();
};
