import { router } from 'expo-router';
import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

import { Button } from '@/components/emberglow';
import { useQuestStore } from '@/store/quest-store';
import { easing, spacing } from '@/theme';

import { ANIMATION_TIMING, ONBOARDING_QUEST_ID } from './constants';
import type { QuestCompleteActionsProps } from './types';

const EMBER_OUT = Easing.bezier(...easing.emberOut);
/** Rise distance for the fade+translateY entrance, matching FailedQuest's convergence. */
const RISE_DISTANCE = 16;

/**
 * Bottom action stack (quest-flow.jsx:178-181): a full-width primary "Add
 * reflection" button, with a secondary full-width "Continue" underneath it
 * only in the quest-flow context (`fromJournal === false`) — the journal
 * context never shows Continue.
 */
export function QuestCompleteActions({
  quest,
  fromJournal = false,
  hasReflection = false,
  onContinue,
  continueText,
  disableAnimations = false,
}: QuestCompleteActionsProps) {
  const clearRecentCompletedQuest = useQuestStore(
    (state) => state.clearRecentCompletedQuest
  );

  const actionsOpacity = useSharedValue(0);

  const actionsStyle = useAnimatedStyle(() => ({
    opacity: actionsOpacity.value,
    transform: [{ translateY: RISE_DISTANCE * (1 - actionsOpacity.value) }],
  }));

  useEffect(() => {
    if (!disableAnimations) {
      actionsOpacity.value = withDelay(
        ANIMATION_TIMING.ACTIONS_DELAY,
        withTiming(1, {
          duration: ANIMATION_TIMING.ACTIONS_DURATION,
          easing: EMBER_OUT,
        })
      );
    } else {
      actionsOpacity.value = 1;
    }
  }, [actionsOpacity, disableAnimations]);

  const handleContinue = () => {
    // Clear the quest state - this will trigger navigation
    clearRecentCompletedQuest();

    // If there's a custom onContinue handler, use it
    if (onContinue) {
      onContinue();
    } else {
      // Default navigation is handled by NavigationGate based on state
      router.push('/(app)');
    }
  };

  const handleAddReflection = () => {
    const questRunId = (quest as any).questRunId;
    router.push({
      pathname: '/(app)/quest/reflection',
      params: {
        questId: quest.id,
        questRunId,
        duration: quest.durationMinutes,
        // Preserves the pre-existing journal-vs-direct navigation targets
        // (ground rule 1) — only the journal context tags the reflection
        // screen with where to return to.
        ...(fromJournal ? { from: 'quest-detail' } : {}),
      },
    });
  };

  // Show reflection button if:
  // 1. Quest has a questRunId (server-tracked quest)
  // 2. Quest is not the onboarding quest (quest-1)
  // 3. It doesn't already have a reflection attached
  const showReflectionButton =
    (quest as any).questRunId &&
    quest.id !== ONBOARDING_QUEST_ID &&
    !hasReflection;

  return (
    <Animated.View
      style={[styles.container, actionsStyle]}
      testID="quest-actions-container"
    >
      {showReflectionButton && (
        <View accessibilityLabel="Reflect on quest">
          <Button
            label="Add reflection"
            onPress={handleAddReflection}
            variant="primary"
            size="lg"
            fullWidth
          />
        </View>
      )}
      {/* Continue is secondary and quest-flow-only — the journal context
          never shows it (mockup quest-flow.jsx:180). */}
      {!fromJournal && (
        <View
          style={showReflectionButton ? styles.continueSlot : undefined}
          accessibilityLabel={continueText}
        >
          <Button
            label={continueText}
            onPress={handleContinue}
            variant="secondary"
            fullWidth
          />
        </View>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  continueSlot: {
    marginTop: spacing[3],
  },
});
