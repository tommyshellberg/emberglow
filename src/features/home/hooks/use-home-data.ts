import { useMemo } from 'react';

import { getMapNameForQuest } from '@/app/utils/map-utils';

import { STORYLINE_COMPLETE_THRESHOLD } from '@/features/home/constants/home-constants';
import type { CarouselItem } from '@/features/home/types/home-types';

interface CompletedQuest {
  id: string;
  mode: string;
  status: string;
  stopTime?: number;
  recap?: string;
}

interface ServerQuest {
  customId: string;
  title: string;
  recap?: string;
  durationMinutes: number;
  reward: { xp: number };
  isPremium?: boolean;
}

interface AvailableQuest {
  id: string;
  title?: string;
  mode?: string;
  durationMinutes?: number;
  reward?: { xp: number };
}

interface StorylineProgress {
  progressPercentage: number;
}

interface UseHomeDataProps {
  serverQuests: ServerQuest[];
  availableQuests: AvailableQuest[];
  storyOptions: any[];
  completedQuests: CompletedQuest[];
  isLoadingQuests: boolean;
  storylineProgress?: StorylineProgress;
  totalStoryQuests?: number;
}

export function useHomeData({
  serverQuests,
  availableQuests,
  storyOptions,
  completedQuests,
  isLoadingQuests,
  storylineProgress,
  totalStoryQuests = 1, // Default to avoid division by zero
}: UseHomeDataProps) {
  // Calculate current map name
  const currentMapName = useMemo(() => {
    if (serverQuests.length > 0) {
      return getMapNameForQuest(serverQuests[0].customId);
    }
    if (availableQuests.length > 0 && availableQuests[0].id) {
      return getMapNameForQuest(availableQuests[0].id);
    }
    return 'Vaedros Kingdom';
  }, [serverQuests, availableQuests]);

  // Calculate story progress
  const storyProgress = useMemo(() => {
    if (storylineProgress) {
      return storylineProgress.progressPercentage / 100;
    }

    const completedStoryQuests = completedQuests.filter(
      (quest) => quest.mode === 'story'
    ).length;

    return completedStoryQuests / totalStoryQuests;
  }, [storylineProgress, completedQuests, totalStoryQuests]);

  // Check if storyline is complete
  const isStorylineComplete = storyProgress >= STORYLINE_COMPLETE_THRESHOLD;

  // True once the user has completed at least one story quest. Used to
  // gate the "Begin your journey" first-quest CTA so it only appears for
  // brand-new players, not at every label decision.
  const hasStartedStoryline = storyProgress > 0;

  // Get quest recap text
  const getQuestRecap = useMemo(() => {
    // Use server quest recap if available
    if (serverQuests.length > 0 && serverQuests[0].recap) {
      return serverQuests[0].recap;
    }

    // Get the last completed story quest for the recap
    const storyQuests = completedQuests.filter(
      (quest) => quest.mode === 'story' && quest.status === 'completed'
    );

    if (storyQuests.length > 0) {
      // Use the recap from the most recently completed story quest
      const lastCompletedStoryQuest = [...storyQuests].sort(
        (a, b) => (b.stopTime || 0) - (a.stopTime || 0)
      )[0];
      return lastCompletedStoryQuest.recap || 'Continue your journey';
    }

    // Fallback if no story quests completed
    return serverQuests.length > 0 || availableQuests.length > 0
      ? 'Begin your journey'
      : 'Continue your journey';
  }, [serverQuests, availableQuests, completedQuests]);

  // Build carousel data
  const carouselData: CarouselItem[] = useMemo(() => {
    const data: CarouselItem[] = [];

    // Story quest card
    const storyCard: CarouselItem = {
      id: 'story',
      mode: 'story',
      title:
        serverQuests.length > 0
          ? serverQuests[0].title
          : availableQuests.length > 0
            ? availableQuests[0].title || 'Quest'
            : storyOptions.length > 0
              ? 'Choose Your Path'
              : isLoadingQuests
                ? 'Loading quests...'
                : 'No quests available',
      subtitle: currentMapName,
      recap: getQuestRecap,
      duration:
        serverQuests.length > 0
          ? serverQuests[0].durationMinutes
          : availableQuests.length > 0
            ? availableQuests[0].durationMinutes || 0
            : 0,
      xp:
        serverQuests.length > 0
          ? serverQuests[0].reward.xp
          : availableQuests.length > 0
            ? availableQuests[0].reward?.xp || 0
            : 0,
      progress: storyProgress,
      isPremium: serverQuests.length > 0 ? serverQuests[0].isPremium : false,
    };
    data.push(storyCard);

    // Custom quest card
    data.push({
      id: 'custom',
      mode: 'custom',
      title: 'Start Custom Quest',
      subtitle: 'Free Play Mode',
      recap:
        'Start a custom quest and embark on an adventure of your own design.',
      duration: 5,
      xp: 15,
    });

    // Cooperative quest card (available to all users)
    data.push({
      id: 'cooperative',
      mode: 'cooperative',
      title: 'Cooperative Quest',
      subtitle: 'Team Challenge',
      recap:
        'Invite a friend on a quest or join a quest and stay off your phone together',
      duration: 5,
      xp: 15,
      isPremium: false,
    });

    return data;
  }, [
    serverQuests,
    availableQuests,
    storyOptions,
    isLoadingQuests,
    currentMapName,
    getQuestRecap,
    storyProgress,
  ]);

  return {
    carouselData,
    currentMapName,
    storyProgress,
    isStorylineComplete,
    hasStartedStoryline,
  };
}
