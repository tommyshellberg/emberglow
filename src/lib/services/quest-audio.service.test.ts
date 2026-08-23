import { createAudioPlayer, setAudioModeAsync } from 'expo-audio';

import { audioCacheService } from '@/lib/services/audio-cache.service';
import { getItem, setItem } from '@/lib/storage';

import { questAudio } from './quest-audio.service';

const mockPlayer = {
  play: jest.fn(),
  pause: jest.fn(),
  remove: jest.fn(),
  replace: jest.fn(),
  seekTo: jest.fn(),
  volume: 1,
  loop: false,
};

jest.mock('expo-audio', () => ({
  createAudioPlayer: jest.fn(() => mockPlayer),
  setAudioModeAsync: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@/lib/services/audio-cache.service', () => ({
  audioCacheService: {
    getAudioSource: jest.fn(),
  },
}));

jest.mock('@/lib/storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
}));

describe('quest-audio.service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPlayer.volume = 1;
    mockPlayer.loop = false;
  });

  afterEach(() => {
    questAudio.teardown();
  });

  it('resolves the ambient track through the audio cache and plays looped', async () => {
    (audioCacheService.getAudioSource as jest.Mock).mockResolvedValue({
      uri: 'file://ambient.mp3',
    });
    (getItem as jest.Mock).mockReturnValue(false); // not muted

    await questAudio.playAmbient();

    expect(audioCacheService.getAudioSource).toHaveBeenCalled();
    expect(setAudioModeAsync).toHaveBeenCalledWith(
      expect.objectContaining({ shouldPlayInBackground: false })
    );
    expect(createAudioPlayer).toHaveBeenCalled();
    expect(mockPlayer.loop).toBe(true);
    expect(mockPlayer.play).toHaveBeenCalled();
  });

  it('does not play when muted', async () => {
    (getItem as jest.Mock).mockReturnValue(true);

    await questAudio.playAmbient();

    expect(mockPlayer.play).not.toHaveBeenCalled();
  });

  it('does not crash and skips playback when the audio asset is missing', async () => {
    (audioCacheService.getAudioSource as jest.Mock).mockResolvedValue(null);
    (getItem as jest.Mock).mockReturnValue(false);

    await expect(questAudio.playAmbient()).resolves.not.toThrow();

    expect(mockPlayer.play).not.toHaveBeenCalled();
  });

  it('fadeOut pauses the player', async () => {
    (audioCacheService.getAudioSource as jest.Mock).mockResolvedValue({
      uri: 'file://ambient.mp3',
    });
    (getItem as jest.Mock).mockReturnValue(false);

    await questAudio.playAmbient();
    await questAudio.fadeOut();

    expect(mockPlayer.pause).toHaveBeenCalled();
  });

  it('setMuted persists and stops playback when muting', async () => {
    (audioCacheService.getAudioSource as jest.Mock).mockResolvedValue({
      uri: 'file://ambient.mp3',
    });
    (getItem as jest.Mock).mockReturnValue(false);

    await questAudio.playAmbient();
    await questAudio.setMuted(true);

    expect(setItem).toHaveBeenCalledWith('quest-audio-muted', true);
    expect(mockPlayer.pause).toHaveBeenCalled();
  });

  it('setMuted(false) persists and resumes playback', async () => {
    (audioCacheService.getAudioSource as jest.Mock).mockResolvedValue({
      uri: 'file://ambient.mp3',
    });
    (getItem as jest.Mock).mockReturnValue(false);

    await questAudio.playAmbient();
    await questAudio.setMuted(false);

    expect(setItem).toHaveBeenCalledWith('quest-audio-muted', false);
    expect(mockPlayer.play).toHaveBeenCalledTimes(2);
  });

  it('guards against thrown errors from the audio cache without crashing', async () => {
    (audioCacheService.getAudioSource as jest.Mock).mockRejectedValue(
      new Error('network down')
    );
    (getItem as jest.Mock).mockReturnValue(false);

    await expect(questAudio.playAmbient()).resolves.not.toThrow();
    expect(mockPlayer.play).not.toHaveBeenCalled();
  });

  it('teardown removes the player', async () => {
    (audioCacheService.getAudioSource as jest.Mock).mockResolvedValue({
      uri: 'file://ambient.mp3',
    });
    (getItem as jest.Mock).mockReturnValue(false);

    await questAudio.playAmbient();
    questAudio.teardown();

    expect(mockPlayer.remove).toHaveBeenCalled();
  });
});
