// Mocks are hoisted above imports by babel-jest, so they are in place before
// the singleton's constructor runs on import. Mocked at the /legacy subpath
// to match the service's SDK-54 bridge import (expo-file-system/legacy).
jest.mock('expo-file-system/legacy', () => ({
  cacheDirectory: 'file:///cache/',
  getInfoAsync: jest.fn(),
  makeDirectoryAsync: jest.fn(),
  downloadAsync: jest.fn(),
  readDirectoryAsync: jest.fn(),
  deleteAsync: jest.fn(),
}));
jest.mock('@/api/common/client', () => ({ apiClient: { get: jest.fn() } }));
jest.mock('@/api/common/provisional-client', () => ({
  provisionalApiClient: { get: jest.fn() },
}));
jest.mock('@/lib/auth/utils', () => ({ getToken: jest.fn(() => null) }));
jest.mock('@/lib/storage', () => ({
  getItem: jest.fn(() => null),
  setItem: jest.fn(),
}));

import { audioCacheService } from './audio-cache.service';

const fs = jest.requireMock('expo-file-system/legacy') as {
  cacheDirectory: string;
  getInfoAsync: jest.Mock;
  makeDirectoryAsync: jest.Mock;
  downloadAsync: jest.Mock;
  readDirectoryAsync: jest.Mock;
  deleteAsync: jest.Mock;
};
const { apiClient } = jest.requireMock('@/api/common/client') as {
  apiClient: { get: jest.Mock };
};

const CACHE_DIR = 'file:///cache/audio/';
const SIGNED_URL = 'https://s3.example.com/signed/audio.mp3?sig=abc123';

// Tracks whether the OS-managed cache directory currently exists. The mocked
// FileSystem below reads this so a test can simulate Android purging the dir.
let dirExists = true;

beforeEach(() => {
  jest.clearAllMocks();
  dirExists = true;

  // getInfoAsync: report the cache dir per `dirExists`; treat any other path
  // (i.e. an already-downloaded local file) as present.
  fs.getInfoAsync.mockImplementation(async (uri: string) => {
    if (uri === CACHE_DIR) {
      return { exists: dirExists };
    }
    return { exists: true };
  });
  fs.makeDirectoryAsync.mockImplementation(async () => {
    dirExists = true;
  });
  // Mirror expo-file-system: downloadAsync rejects when the destination's
  // parent directory does not exist.
  fs.downloadAsync.mockImplementation(async (_url: string, dest: string) => {
    if (!dirExists) {
      throw new Error("Destination directory doesn't exist");
    }
    return { status: 200, uri: dest };
  });
  fs.readDirectoryAsync.mockResolvedValue([]);
  fs.deleteAsync.mockResolvedValue(undefined);

  apiClient.get.mockResolvedValue({ data: { audioUrl: SIGNED_URL } });

  // Reset the singleton's in-memory cache between tests.
  (
    audioCacheService as unknown as { cache: Map<string, unknown> }
  ).cache.clear();
});

describe('audio-cache.service', () => {
  describe('Bug 1: cache directory is ensured before every download', () => {
    it('creates the missing cache dir immediately before downloading (self-heal)', async () => {
      // Simulate the OS having purged the cache dir after construction.
      dirExists = false;

      const result = await audioCacheService.getAudioSource(
        'storylines/vaedros/quest-7.mp3'
      );

      // Directory recreated with intermediates before the download runs.
      expect(fs.makeDirectoryAsync).toHaveBeenCalledWith(CACHE_DIR, {
        intermediates: true,
      });
      const mkdirOrder = fs.makeDirectoryAsync.mock.invocationCallOrder[0];
      const downloadOrder = fs.downloadAsync.mock.invocationCallOrder[0];
      expect(mkdirOrder).toBeLessThan(downloadOrder);

      // Download succeeded → a local file uri is returned.
      expect(result).toEqual({
        uri: `${CACHE_DIR}storylines_vaedros_quest_7_mp3.mp3`,
      });
    });

    it('recreates the cache dir on a later download after the OS purges it', async () => {
      dirExists = false;
      const first = await audioCacheService.getAudioSource(
        'storylines/vaedros/quest-1.mp3'
      );
      expect(first).toEqual({
        uri: `${CACHE_DIR}storylines_vaedros_quest_1_mp3.mp3`,
      });
      expect(fs.makeDirectoryAsync).toHaveBeenCalledTimes(1);

      // OS purges the cache dir again mid-session.
      dirExists = false;
      const second = await audioCacheService.getAudioSource(
        'storylines/vaedros/quest-2.mp3'
      );
      expect(second).toEqual({
        uri: `${CACHE_DIR}storylines_vaedros_quest_2_mp3.mp3`,
      });
      expect(fs.makeDirectoryAsync).toHaveBeenCalledTimes(2);
    });
  });

  describe('Bug 2: in-memory fallback caches the signed URL', () => {
    it('reuses the cached signed URL without a second network request', async () => {
      // Force the local-download path to fail so we hit the in-memory fallback.
      fs.downloadAsync.mockRejectedValue(new Error('download failed'));

      const first = await audioCacheService.getAudioSource(
        'storylines/vaedros/quest-3.mp3'
      );
      expect(first).toEqual({ uri: SIGNED_URL });

      const callsAfterFirst = apiClient.get.mock.calls.length;
      expect(callsAfterFirst).toBeGreaterThan(0);

      const second = await audioCacheService.getAudioSource(
        'storylines/vaedros/quest-3.mp3'
      );
      expect(second).toEqual({ uri: SIGNED_URL });
      // Cache hit → no additional network request.
      expect(apiClient.get.mock.calls.length).toBe(callsAfterFirst);
    });

    it('re-fetches the signed URL after the cached entry expires', async () => {
      jest.useFakeTimers();
      const start = new Date('2026-07-16T00:00:00.000Z').getTime();
      jest.setSystemTime(start);

      fs.downloadAsync.mockRejectedValue(new Error('download failed'));

      await audioCacheService.getAudioSource('storylines/vaedros/quest-4.mp3');
      const callsAfterFirst = apiClient.get.mock.calls.length;

      // Advance past the client-side signed-URL window (must be < the 1h S3 TTL).
      jest.setSystemTime(start + 51 * 60 * 1000);

      await audioCacheService.getAudioSource('storylines/vaedros/quest-4.mp3');
      expect(apiClient.get.mock.calls.length).toBeGreaterThan(callsAfterFirst);

      jest.useRealTimers();
    });
  });
});
