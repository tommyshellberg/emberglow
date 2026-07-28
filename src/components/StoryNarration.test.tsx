import React from 'react';

import { act, render, screen, setup, waitFor } from '@/lib/test-utils';
import { useSettingsStore } from '@/store/settings-store';
import { type StoryQuestTemplate } from '@/store/types';

import { StoryNarration } from './StoryNarration';

// Both lines are load-bearing. jest.mock() swaps expo-audio for the manual
// mock in __mocks__/ for every importer (including the component); requireMock
// hands back that same instance. Importing the mock by path instead would
// create a second registry entry, so staged status would never reach the
// component.
jest.mock('expo-audio');
const audioMock = jest.requireMock(
  'expo-audio'
) as typeof import('../../__mocks__/expo-audio');
const { __setAudioStatus, __resetAudioMock } = audioMock;

// StoryNarration pauses playback on blur via useFocusEffect. The real hook
// reaches into expo-router's navigation context, which test-utils' wrapper
// doesn't provide; run the effect once on mount and keep its cleanup.
jest.mock('expo-router', () => ({
  useFocusEffect: (cb: () => void | (() => void)) => {
    // Required inside the factory: jest.mock is hoisted above the imports.
    // eslint-disable-next-line @typescript-eslint/no-var-requires, react-hooks/rules-of-hooks
    require('react').useEffect(cb, [cb]);
  },
}));

jest.mock('@/lib/services/audio-cache.service', () => ({
  audioCacheService: {
    getAudioSource: jest.fn(),
  },
}));

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { audioCacheService } = require('@/lib/services/audio-cache.service');

const quest = {
  id: 'quest-1',
  customId: 'quest-1',
  mode: 'story',
  title: 'The Ember Path',
} as unknown as StoryQuestTemplate;

beforeEach(() => {
  __resetAudioMock();
  audioCacheService.getAudioSource.mockResolvedValue({
    uri: 'file:///narration.mp3',
  });
  useSettingsStore.setState({ narratorVoice: null });
});

describe('StoryNarration', () => {
  it('formats the time label from a status reported in seconds', async () => {
    // expo-audio reports seconds; expo-av reported milliseconds. 185s = 3:05.
    __setAudioStatus({ isLoaded: true, duration: 185, currentTime: 0 });

    render(<StoryNarration quest={quest} />);

    expect(await screen.findByText('0:00 / 3:05')).toBeTruthy();
  });

  it('rewinds to the start when a chapter finishes', async () => {
    // expo-audio parks the player at the end rather than rewinding, so without
    // an explicit seek the play button would grey out after every chapter.
    __setAudioStatus({
      isLoaded: true,
      duration: 185,
      currentTime: 185,
      didJustFinish: true,
    });

    render(<StoryNarration quest={quest} />);
    await screen.findByText('Listen to this chapter');

    await waitFor(() =>
      expect(audioMock.mockPlayer.seekTo).toHaveBeenCalledWith(0)
    );
  });

  it('plays when paused and pauses when playing', async () => {
    __setAudioStatus({ isLoaded: true, duration: 185, currentTime: 0 });

    const { user } = setup(<StoryNarration quest={quest} />);
    await screen.findByText('Listen to this chapter');

    await user.press(screen.getByTestId('narration-play-toggle'));
    expect(audioMock.mockPlayer.play).toHaveBeenCalledTimes(1);
    expect(audioMock.mockPlayer.pause).not.toHaveBeenCalled();
  });

  it('surfaces an error when the audio source cannot be resolved', async () => {
    audioCacheService.getAudioSource.mockResolvedValue(null);

    render(<StoryNarration quest={quest} />);

    expect(
      await screen.findByText('Failed to load audio narration')
    ).toBeTruthy();
  });

  it('requests the female path with male fallback when narratorVoice is female', async () => {
    useSettingsStore.setState({ narratorVoice: 'female' });

    render(<StoryNarration quest={quest} />);

    await waitFor(() => {
      // Exact strings, not a loose pattern: /quest-.*\.mp3$/ would also match
      // the female path itself (`.*` absorbs `1-female`), so it couldn't
      // distinguish a correct male fallback from a regression that passed
      // the primary path as both arguments.
      expect(audioCacheService.getAudioSource).toHaveBeenCalledWith(
        'storylines/vaedros/quest-1-female.mp3',
        'storylines/vaedros/quest-1.mp3'
      );
    });
  });

  it('re-resolves the source when the voice changes while mounted', async () => {
    useSettingsStore.setState({ narratorVoice: 'male' });

    render(<StoryNarration quest={quest} />);
    await waitFor(() =>
      expect(audioCacheService.getAudioSource).toHaveBeenCalled()
    );
    (audioCacheService.getAudioSource as jest.Mock).mockClear();

    act(() => {
      useSettingsStore.setState({ narratorVoice: 'female' });
    });

    await waitFor(() => {
      expect(audioCacheService.getAudioSource).toHaveBeenCalledWith(
        expect.stringContaining('-female.mp3'),
        expect.any(String)
      );
    });
  });
});
