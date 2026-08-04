import { act, renderHook, waitFor } from '@testing-library/react-native';
import { AppState, type AppStateStatus } from 'react-native';

import { useSettingsStore } from '@/store/settings-store';

import { useOnboardingMusic } from './use-onboarding-music';

// jest.mock() swaps expo-audio for the manual mock in __mocks__/ for every
// importer (including the hook); requireMock hands back that same instance.
// See StoryNarration.test.tsx for the same pattern.
jest.mock('expo-audio');
const audioMock = jest.requireMock(
  'expo-audio'
) as typeof import('../../__mocks__/expo-audio');
const { mockPlayer, setAudioModeAsync, __setAudioStatus, __resetAudioMock } =
  audioMock;

beforeEach(() => {
  // Delete BEFORE calling __resetAudioMock(), not after: `loop` and `volume`
  // are plain properties the hook assigns directly onto the shared,
  // module-scoped mockPlayer, so they survive into the next test unless
  // deleted here. Left in place, they don't just leak stale values — they
  // make __resetAudioMock() itself throw, because it does
  // `Object.values(mockPlayer).forEach(fn => fn.mockClear())`, and a leftover
  // `true`/`0.35` isn't a jest.fn(). (Confirmed by running the suite with the
  // deletes placed after __resetAudioMock(), as the brief's sketch shows:
  // every test after the first crashes with "fn.mockClear is not a
  // function".) Deleting first keeps mockPlayer's own properties all
  // jest.fn()s when __resetAudioMock() iterates them.
  delete (mockPlayer as Partial<Record<'loop' | 'volume', unknown>>).loop;
  delete (mockPlayer as Partial<Record<'loop' | 'volume', unknown>>).volume;
  __resetAudioMock();
  useSettingsStore.setState(useSettingsStore.getInitialState());
  // The backgrounded-app test overwrites this module-scoped value; reset it so
  // every other test provably runs the foreground branch of the guard rather
  // than inheriting whatever the previous test left behind.
  (AppState as { currentState: AppStateStatus }).currentState = 'active';
});

describe('useOnboardingMusic', () => {
  it('starts the music and loops it at 0.35 volume', async () => {
    renderHook(() => useOnboardingMusic());

    expect(mockPlayer.loop).toBe(true);
    expect(mockPlayer.volume).toBe(0.35);
    await waitFor(() => expect(mockPlayer.play).toHaveBeenCalled());
  });

  it('does not start when the user has already muted', () => {
    useSettingsStore.setState({ onboardingSoundEnabled: false });

    renderHook(() => useOnboardingMusic());

    expect(mockPlayer.play).not.toHaveBeenCalled();
  });

  // Split from the plan's bundled "pauses on mute and resumes rather than
  // restarting" test: one behavior per `it` so each direction of the mute
  // guard can be mutated independently (assertion hygiene rule 4).
  it('pauses playback when the user mutes', () => {
    renderHook(() => useOnboardingMusic());

    act(() => useSettingsStore.setState({ onboardingSoundEnabled: false }));

    expect(mockPlayer.pause).toHaveBeenCalled();
  });

  // `play()` on an already-loaded expo-audio player resumes from its current
  // position; the hook owns one player for the whole flow and never calls
  // seekTo or replace, so there is no restart path to assert against here. (An
  // earlier version asserted `seekTo` was never called with 0 — an assertion
  // no mutation of this hook could ever make fail.) The property that could
  // actually regress is layout-level: the player surviving screen changes,
  // covered by src/app/onboarding/_layout.test.tsx.
  it('resumes playback when the user unmutes', async () => {
    renderHook(() => useOnboardingMusic());
    act(() => useSettingsStore.setState({ onboardingSoundEnabled: false }));
    mockPlayer.play.mockClear();

    act(() => useSettingsStore.setState({ onboardingSoundEnabled: true }));

    await waitFor(() => expect(mockPlayer.play).toHaveBeenCalled());
  });

  it('configures the session to respect the silent switch', async () => {
    renderHook(() => useOnboardingMusic());

    // Exact object match, not objectContaining: the hook only ever passes
    // these two keys, so the expected value is fully deterministic
    // (assertion hygiene rule 2).
    await waitFor(() =>
      expect(setAudioModeAsync).toHaveBeenCalledWith({
        playsInSilentMode: false,
        shouldPlayInBackground: false,
      })
    );
  });

  // The session mode is global and last-write-wins: StoryNarration sets
  // `playsInSilentMode: true` for narration, and onboarding can run again
  // afterwards (sign-out, re-onboarding). Setting the mode in a separate
  // fire-and-forget effect from the one that calls play() left the first
  // seconds of music governed by whoever wrote the mode last.
  it('waits for the audio mode to apply before starting playback', async () => {
    let applyMode = () => {};
    setAudioModeAsync.mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          applyMode = () => resolve();
        })
    );

    renderHook(() => useOnboardingMusic());

    expect(mockPlayer.play).not.toHaveBeenCalled();
    // Second half of the same behavior, and not optional: without it a hook
    // that never plays at all would satisfy the assertion above.
    await act(async () => applyMode());
    expect(mockPlayer.play).toHaveBeenCalled();
  });

  it('does not start playback if the user mutes while the audio mode is still being applied', async () => {
    let applyMode = () => {};
    setAudioModeAsync.mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          applyMode = () => resolve();
        })
    );
    renderHook(() => useOnboardingMusic());

    act(() => useSettingsStore.setState({ onboardingSoundEnabled: false }));
    await act(async () => applyMode());

    expect(mockPlayer.play).not.toHaveBeenCalled();
  });

  it('still starts playback when configuring the audio mode fails', async () => {
    setAudioModeAsync.mockRejectedValueOnce(new Error('audio session busy'));

    renderHook(() => useOnboardingMusic());

    // A rejected session config must not swallow the music (nor surface as an
    // unhandled rejection) — StoryNarration.tsx awaits inside try/catch for
    // the same reason.
    await waitFor(() => expect(mockPlayer.play).toHaveBeenCalled());
  });

  // REACT-NATIVE-71: first-quest tells the user to lock their phone, so the
  // start() continuation can run with the app backgrounded — where iOS
  // refuses to activate the audio session and expo-audio's sync play() throws.
  // Music while backgrounded isn't wanted anyway; the hook must not ask.
  it('does not start playback while the app is backgrounded', async () => {
    (AppState as { currentState: AppStateStatus }).currentState = 'background';

    renderHook(() => useOnboardingMusic());
    // Flush the async start() continuation past the awaited session config.
    await act(async () => {});

    expect(mockPlayer.play).not.toHaveBeenCalled();
  });

  // AppState.currentState is null until the native module reports in (and
  // 'unknown' on some Android launches). A guard written as `!== 'active'`
  // would silently skip the music on every cold start — only a KNOWN
  // background state may suppress playback.
  it('starts playback when the app state is still indeterminate at cold start', async () => {
    (AppState as { currentState: AppStateStatus | null }).currentState = null;

    renderHook(() => useOnboardingMusic());

    await waitFor(() => expect(mockPlayer.play).toHaveBeenCalled());
  });

  // The AppState check narrows the window but can't close it: the app can
  // background between the check and the native call, and expo-audio's play()
  // is synchronous native code that throws when iOS refuses the session.
  // start() is fire-and-forget, so an uncaught throw becomes an unhandled
  // rejection — exactly the REACT-NATIVE-71 Sentry event.
  it('warns instead of rejecting when the OS refuses playback', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    mockPlayer.play.mockImplementationOnce(() => {
      throw new Error('Session activation failed');
    });

    renderHook(() => useOnboardingMusic());
    await act(async () => {});

    expect(warn).toHaveBeenCalledWith(
      'Failed to start the onboarding music',
      expect.any(Error)
    );
    warn.mockRestore();
  });

  it('does not start when disabled, e.g. while onboarding is already complete', () => {
    renderHook(() => useOnboardingMusic(false));

    expect(mockPlayer.play).not.toHaveBeenCalled();
  });

  it('returns isPlaying reflecting the player status', () => {
    __setAudioStatus({ playing: true });

    const { result } = renderHook(() => useOnboardingMusic());

    expect(result.current.isPlaying).toBe(true);
  });

  // Counterpart to the test above, and the only thing standing between this
  // file and a `return { isPlaying: true }` implementation passing all of it:
  // every other test here stages `playing: true` or ignores the return value.
  it('returns isPlaying false while the player is not playing', () => {
    __setAudioStatus({ playing: false });

    const { result } = renderHook(() => useOnboardingMusic());

    expect(result.current.isPlaying).toBe(false);
  });
});
