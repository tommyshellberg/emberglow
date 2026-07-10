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

export function QuestCompleteActions({
  quest,
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
      },
    });
  };

  // Show reflection button if:
  // 1. Quest has a questRunId (server-tracked quest)
  // 2. Quest is not the onboarding quest (quest-1)
  const showReflectionButton =
    (quest as any).questRunId && quest.id !== ONBOARDING_QUEST_ID;

  return (
    <Animated.View
      style={[styles.container, actionsStyle]}
      testID="quest-actions-container"
    >
      <View style={styles.row}>
        {/* Continue is secondary here — Add Reflection carries the primary
            (Cinnabar) treatment per the quest-flow.jsx mockup. */}
        <View style={styles.slot} accessibilityLabel={continueText}>
          <Button
            label={continueText}
            onPress={handleContinue}
            variant="secondary"
            fullWidth
          />
        </View>
        {showReflectionButton && (
          <View style={styles.slot} accessibilityLabel="Reflect on quest">
            <Button
              label="Add Reflection"
              onPress={handleAddReflection}
              variant="primary"
              fullWidth
            />
          </View>
        )}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    marginBottom: spacing[4],
  },
  row: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing[4],
    paddingHorizontal: spacing[4],
  },
  slot: {
    flex: 1,
  },
});
