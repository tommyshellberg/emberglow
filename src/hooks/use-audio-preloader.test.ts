import { act, renderHook, waitFor } from '@testing-library/react-native';

import { useNextAvailableQuests } from '@/api/quest/use-next-available-quests';
import { audioCacheService } from '@/lib/services/audio-cache.service';
import { useSettingsStore } from '@/store/settings-store';

import { useAudioPreloader } from './use-audio-preloader';

jest.mock('@/api/quest/use-next-available-quests', () => ({
  useNextAvailableQuests: jest.fn(),
}));

jest.mock('@/lib/services/audio-cache.service', () => ({
  audioCacheService: {
    preloadAudio: jest.fn().mockResolvedValue(undefined),
    getCacheStats: jest.fn(() => ({ size: 0, maxSize: 50 })),
    clearCache: jest.fn(),
  },
}));

const mockedUseNextAvailableQuests = useNextAvailableQuests as jest.Mock;
const mockedPreloadAudio = audioCacheService.preloadAudio as jest.Mock;

// Fixed object reference reused across every mockReturnValue call in this
// file. If a test needed a distinct instance, mockReturnValue-ing a new
// object literal on every render would make `questsData` change identity
// independent of narratorVoice, which would let the re-preload test pass
// even if `narratorVoice` were dropped from the effect's dep array.
const QUESTS_DATA = {
  quests: [{ customId: 'quest-2' }, { customId: 'quest-3' }],
  options: [{ nextQuest: { customId: 'quest-5' } }],
  hasMoreQuests: true,
  storylineComplete: false,
};

beforeEach(() => {
  jest.clearAllMocks();
  mockedPreloadAudio.mockResolvedValue(undefined);
  // Female, not null: with no character in the store, null ALSO resolves to
  // 'male' (see getEffectiveNarratorVoice), which would make the "explicit
  // male" test below pass even if the resolver ignored the explicit setting
  // entirely. Defaulting to the opposite voice forces that test to prove the
  // explicit value actually wins.
  useSettingsStore.setState({ narratorVoice: 'female' });
  mockedUseNextAvailableQuests.mockReturnValue({
    data: QUESTS_DATA,
    isSuccess: true,
  });
});

describe('useAudioPreloader', () => {
  it('preloads voice-suffixed paths with male fallbacks when narratorVoice is female', async () => {
    useSettingsStore.setState({ narratorVoice: 'female' });

    renderHook(() => useAudioPreloader());

    await waitFor(() => {
      expect(mockedPreloadAudio).toHaveBeenCalledWith([
        {
          primaryPath: 'storylines/vaedros/quest-2-female.mp3',
          fallbackPath: 'storylines/vaedros/quest-2.mp3',
        },
        {
          primaryPath: 'storylines/vaedros/quest-3-female.mp3',
          fallbackPath: 'storylines/vaedros/quest-3.mp3',
        },
        {
          primaryPath: 'storylines/vaedros/quest-5-female.mp3',
          fallbackPath: 'storylines/vaedros/quest-5.mp3',
        },
      ]);
    });
  });

  it('preloads unsuffixed paths with no fallback when narratorVoice is male', async () => {
    useSettingsStore.setState({ narratorVoice: 'male' });

    renderHook(() => useAudioPreloader());

    await waitFor(() => {
      expect(mockedPreloadAudio).toHaveBeenCalledWith([
        { primaryPath: 'storylines/vaedros/quest-2.mp3', fallbackPath: null },
        { primaryPath: 'storylines/vaedros/quest-3.mp3', fallbackPath: null },
        { primaryPath: 'storylines/vaedros/quest-5.mp3', fallbackPath: null },
      ]);
    });
  });

  it('dedupes by primaryPath when the same quest appears twice', async () => {
    mockedUseNextAvailableQuests.mockReturnValue({
      data: {
        quests: [{ customId: 'quest-2' }],
        options: [{ nextQuest: { customId: 'quest-2' } }],
        hasMoreQuests: true,
        storylineComplete: false,
      },
      isSuccess: true,
    });
    useSettingsStore.setState({ narratorVoice: 'male' });

    renderHook(() => useAudioPreloader());

    await waitFor(() => {
      // A single-element array proves the duplicate collapsed rather than
      // merely proving the first item is present (arrayContaining would not
      // catch a duplicate slipping through).
      expect(mockedPreloadAudio).toHaveBeenCalledWith([
        { primaryPath: 'storylines/vaedros/quest-2.mp3', fallbackPath: null },
      ]);
    });
  });

  it('re-preloads in the new voice when narratorVoice changes while mounted', async () => {
    useSettingsStore.setState({ narratorVoice: 'male' });

    renderHook(() => useAudioPreloader());
    await waitFor(() => expect(mockedPreloadAudio).toHaveBeenCalled());
    mockedPreloadAudio.mockClear();

    act(() => {
      useSettingsStore.setState({ narratorVoice: 'female' });
    });

    await waitFor(() => {
      expect(mockedPreloadAudio).toHaveBeenCalledWith([
        {
          primaryPath: 'storylines/vaedros/quest-2-female.mp3',
          fallbackPath: 'storylines/vaedros/quest-2.mp3',
        },
        {
          primaryPath: 'storylines/vaedros/quest-3-female.mp3',
          fallbackPath: 'storylines/vaedros/quest-3.mp3',
        },
        {
          primaryPath: 'storylines/vaedros/quest-5-female.mp3',
          fallbackPath: 'storylines/vaedros/quest-5.mp3',
        },
      ]);
    });
  });
});
