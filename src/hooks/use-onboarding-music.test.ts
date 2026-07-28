import { act, renderHook, waitFor } from '@testing-library/react-native';

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
});

describe('useOnboardingMusic', () => {
  it('starts the music and loops it at 0.35 volume', () => {
    renderHook(() => useOnboardingMusic());

    expect(mockPlayer.loop).toBe(true);
    expect(mockPlayer.volume).toBe(0.35);
    expect(mockPlayer.play).toHaveBeenCalled();
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

  it('resumes playback without restarting when the user unmutes', () => {
    renderHook(() => useOnboardingMusic());
    act(() => useSettingsStore.setState({ onboardingSoundEnabled: false }));
    mockPlayer.play.mockClear();
    mockPlayer.seekTo.mockClear();

    act(() => useSettingsStore.setState({ onboardingSoundEnabled: true }));

    expect(mockPlayer.play).toHaveBeenCalled();
    expect(mockPlayer.seekTo).not.toHaveBeenCalledWith(0); // resumed, not restarted
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

  it('does not start when disabled, e.g. while onboarding is already complete', () => {
    renderHook(() => useOnboardingMusic(false));

    expect(mockPlayer.play).not.toHaveBeenCalled();
  });

  it('returns isPlaying reflecting the player status', () => {
    __setAudioStatus({ playing: true });

    const { result } = renderHook(() => useOnboardingMusic());

    expect(result.current.isPlaying).toBe(true);
  });
});
