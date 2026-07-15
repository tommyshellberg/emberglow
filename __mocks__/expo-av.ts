/**
 * Manual Jest mock for expo-av.
 *
 * jest-expo 53's auto-mocking only covers native modules that ship a
 * `mocks/` directory inside their own package (see jest-expo's
 * `attemptLookup` in `preset/setup.js`) or that are in its own built-in
 * moduleMocks list. expo-av (deprecated in SDK 53 in favor of
 * expo-audio/expo-video, migration tracked separately) has neither, so
 * `requireNativeModule('ExponentAV')` throws "Cannot find native module
 * 'ExponentAV'" the moment anything imports `expo-av`.
 *
 * `src/components/StoryNarration.tsx` (still on expo-av; its migration is
 * out of scope here) calls `Audio.setAudioModeAsync` fire-and-forget inside
 * a `useEffect`, with no test exercising it directly. Under the *previous*
 * SDK the native module was simply unavailable in the Jest environment, so
 * calling `Audio.setAudioModeAsync(...)` threw a synchronous TypeError that
 * StoryNarration's try/catch swallowed within the same synchronous mount
 * flush - safely inside RNTL's act() boundary.
 *
 * A mock that instead resolves via a real Promise (the natural first
 * instinct) changes that: the `await` suspends past act()'s synchronous
 * flush, so StoryNarration's later `setLoadError`/`setIsLoading` calls land
 * outside any act() scope ("act" warnings), and further down the chain hits
 * touches unmocked services (audioCacheService -> axios/expo-file-system)
 * that were never meant to run in these tests, corrupting later renders.
 * Throwing synchronously here reproduces the old, harmless failure mode
 * instead: fails immediately, inside the same tick, caught by
 * StoryNarration itself.
 */
const throwUnavailable = () => {
  throw new TypeError('Audio native module is not available in tests.');
};

const Audio = {
  setAudioModeAsync: jest.fn(throwUnavailable),
  Sound: {
    createAsync: jest.fn(throwUnavailable),
  },
};

module.exports = {
  Audio,
};
