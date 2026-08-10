import { useEffect } from 'react';

import { useNextAvailableQuests } from '@/api/quest/use-next-available-quests';
import { audioCacheService } from '@/lib/services/audio-cache.service';
import { useSettingsStore } from '@/store/settings-store';
import { getNarrationPaths, type NarrationPaths } from '@/utils/audio-utils';

interface UseAudioPreloaderOptions {
  storylineId?: string;
  enabled?: boolean;
}

export const useAudioPreloader = ({
  storylineId = 'vaedros',
  enabled = true,
}: UseAudioPreloaderOptions = {}) => {
  const { data: questsData, isSuccess } = useNextAvailableQuests({
    storylineId,
    includeOptions: true,
    enabled,
  });
  const narratorVoice = useSettingsStore((s) => s.narratorVoice);

  useEffect(() => {
    if (!isSuccess || !questsData || !enabled) {
      return;
    }

    const preloadAudio = async () => {
      try {
        // Collect narration paths from available quests
        const audioItems: NarrationPaths[] = [];

        // Add main quest narration paths
        if (questsData.quests) {
          for (const quest of questsData.quests) {
            if (quest.customId) {
              audioItems.push(getNarrationPaths(quest.customId, storylineId));
            }
          }
        }

        // Add option quest narration paths
        if (questsData.options) {
          for (const option of questsData.options) {
            if (option.nextQuest?.customId) {
              audioItems.push(
                getNarrationPaths(option.nextQuest.customId, storylineId)
              );
            }
          }
        }

        // Filter out duplicates, keyed by primaryPath
        const uniqueItems = [
          ...new Map(
            audioItems.map((item) => [item.primaryPath, item])
          ).values(),
        ];

        if (uniqueItems.length > 0) {
          console.log(
            `Preloading ${uniqueItems.length} audio files for ${storylineId}`
          );
          await audioCacheService.preloadAudio(uniqueItems);
        }
      } catch (error) {
        console.warn('Failed to preload audio files:', error);
      }
    };

    preloadAudio();
    // narratorVoice: getNarrationPaths reads settings via getState(), which
    // doesn't itself trigger a re-render. Subscribing to narratorVoice above
    // and listing it here is what makes a voice change while mounted
    // re-preload the current quests' narration (see use-audio-preloader.test.ts).
  }, [isSuccess, questsData, storylineId, enabled, narratorVoice]);

  return {
    cacheStats: audioCacheService.getCacheStats(),
    clearCache: audioCacheService.clearCache.bind(audioCacheService),
  };
};
