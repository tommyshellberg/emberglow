import { Feather } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { ChevronDown, ChevronUp, Notebook } from 'lucide-react-native';
import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text as RNText,
  TouchableOpacity,
} from 'react-native';

import { useQuestReflection } from '@/api/quest-reflection';
import { AVAILABLE_CUSTOM_QUEST_STORIES } from '@/app/data/quests';
import { Badge, Button } from '@/components/emberglow';
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
import {
  colors as emberColors,
  fontFamily,
  fontSize,
  radii,
  shadows,
  spacing,
  withAlpha,
} from '@/theme';

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
      <View style={styles.screenRoot}>
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
              style={styles.reflectionHeader}
              accessibilityLabel={`${REFLECTION_HEADER_TEXT} section`}
              accessibilityRole="button"
              accessibilityHint={`${isReflectionExpanded ? 'Collapse' : 'Expand'} reflection details`}
              accessibilityState={{ expanded: isReflectionExpanded }}
            >
              <View style={styles.reflectionHeaderLeft}>
                <Notebook size={22} color={emberColors.text.accent} />
                <RNText style={styles.reflectionHeaderTitle}>
                  {REFLECTION_HEADER_TEXT}
                </RNText>
                <Badge tone="success" style={styles.reflectionAddedBadge}>
                  {REFLECTION_ADDED_BADGE_TEXT}
                </Badge>
              </View>
              {isReflectionExpanded ? (
                <ChevronUp size={20} color={emberColors.text.secondary} />
              ) : (
                <ChevronDown size={20} color={emberColors.text.secondary} />
              )}
            </TouchableOpacity>

            {/* Expandable reflection content */}
            {isReflectionExpanded && (
              <View style={styles.reflectionContent}>
                <View style={styles.reflectionContentRow}>
                  {/* Left side: Mood emoji */}
                  {(serverReflection?.mood || quest.reflection?.mood) && (
                    <View style={styles.reflectionMoodContainer}>
                      <RNText style={styles.reflectionMoodEmoji}>
                        {
                          MOOD_EMOJIS[
                            (serverReflection?.mood ||
                              quest.reflection
                                ?.mood) as keyof typeof MOOD_EMOJIS
                          ]
                        }
                      </RNText>
                    </View>
                  )}

                  {/* Right side: Activities and Note */}
                  <View style={styles.reflectionContentMain}>
                    {/* Activities as title */}
                    {(serverReflection?.activities?.length ||
                      quest.reflection?.activities?.length) && (
                      <View style={styles.reflectionActivitiesRow}>
                        {(
                          serverReflection?.activities ||
                          quest.reflection?.activities ||
                          []
                        ).map((activity: string) => (
                          <View
                            style={styles.reflectionActivityChip}
                            key={activity}
                          >
                            <RNText style={styles.reflectionActivityText}>
                              {activity}
                            </RNText>
                          </View>
                        ))}
                      </View>
                    )}

                    {/* Note underneath */}
                    {(serverReflection?.text || quest.reflection?.text) && (
                      <RNText style={styles.reflectionNoteText}>
                        {serverReflection?.text || quest.reflection?.text}
                      </RNText>
                    )}
                  </View>
                </View>
              </View>
            )}
          </View>
        )}

        {/* Add Reflection button at top - only when no reflection exists */}
        {from === 'journal' && !hasReflection && quest.questRunId && (
          <View className="mx-4 mb-4">
            <Button
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
              variant="primary"
              size="sm"
              glow
            >
              <Notebook size={18} color={emberColors.text.onAccent} />
              <RNText style={styles.addReflectionButtonText}>
                {ADD_REFLECTION_BUTTON_TEXT}
              </RNText>
            </Button>
          </View>
        )}

        <QuestComplete
          quest={quest}
          story={getQuestCompletionText()}
          showActionButton={from !== 'journal'}
          disableEnteringAnimations={from === 'journal'}
        />
      </View>
    );
  }

  if (quest.status === 'failed') {
    return (
      <View style={styles.screenRoot}>
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

// Shared surface for both the collapsible header and its expanded panel.
const reflectionPanelBase = {
  borderRadius: radii.lg,
  backgroundColor: emberColors.surface.raised,
  padding: spacing[4],
  ...shadows.card,
} as const;

const styles = StyleSheet.create({
  // Flat canvas behind the ScreenHeader band, matching the ScreenContainer
  // below it (now transparent for QuestComplete/FailedQuest's own art) so
  // there's no hard color-edge seam between the header strip and content.
  screenRoot: {
    flex: 1,
    backgroundColor: emberColors.surface.app,
  },
  reflectionHeader: {
    ...reflectionPanelBase,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  reflectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  reflectionHeaderTitle: {
    marginLeft: spacing[3],
    fontFamily: fontFamily.semibold,
    fontSize: fontSize.body,
    color: emberColors.text.primary,
  },
  reflectionAddedBadge: {
    marginLeft: spacing[3],
  },
  reflectionContent: {
    ...reflectionPanelBase,
    marginTop: spacing[2],
  },
  reflectionContentRow: {
    flexDirection: 'row',
  },
  reflectionMoodContainer: {
    marginRight: spacing[4],
    alignItems: 'center',
    justifyContent: 'center',
  },
  reflectionMoodEmoji: {
    fontSize: 36,
  },
  reflectionContentMain: {
    flex: 1,
  },
  reflectionActivitiesRow: {
    marginBottom: spacing[2],
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  reflectionActivityChip: {
    marginRight: spacing[2],
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: withAlpha(emberColors.palette.cinnabar, 0.35),
    backgroundColor: withAlpha(emberColors.palette.cinnabar, 0.18),
    paddingVertical: spacing[1],
    paddingHorizontal: spacing[2],
  },
  reflectionActivityText: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.small,
    textTransform: 'capitalize',
    color: emberColors.tints.cinnabar80,
  },
  reflectionNoteText: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.small,
    lineHeight: fontSize.small * 1.5,
    color: emberColors.text.secondary,
  },
  addReflectionButtonText: {
    fontFamily: fontFamily.semibold,
    fontSize: fontSize.small,
    color: emberColors.text.onAccent,
  },
});
