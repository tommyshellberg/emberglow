import * as FileSystem from 'expo-file-system';

import { apiClient } from '@/api/common/client';
import { provisionalApiClient } from '@/api/common/provisional-client';
import { getToken } from '@/lib/auth/utils';
import { getItem, setItem } from '@/lib/storage';
import {
  convertLegacyAssetToPath,
  isLegacyAssetId,
} from '@/utils/legacyAudioMapping';

interface CachedAudio {
  path: string;
  localUri: string;
  expiresAt: number;
}

interface AudioCacheEntry {
  audioPath: string;
  localUri?: string;
  signedUrl?: string;
  expiresAt: number;
}

class AudioCacheService {
  private cache: Map<string, AudioCacheEntry> = new Map();
  private cacheDir: string;
  private readonly CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours
  // Signed URLs returned by GET /v1/audio/file are S3-presigned with a 3600s
  // (1h) TTL — see unquest-server/src/services/audio.service.js:122 (default
  // expiresIn) applied at :167. Cache them well below that so a reused URL can
  // never outlive its signature and reintroduce playback failures.
  private readonly SIGNED_URL_CACHE_DURATION = 50 * 60 * 1000; // 50 min (10 min margin)
  private readonly MAX_CACHE_SIZE = 50; // Maximum number of cached files
  private readonly CACHE_INDEX_KEY = 'audio-cache-index';

  constructor() {
    this.cacheDir = `${FileSystem.cacheDirectory}audio/`;
    this.initializeCache();
  }

  private async initializeCache() {
    try {
      // Ensure cache directory exists
      await this.ensureCacheDirExists();

      // Load cache index from storage
      await this.loadCacheIndex();

      // Clean up expired files on startup
      await this.cleanupExpiredFiles();
    } catch (error) {
      console.warn('Failed to initialize audio cache:', error);
    }
  }

  // Ensures the cache directory exists. Android can purge app cache dirs under
  // storage pressure, so this must run immediately before each download rather
  // than only once at construction.
  private async ensureCacheDirExists() {
    const dirInfo = await FileSystem.getInfoAsync(this.cacheDir);
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(this.cacheDir, {
        intermediates: true,
      });
    }
  }

  private async loadCacheIndex() {
    try {
      const savedIndex = getItem<[string, AudioCacheEntry][]>(
        this.CACHE_INDEX_KEY
      );
      if (!savedIndex || !Array.isArray(savedIndex)) {
        return;
      }

      console.log(
        `Loading ${savedIndex.length} cached audio entries from storage`
      );
      const now = Date.now();

      // Restore cache entries and verify they still exist
      for (const [key, entry] of savedIndex) {
        // Skip expired entries
        if (entry.expiresAt <= now) {
          continue;
        }

        // Verify local file still exists
        if (entry.localUri) {
          try {
            const fileInfo = await FileSystem.getInfoAsync(entry.localUri);
            if (fileInfo.exists) {
              this.cache.set(key, entry);
            }
          } catch (error) {
            // File doesn't exist, skip this entry
          }
        } else {
          // Entry without local file (in-memory URL)
          this.cache.set(key, entry);
        }
      }

      console.log(`Restored ${this.cache.size} valid cache entries`);
    } catch (error) {
      console.warn('Failed to load cache index:', error);
    }
  }

  private saveCacheIndex() {
    try {
      const cacheArray = Array.from(this.cache.entries());
      setItem(this.CACHE_INDEX_KEY, cacheArray);
    } catch (error) {
      console.warn('Failed to save cache index:', error);
    }
  }

  private async cleanupExpiredFiles() {
    try {
      const files = await FileSystem.readDirectoryAsync(this.cacheDir);
      const now = Date.now();
      let filesDeleted = 0;

      for (const file of files) {
        const filePath = `${this.cacheDir}${file}`;
        const fileInfo = await FileSystem.getInfoAsync(filePath);

        if (fileInfo.exists && fileInfo.modificationTime) {
          const fileAge = now - fileInfo.modificationTime * 1000;
          if (fileAge > this.CACHE_DURATION) {
            await FileSystem.deleteAsync(filePath);
            filesDeleted++;
          }
        }
      }

      // Also clean up expired entries from the cache map
      const expiredKeys: string[] = [];
      for (const [key, entry] of this.cache.entries()) {
        if (entry.expiresAt <= now) {
          expiredKeys.push(key);
        }
      }

      expiredKeys.forEach((key) => this.cache.delete(key));

      if (filesDeleted > 0 || expiredKeys.length > 0) {
        console.log(
          `Cleaned up ${filesDeleted} expired files and ${expiredKeys.length} cache entries`
        );
        this.saveCacheIndex();
      }
    } catch (error) {
      console.warn('Failed to cleanup expired audio files:', error);
    }
  }

  private getCacheKey(audioPath: string): string {
    return audioPath.replace(/[^a-zA-Z0-9]/g, '_');
  }

  private async downloadAudioFile(audioPath: string): Promise<string | null> {
    try {
      // Choose the appropriate client based on authentication state
      const hasRegularToken = !!getToken();
      const hasProvisionalToken = !!getItem('provisionalAccessToken');
      const client = hasRegularToken
        ? apiClient
        : hasProvisionalToken
          ? provisionalApiClient
          : apiClient;

      // Get signed URL from server
      const response = await client.get('audio/file', {
        params: { path: audioPath },
      });

      if (!response.data.audioUrl) {
        throw new Error('No audio URL received from server');
      }

      const { audioUrl } = response.data;
      const fileName = this.getCacheKey(audioPath) + '.mp3';
      const localUri = `${this.cacheDir}${fileName}`;

      // Ensure the cache dir exists right before downloading: the OS may have
      // purged it since construction, and downloadAsync throws if the
      // destination's parent directory is missing.
      await this.ensureCacheDirExists();

      // Download the file
      const downloadResult = await FileSystem.downloadAsync(audioUrl, localUri);

      if (downloadResult.status !== 200) {
        throw new Error(`Download failed with status ${downloadResult.status}`);
      }

      return localUri;
    } catch (error) {
      console.warn(`Failed to download audio file ${audioPath}:`, error);
      return null;
    }
  }

  private async downloadToMemory(audioPath: string): Promise<string | null> {
    try {
      // Choose the appropriate client based on authentication state
      const hasRegularToken = !!getToken();
      const hasProvisionalToken = !!getItem('provisionalAccessToken');
      const client = hasRegularToken
        ? apiClient
        : hasProvisionalToken
          ? provisionalApiClient
          : apiClient;

      // Get signed URL from server
      const response = await client.get('/audio/file', {
        params: { path: audioPath },
      });

      if (!response.data.audioUrl) {
        throw new Error('No audio URL received from server');
      }

      // Return the signed URL directly for in-memory playback
      return response.data.audioUrl;
    } catch (error) {
      console.warn(`Failed to get audio URL for ${audioPath}:`, error);
      return null;
    }
  }

  async getAudioSource(
    audioPath: string | number
  ): Promise<{ uri: string } | null> {
    if (!audioPath) {
      return null;
    }

    // Convert legacy React Native asset IDs to audio paths
    let actualPath: string;
    if (isLegacyAssetId(audioPath)) {
      const convertedPath = convertLegacyAssetToPath(audioPath);
      if (!convertedPath) {
        console.warn(`Could not convert legacy asset ID: ${audioPath}`);
        return null;
      }
      console.log(
        `Converted legacy asset ID ${audioPath} to path: ${convertedPath}`
      );
      actualPath = convertedPath;
    } else {
      actualPath = audioPath;
    }

    const cacheKey = actualPath;
    const now = Date.now();

    // Check if we have a cached entry
    const cachedEntry = this.cache.get(cacheKey);
    if (cachedEntry && cachedEntry.expiresAt > now) {
      // Prefer a locally cached file if it still exists
      if (cachedEntry.localUri) {
        try {
          const fileInfo = await FileSystem.getInfoAsync(cachedEntry.localUri);
          if (fileInfo.exists) {
            console.log(`Using cached audio file for ${actualPath}`);
            return { uri: cachedEntry.localUri };
          }
        } catch (error) {
          console.warn(`Cached file no longer exists: ${cachedEntry.localUri}`);
        }
      }

      // Otherwise reuse a still-valid signed URL without hitting the network
      if (cachedEntry.signedUrl) {
        console.log(`Using cached signed URL for ${actualPath}`);
        return { uri: cachedEntry.signedUrl };
      }
    }

    // Try to download and cache the file
    const localUri = await this.downloadAudioFile(actualPath);

    if (localUri) {
      // Successfully downloaded and cached
      const expiresAt = now + this.CACHE_DURATION;
      this.cache.set(cacheKey, {
        audioPath: actualPath,
        localUri,
        expiresAt,
      });

      // Save cache index to storage
      this.saveCacheIndex();

      // Manage cache size
      await this.manageCacheSize();

      return { uri: localUri };
    }

    // Fallback: try to get URL for in-memory playback
    console.log(`Falling back to in-memory playback for ${actualPath}`);
    const memoryUri = await this.downloadToMemory(actualPath);

    if (memoryUri) {
      // Cache the signed URL (without local file) for short-term reuse. The
      // duration must stay below the server's S3 presign TTL (see
      // SIGNED_URL_CACHE_DURATION) so we never hand back an expired signature.
      const expiresAt = now + this.SIGNED_URL_CACHE_DURATION;
      this.cache.set(cacheKey, {
        audioPath: actualPath,
        signedUrl: memoryUri,
        expiresAt,
      });

      // Save cache index to storage
      this.saveCacheIndex();

      return { uri: memoryUri };
    }

    return null;
  }

  private async manageCacheSize() {
    if (this.cache.size <= this.MAX_CACHE_SIZE) {
      return;
    }

    // Convert to array and sort by expiration time
    const entries = Array.from(this.cache.entries());
    entries.sort((a, b) => a[1].expiresAt - b[1].expiresAt);

    // Remove oldest entries
    const toRemove = entries.slice(0, entries.length - this.MAX_CACHE_SIZE);

    for (const [key, entry] of toRemove) {
      if (entry.localUri) {
        try {
          await FileSystem.deleteAsync(entry.localUri);
        } catch (error) {
          console.warn(
            `Failed to delete cached file: ${entry.localUri}`,
            error
          );
        }
      }
      this.cache.delete(key);
    }

    // Save updated cache index
    this.saveCacheIndex();
  }

  async preloadAudio(audioPaths: (string | number)[]): Promise<void> {
    // Preload next 3 quests' audio files in the background
    const preloadPromises = audioPaths
      .filter((path) => typeof path === 'string') // Skip legacy asset IDs
      .slice(0, 3)
      .map(async (audioPath) => {
        try {
          await this.getAudioSource(audioPath);
        } catch (error) {
          console.warn(`Failed to preload audio: ${audioPath}`, error);
        }
      });

    await Promise.all(preloadPromises);
  }

  async clearCache(): Promise<void> {
    try {
      // Clear in-memory cache
      this.cache.clear();

      // Clear cache index from storage
      this.saveCacheIndex();

      // Remove all cached files
      const files = await FileSystem.readDirectoryAsync(this.cacheDir);
      const deletePromises = files.map((file) =>
        FileSystem.deleteAsync(`${this.cacheDir}${file}`)
      );

      await Promise.all(deletePromises);

      console.log('Audio cache cleared successfully');
    } catch (error) {
      console.warn('Failed to clear audio cache:', error);
    }
  }

  getCacheStats(): { size: number; maxSize: number } {
    return {
      size: this.cache.size,
      maxSize: this.MAX_CACHE_SIZE,
    };
  }
}

export const audioCacheService = new AudioCacheService();
