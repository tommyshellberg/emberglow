import { Feather } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { ChevronDown, ChevronUp, Notebook } from 'lucide-react-native';
import React, { useMemo, useState } from 'react';
import { ActivityIndicator, TouchableOpacity } from 'react-native';

import { useQuestReflection } from '@/api/quest-reflection';
import { AVAILABLE_CUSTOM_QUEST_STORIES } from '@/app/data/quests';
import { FailedQuest } from '@/components/failed-quest';
import { QuestComplete } from '@/components/QuestComplete';
import { FocusAwareStatusBar, ScreenHeader, Text, View } from '@/components/ui';
import colors from '@/components/ui/colors';
import {
  ADD_REFLECTION_BUTTON_TEXT,
  APP_HOME_ROUTE,
  DEFAULT_QUEST_STORY,
  GO_BACK_BUTTON_TEXT,
  LOADING_MESSAGE,
  MOOD_EMOJIS,
  QUEST_NOT_FOUND_MESSAGE,
  REFLECTION_ADDED_BADGE_TEXT,
  REFLECTION_HEADER_TEXT,
  REFLECTION_PARAM_FROM_VALUE,
  REFLECTION_ROUTE,
  SCREEN_TITLE,
} from '@/features/quest/constants/quest-details.constants';
import { useQuestStore } from '@/store/quest-store';

export default function AppQuestDetailsScreen() {
  const { id, timestamp, from, questData } = useLocalSearchParams<{
    id: string;
    timestamp?: string;
    from?: string;
    questData?: string;
  }>();

  const completedQuests = useQuestStore((state) => state.completedQuests);
  const failedQuest = useQuestStore((state) => state.failedQuest); // Global failed quest state
  const resetFailedQuest = useQuestStore((state) => state.resetFailedQuest);
  const recentCompletedQuest = useQuestStore(
    (state) => state.recentCompletedQuest
  );
  const clearRecentCompletedQuest = useQuestStore(
    (state) => state.clearRecentCompletedQuest
  );

  const [isReflectionExpanded, setIsReflectionExpanded] = useState(false);

  const handleBackNavigation = () => {
    // If quest ID is undefined, clear all quest states to prevent this from happening again
    if (!id || id === 'undefined') {
      clearRecentCompletedQuest();
      resetFailedQuest();
    } else {
      // Clear the recent completed quest if it matches this quest
      if (recentCompletedQuest && recentCompletedQuest.id === id) {
        clearRecentCompletedQuest();
      }

      // If we are viewing the globally stored failedQuest, clear it before navigating.
      if (failedQuest && failedQuest.id === id) {
        resetFailedQuest();
      }
    }

    router.replace(APP_HOME_ROUTE);
  };

  const quest = useMemo(() => {
    // Priority 1: Use quest data passed from journal (includes story field)
    if (questData) {
      try {
        const parsedQuest = JSON.parse(questData);
        return parsedQuest;
      } catch (e) {
        console.error('[QuestDetails] Failed to parse quest data:', e);
      }
    }

    // Priority 2: Check recent completed quest (for post-completion flow)
    if (recentCompletedQuest && recentCompletedQuest.id === id) {
      return recentCompletedQuest;
    }

    // Priority 3: Check current failed quest (for failure flow)
    if (
      failedQuest &&
      failedQuest.id === id &&
      failedQuest.status === 'failed'
    ) {
      return failedQuest;
    }

    // Priority 4: Search in completed quests (fallback)
    if (timestamp) {
      const completedMatch = completedQuests.find(
        (q) =>
          q.id === id &&
          q.stopTime?.toString() === timestamp &&
          q.status === 'completed'
      );
      if (completedMatch) {
        return completedMatch;
      }
    }

    // Priority 5: Search without timestamp
    const completedMatchNoTimestamp = completedQuests.find(
      (q) => q.id === id && q.status === 'completed'
    );
    if (completedMatchNoTimestamp) {
      return completedMatchNoTimestamp;
    }

    // Priority 6: Check failed quests history
    const failedQuestsHistory = useQuestStore.getState().failedQuests;
    if (failedQuestsHistory) {
      const failedMatchInHistory = failedQuestsHistory.find(
        (q) => q.id === id && q.status === 'failed'
      );
      if (failedMatchInHistory) {
        return failedMatchInHistory;
      }
    }

    return null;
  }, [
    id,
    timestamp,
    completedQuests,
    failedQuest,
    questData,
    recentCompletedQuest,
  ]);

  // Fetch reflection from server if questRunId is available
  const questRunId = quest?.questRunId;
  const { data: serverReflection } = useQuestReflection(questRunId);

  if (!quest) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <FocusAwareStatusBar />
        <Feather name="alert-circle" size={48} color={colors.neutral[300]} />
        <Text className="mt-4 text-center text-neutral-200">
          {QUEST_NOT_FOUND_MESSAGE}
        </Text>
        <TouchableOpacity
          className="mt-6 rounded-lg bg-primary-400 px-6 py-3"
          onPress={handleBackNavigation}
          accessibilityLabel={GO_BACK_BUTTON_TEXT}
          accessibilityRole="button"
          accessibilityHint="Navigate back to the previous screen"
        >
          <Text className="font-medium text-white">{GO_BACK_BUTTON_TEXT}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const getQuestCompletionText = () => {
    if (quest.mode === 'story' && 'story' in quest && quest.story) {
      return quest.story;
    }
    if (quest.mode === 'custom' && 'category' in quest && quest.category) {
      const matchingStories = AVAILABLE_CUSTOM_QUEST_STORIES.filter(
        (storyItem) =>
          storyItem.category.toLowerCase() === quest.category?.toLowerCase()
      );
      if (matchingStories.length > 0) {
        const questIdHash =
          quest.id.split('').reduce((a, b) => a + b.charCodeAt(0), 0) %
          matchingStories.length;
        return matchingStories[questIdHash].story;
      }
    }
    return DEFAULT_QUEST_STORY;
  };

  if (quest.status === 'completed' && quest.stopTime) {
    // Check if quest has a reflection (either from server or local)
    const hasReflection = serverReflection || quest.reflection;

    return (
      <View className="flex-1 bg-background">
        <FocusAwareStatusBar />
        <ScreenHeader
          title={SCREEN_TITLE}
          showBackButton
          onBackPress={handleBackNavigation}
        />

        {/* Show existing reflection section at top - only when viewing from journal */}
        {from === 'journal' && hasReflection && (
          <View className="mx-4 mb-4">
            {/* Collapsible reflection header */}
            <TouchableOpacity
              onPress={() => setIsReflectionExpanded(!isReflectionExpanded)}
              className="flex-row items-center justify-between rounded-lg bg-cardBackground p-4 shadow-md"
              accessibilityLabel={`${REFLECTION_HEADER_TEXT} section`}
              accessibilityRole="button"
              accessibilityHint={`${isReflectionExpanded ? 'Collapse' : 'Expand'} reflection details`}
              accessibilityState={{ expanded: isReflectionExpanded }}
            >
              <View className="flex-row items-center">
                <Notebook size={22} color={colors.secondary[300]} />
                <Text className="ml-3 text-base font-semibold text-white">
                  {REFLECTION_HEADER_TEXT}
                </Text>
                <View className="ml-3 rounded-full bg-secondary-400 px-3 py-1">
                  <Text className="text-xs font-medium text-white">
                    {REFLECTION_ADDED_BADGE_TEXT}
                  </Text>
                </View>
              </View>
              {isReflectionExpanded ? (
                <ChevronUp size={20} color={colors.secondary[300]} />
              ) : (
                <ChevronDown size={20} color={colors.secondary[300]} />
              )}
            </TouchableOpacity>

            {/* Expandable reflection content */}
            {isReflectionExpanded && (
              <View className="mt-2 rounded-lg bg-cardBackground p-4 shadow-md">
                <View className="flex-row">
                  {/* Left side: Mood emoji */}
                  {(serverReflection?.mood || quest.reflection?.mood) && (
                    <View className="mr-4 items-center justify-center">
                      <Text className="text-4xl">
                        {
                          MOOD_EMOJIS[
                            (serverReflection?.mood ||
                              quest.reflection
                                ?.mood) as keyof typeof MOOD_EMOJIS
                          ]
                        }
                      </Text>
                    </View>
                  )}

                  {/* Right side: Activities and Note */}
                  <View className="flex-1">
                    {/* Activities as title */}
                    {(serverReflection?.activities?.length ||
                      quest.reflection?.activities?.length) && (
                      <View className="mb-2 flex-row flex-wrap">
                        {(
                          serverReflection?.activities ||
                          quest.reflection?.activities ||
                          []
                        ).map((activity: string) => (
                          <View
                            className="mr-2 rounded-xl border-primary-500 bg-primary-200 px-2 py-1 shadow-sm"
                            key={activity}
                          >
                            <Text className="font-bold capitalize text-black">
                              {activity}{' '}
                            </Text>
                          </View>
                        ))}
                      </View>
                    )}

                    {/* Note underneath */}
                    {(serverReflection?.text || quest.reflection?.text) && (
                      <Text className="text-sm leading-relaxed text-neutral-200">
                        {serverReflection?.text || quest.reflection?.text}
                      </Text>
                    )}
                  </View>
                </View>
              </View>
            )}
          </View>
        )}

        {from === 'journal' ? (
          <QuestComplete
            quest={quest}
            story={getQuestCompletionText()}
            showActionButton={false}
            disableEnteringAnimations={true}
          />
        ) : (
          <QuestComplete
            quest={quest}
            story={getQuestCompletionText()}
            showActionButton={true}
            disableEnteringAnimations={false}
          />
        )}

        {/* Add Reflection button at the bottom - only when no reflection exists */}
        {from === 'journal' && !hasReflection && quest.questRunId && (
          <View className="mx-4 mb-4">
            <TouchableOpacity
              onPress={() => {
                router.push({
                  pathname: REFLECTION_ROUTE,
                  params: {
                    questId: quest.id,
                    questRunId: quest.questRunId,
                    duration: quest.durationMinutes,
                    from: REFLECTION_PARAM_FROM_VALUE,
                  },
                });
              }}
              className="flex-row items-center justify-center rounded-lg px-4 py-2.5 shadow-md"
              style={{
                backgroundColor: colors.cinnamon,
                shadowColor: colors.cinnamon,
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.25,
                shadowRadius: 2,
                elevation: 2,
              }}
              accessibilityLabel={ADD_REFLECTION_BUTTON_TEXT}
              accessibilityRole="button"
              accessibilityHint="Navigate to the reflection screen to add your thoughts about this quest"
            >
              <Notebook size={18} color={colors.white} />
              <Text className="ml-2 text-sm font-semibold text-white">
                {ADD_REFLECTION_BUTTON_TEXT}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  }

  if (quest.status === 'failed') {
    return (
      <View className="flex-1 bg-background">
        <FocusAwareStatusBar />
        <ScreenHeader
          title={SCREEN_TITLE}
          showBackButton
          onBackPress={handleBackNavigation}
        />
        <FailedQuest
          quest={quest}
          onRetry={() => {
            handleBackNavigation();
          }}
        />
      </View>
    );
  }

  return (
    <View className="flex-1 items-center justify-center bg-background">
      <FocusAwareStatusBar />
      <ActivityIndicator color="#36B6D3" size="large" />
      <Text className="mt-4 text-white">{LOADING_MESSAGE}</Text>
    </View>
  );
}
