// Mocks are hoisted above imports by babel-jest, so they are in place before
// the singleton's constructor runs on import. `File`/`Directory` are classes,
// not plain function exports, so the mock below re-implements them with
// module-private spies the tests configure/inspect via `__spies`. Everything
// the factory closes over must be declared inside it (babel-plugin-jest-hoist
// only allows out-of-scope references whose name starts with `mock`).
jest.mock('expo-file-system', () => {
  const createSpy = jest.fn();
  const listSpy = jest.fn(() => []);
  const deleteSpy = jest.fn();
  const downloadSpy = jest.fn();
  // uri -> simulated on-disk state. Absent entries default to "does not
  // exist" so tests only need to register the files they care about.
  const fileState = new Map();

  function uriOf(part) {
    return typeof part === 'string' ? part : part.uri;
  }
  function withTrailingSlash(uri) {
    return uri.endsWith('/') ? uri : `${uri}/`;
  }
  function joinUris(parts) {
    return parts.reduce((acc, part) => {
      const next = uriOf(part);
      return acc ? `${withTrailingSlash(acc)}${next}` : next;
    }, '');
  }

  class MockDirectory {
    constructor(...uris) {
      this.uri = withTrailingSlash(joinUris(uris));
    }
    create(options) {
      createSpy(this.uri, options);
    }
    list() {
      return listSpy(this.uri);
    }
    delete() {
      deleteSpy(this.uri);
    }
    get exists() {
      return fileState.get(this.uri)?.exists ?? false;
    }
  }

  class MockFile {
    constructor(...uris) {
      this.uri = joinUris(uris);
      this.name = this.uri.split('/').filter(Boolean).pop() ?? '';
    }
    delete() {
      deleteSpy(this.uri);
    }
    get exists() {
      return fileState.get(this.uri)?.exists ?? false;
    }
    get modificationTime() {
      return fileState.get(this.uri)?.modificationTime ?? null;
    }
    static downloadFileAsync(url, destination, options) {
      return downloadSpy(url, destination, options);
    }
  }

  return {
    File: MockFile,
    Directory: MockDirectory,
    Paths: { cache: new MockDirectory('file:///cache/') },
    __spies: { createSpy, listSpy, deleteSpy, downloadSpy, fileState },
  };
});
jest.mock('@/api/common/client', () => ({ apiClient: { get: jest.fn() } }));
jest.mock('@/api/common/provisional-client', () => ({
  provisionalApiClient: { get: jest.fn() },
}));
jest.mock('@/lib/auth/utils', () => ({ getToken: jest.fn(() => null) }));
jest.mock('@/lib/storage', () => ({
  getItem: jest.fn(() => null),
  setItem: jest.fn(),
}));

import { Directory, File } from 'expo-file-system';

import { posthogClient } from '@/lib/posthog';

import { audioCacheService } from './audio-cache.service';

const { createSpy, listSpy, deleteSpy, downloadSpy, fileState } =
  jest.requireMock('expo-file-system').__spies as {
    createSpy: jest.Mock;
    listSpy: jest.Mock;
    deleteSpy: jest.Mock;
    downloadSpy: jest.Mock;
    fileState: Map<
      string,
      { exists: boolean; modificationTime: number | null }
    >;
  };
const { apiClient } = jest.requireMock('@/api/common/client') as {
  apiClient: { get: jest.Mock };
};

const CACHE_DIR = 'file:///cache/audio/';
const SIGNED_URL = 'https://s3.example.com/signed/audio.mp3?sig=abc123';

// Tracks whether the OS-managed cache directory currently exists. The mocked
// downloadSpy below reads this so a test can simulate Android purging the
// dir; createSpy (the sync `Directory#create` call) "heals" it back to true,
// mirroring `idempotent: true` recreating a purged directory.
let dirExists = true;

beforeEach(() => {
  jest.clearAllMocks();
  dirExists = true;
  fileState.clear();

  createSpy.mockImplementation(() => {
    dirExists = true;
  });
  listSpy.mockReturnValue([]);
  deleteSpy.mockImplementation(() => {});
  // Mirror expo-file-system: File.downloadFileAsync rejects when the
  // destination's parent directory does not exist.
  downloadSpy.mockImplementation(async (_url: string, destination: File) => {
    if (!dirExists) {
      throw new Error("Destination directory doesn't exist");
    }
    fileState.set(destination.uri, {
      exists: true,
      modificationTime: Date.now(),
    });
    return destination;
  });

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

      // Directory recreated (idempotently) before the download runs.
      expect(createSpy).toHaveBeenCalledWith(CACHE_DIR, {
        intermediates: true,
        idempotent: true,
      });
      const createOrder =
        createSpy.mock.invocationCallOrder[
          createSpy.mock.invocationCallOrder.length - 1
        ];
      const downloadOrder =
        downloadSpy.mock.invocationCallOrder[
          downloadSpy.mock.invocationCallOrder.length - 1
        ];
      expect(createOrder).toBeLessThan(downloadOrder);

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
      expect(createSpy).toHaveBeenCalledTimes(1);

      // OS purges the cache dir again mid-session.
      dirExists = false;
      const second = await audioCacheService.getAudioSource(
        'storylines/vaedros/quest-2.mp3'
      );
      expect(second).toEqual({
        uri: `${CACHE_DIR}storylines_vaedros_quest_2_mp3.mp3`,
      });
      expect(createSpy).toHaveBeenCalledTimes(2);
    });
  });

  describe('Bug 2: in-memory fallback caches the signed URL', () => {
    it('reuses the cached signed URL without a second network request', async () => {
      // Force the local-download path to reject (non-2xx → UnableToDownload
      // under the new API) so we hit the in-memory fallback.
      downloadSpy.mockRejectedValue(new Error('UnableToDownload: 500'));

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

      downloadSpy.mockRejectedValue(new Error('UnableToDownload: 500'));

      await audioCacheService.getAudioSource('storylines/vaedros/quest-4.mp3');
      const callsAfterFirst = apiClient.get.mock.calls.length;

      // Advance past the client-side signed-URL window (must be < the 1h S3 TTL).
      jest.setSystemTime(start + 51 * 60 * 1000);

      await audioCacheService.getAudioSource('storylines/vaedros/quest-4.mp3');
      expect(apiClient.get.mock.calls.length).toBeGreaterThan(callsAfterFirst);

      jest.useRealTimers();
    });
  });

  describe('Bug 3: a failed download does not leave a partial file behind', () => {
    it('deletes the destination file if the OS wrote a partial file before the download rejected', async () => {
      // Android caveat: the response body streams directly into the
      // destination, so a request that fails mid-stream can leave a partial
      // file even though the promise rejects.
      downloadSpy.mockImplementation(
        async (_url: string, destination: File) => {
          fileState.set(destination.uri, {
            exists: true,
            modificationTime: Date.now(),
          });
          throw new Error('UnableToDownload: 500');
        }
      );

      await audioCacheService.getAudioSource('storylines/vaedros/quest-9.mp3');

      expect(deleteSpy).toHaveBeenCalledWith(
        `${CACHE_DIR}storylines_vaedros_quest_9_mp3.mp3`
      );
    });

    it('does not attempt to delete when no partial file was left behind', async () => {
      // Default downloadSpy rejection (iOS-style: nothing written on failure).
      downloadSpy.mockRejectedValue(new Error('UnableToDownload: 500'));

      await audioCacheService.getAudioSource('storylines/vaedros/quest-10.mp3');

      expect(deleteSpy).not.toHaveBeenCalledWith(
        `${CACHE_DIR}storylines_vaedros_quest_10_mp3.mp3`
      );
    });

    it('falls back to the streaming URL and surfaces the original download error when cleanup of the partial file also throws', async () => {
      const destinationUri = `${CACHE_DIR}storylines_vaedros_quest_11_mp3.mp3`;
      const downloadError = new Error('UnableToDownload: 500');
      const cleanupError = new Error('ENOENT: no such file or directory');

      downloadSpy.mockImplementation(
        async (_url: string, destination: File) => {
          fileState.set(destination.uri, {
            exists: true,
            modificationTime: Date.now(),
          });
          throw downloadError;
        }
      );
      // The file vanishes (e.g. an OS cache purge) between the exists check
      // and the delete() call, so delete() itself throws.
      deleteSpy.mockImplementation((uri: string) => {
        if (uri === destinationUri) {
          throw cleanupError;
        }
      });
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

      const result = await audioCacheService.getAudioSource(
        'storylines/vaedros/quest-11.mp3'
      );

      // The cleanup failure must not mask the original download error, and
      // the service must still fall back to in-memory streaming playback.
      expect(result).toEqual({ uri: SIGNED_URL });
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to download audio file'),
        downloadError
      );

      warnSpy.mockRestore();
    });
  });

  describe('Bug 4: expired-file cleanup reads modificationTime in milliseconds', () => {
    it('deletes a cached file whose modificationTime (ms since epoch) is older than 24h and keeps a fresh one', async () => {
      const now = Date.now();
      const staleUri = `${CACHE_DIR}stale-quest.mp3`;
      const freshUri = `${CACHE_DIR}fresh-quest.mp3`;

      // modificationTime is expressed in *milliseconds* since epoch on the
      // new File API (the legacy API used seconds) — see
      // node_modules/expo-file-system/build/ExpoFileSystem.types.d.ts.
      fileState.set(staleUri, {
        exists: true,
        modificationTime: now - 25 * 60 * 60 * 1000, // 25h old, expressed in ms
      });
      fileState.set(freshUri, {
        exists: true,
        modificationTime: now - 1 * 60 * 60 * 1000, // 1h old, expressed in ms
      });
      listSpy.mockReturnValue([new File(staleUri), new File(freshUri)]);

      // cleanupExpiredFiles is private and only runs once at construction;
      // invoke it directly to unit-test its date math in isolation.
      await (
        audioCacheService as unknown as {
          cleanupExpiredFiles: () => Promise<void>;
        }
      ).cleanupExpiredFiles();

      expect(deleteSpy).toHaveBeenCalledWith(staleUri);
      expect(deleteSpy).not.toHaveBeenCalledWith(freshUri);
    });

    it('skips directory entries returned by list() (only File instances carry modificationTime)', async () => {
      listSpy.mockReturnValue([new Directory(`${CACHE_DIR}subdir/`)]);

      await (
        audioCacheService as unknown as {
          cleanupExpiredFiles: () => Promise<void>;
        }
      ).cleanupExpiredFiles();

      expect(deleteSpy).not.toHaveBeenCalled();
    });
  });

  describe('getAudioSource fallback', () => {
    const FEMALE = 'storylines/vaedros/quest-1-female.mp3';
    const MALE = 'storylines/vaedros/quest-1.mp3';
    const FEMALE_URI = `${CACHE_DIR}storylines_vaedros_quest_1_female_mp3.mp3`;
    const MALE_URI = `${CACHE_DIR}storylines_vaedros_quest_1_mp3.mp3`;

    let warnSpy: jest.SpyInstance;
    let logSpy: jest.SpyInstance;

    beforeEach(() => {
      // The fallback path (and the download failures that provoke it) are
      // expected to log; silence them here so test output stays pristine
      // without touching production logging.
      warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    });

    afterEach(() => {
      warnSpy.mockRestore();
      logSpy.mockRestore();
    });

    // Makes GET /audio/file reject for the given path(s) (both
    // downloadAudioFile and downloadToMemory call it with the same
    // `params.path`, so this fails a path "fully" — both the local-download
    // and in-memory-streaming attempts).
    function mockAudioFileRequestFailureFor(...failingPaths: string[]) {
      apiClient.get.mockImplementation(
        (_url: string, config: { params: { path: string } }) => {
          if (failingPaths.includes(config.params.path)) {
            return Promise.reject(new Error('404: audio file not found'));
          }
          return Promise.resolve({ data: { audioUrl: SIGNED_URL } });
        }
      );
    }

    it('does not touch the fallback when the primary succeeds', async () => {
      const result = await audioCacheService.getAudioSource(FEMALE, MALE);

      expect(result).toEqual({ uri: FEMALE_URI });
      expect(posthogClient.capture).not.toHaveBeenCalledWith(
        'narration_voice_fallback',
        expect.anything()
      );
    });

    // Split into two tests (rather than one test asserting both the
    // resolved uri and the capture call): a mutation that always takes the
    // fallback but skips reporting it (or vice versa) must be caught by a
    // mutation that fails only one of these two independent behaviors, not
    // both at once — see the mutation-check notes in the task report.
    it('retries the fallback path and resolves the male source when the primary fully fails', async () => {
      mockAudioFileRequestFailureFor(FEMALE);

      const result = await audioCacheService.getAudioSource(FEMALE, MALE);

      expect(result).toEqual({ uri: MALE_URI });
    });

    it('reports narration_voice_fallback to PostHog when the primary fully fails', async () => {
      mockAudioFileRequestFailureFor(FEMALE);

      await audioCacheService.getAudioSource(FEMALE, MALE);

      expect(posthogClient.capture).toHaveBeenCalledWith(
        'narration_voice_fallback',
        { path: FEMALE }
      );
    });

    it('returns null when primary and fallback both fail', async () => {
      mockAudioFileRequestFailureFor(FEMALE, MALE);

      const result = await audioCacheService.getAudioSource(FEMALE, MALE);

      expect(result).toBeNull();
    });
  });

  describe('preloadAudio', () => {
    it('preloads primary paths with their fallbacks via getAudioSource', async () => {
      const spy = jest
        .spyOn(audioCacheService, 'getAudioSource')
        .mockResolvedValue({ uri: 'cached' });

      await audioCacheService.preloadAudio([
        {
          primaryPath: 'storylines/vaedros/quest-2-female.mp3',
          fallbackPath: 'storylines/vaedros/quest-2.mp3',
        },
        {
          primaryPath: 'storylines/vaedros/quest-3-female.mp3',
          fallbackPath: 'storylines/vaedros/quest-3.mp3',
        },
      ]);

      expect(spy).toHaveBeenCalledWith(
        'storylines/vaedros/quest-2-female.mp3',
        'storylines/vaedros/quest-2.mp3'
      );
      expect(spy).toHaveBeenCalledWith(
        'storylines/vaedros/quest-3-female.mp3',
        'storylines/vaedros/quest-3.mp3'
      );
      spy.mockRestore();
    });

    it('passes undefined, not null, to getAudioSource when an item has no fallback', async () => {
      // A raw `null` would violate getAudioSource's `string | undefined`
      // fallback parameter — this is the ?? undefined conversion the task
      // brief calls out explicitly.
      const spy = jest
        .spyOn(audioCacheService, 'getAudioSource')
        .mockResolvedValue({ uri: 'cached' });

      await audioCacheService.preloadAudio([
        { primaryPath: 'storylines/vaedros/quest-2.mp3', fallbackPath: null },
      ]);

      expect(spy).toHaveBeenCalledWith(
        'storylines/vaedros/quest-2.mp3',
        undefined
      );
      spy.mockRestore();
    });

    it('only preloads the first 3 items', async () => {
      const spy = jest
        .spyOn(audioCacheService, 'getAudioSource')
        .mockResolvedValue({ uri: 'cached' });

      await audioCacheService.preloadAudio([
        { primaryPath: 'storylines/vaedros/quest-1.mp3', fallbackPath: null },
        { primaryPath: 'storylines/vaedros/quest-2.mp3', fallbackPath: null },
        { primaryPath: 'storylines/vaedros/quest-3.mp3', fallbackPath: null },
        { primaryPath: 'storylines/vaedros/quest-4.mp3', fallbackPath: null },
      ]);

      expect(spy).toHaveBeenCalledTimes(3);
      expect(spy).not.toHaveBeenCalledWith(
        'storylines/vaedros/quest-4.mp3',
        undefined
      );
      spy.mockRestore();
    });

    it('continues preloading remaining items when one fails', async () => {
      const spy = jest
        .spyOn(audioCacheService, 'getAudioSource')
        .mockRejectedValueOnce(new Error('boom'))
        .mockResolvedValueOnce({ uri: 'cached' });
      const localWarnSpy = jest
        .spyOn(console, 'warn')
        .mockImplementation(() => {});

      await expect(
        audioCacheService.preloadAudio([
          { primaryPath: 'storylines/vaedros/quest-1.mp3', fallbackPath: null },
          { primaryPath: 'storylines/vaedros/quest-2.mp3', fallbackPath: null },
        ])
      ).resolves.toBeUndefined();

      expect(spy).toHaveBeenCalledTimes(2);
      localWarnSpy.mockRestore();
      spy.mockRestore();
    });
  });
});
