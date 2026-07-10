import React, { useEffect } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

import { StoryNarration } from '@/components/StoryNarration';
import { colors, easing, radii, shadows, spacing } from '@/theme';

import { ANIMATION_TIMING } from './constants';
import type { QuestCompleteStoryProps } from './types';
import { isStoryQuest } from './types';

const EMBER_OUT = Easing.bezier(...easing.emberOut);
/** Rise distance for the fade+translateY entrance, matching FailedQuest's convergence. */
const RISE_DISTANCE = 16;

export function QuestCompleteStory({
  story,
  quest,
  disableAnimations = false,
}: QuestCompleteStoryProps) {
  const { height: screenHeight } = useWindowDimensions();
  const storyOpacity = useSharedValue(0);

  const storyStyle = useAnimatedStyle(() => ({
    opacity: storyOpacity.value,
    transform: [{ translateY: RISE_DISTANCE * (1 - storyOpacity.value) }],
  }));

  useEffect(() => {
    if (!disableAnimations) {
      storyOpacity.value = withDelay(
        ANIMATION_TIMING.STORY_DELAY,
        withTiming(1, {
          duration: ANIMATION_TIMING.STORY_DURATION,
          easing: EMBER_OUT,
        })
      );
    } else {
      storyOpacity.value = 1;
    }
  }, [storyOpacity, disableAnimations]);

  const isStory = isStoryQuest(quest);
  const displayStory = story || 'Congratulations on completing your quest!';

  // Fixed height: 1/4 of screen height
  const storyHeight = Math.round(screenHeight * 0.25);

  return (
    <Animated.View
      style={[styles.container, storyStyle, { height: storyHeight }]}
      accessibilityLabel="Quest completion story"
    >
      {/* Two layers so the drop shadow (outer) isn't clipped by the
          rounded card's `overflow: hidden` (inner) — see quest-card.tsx. */}
      <View style={styles.shadowWrapper}>
        <View style={styles.card}>
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={true}
          >
            <Text style={styles.storyText} accessibilityRole="text">
              {displayStory}
            </Text>
          </ScrollView>
        </View>
      </View>

      {/* Audio Controls - Only show for story quests */}
      {isStory && <StoryNarration quest={quest} />}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    marginVertical: spacing[2],
  },
  shadowWrapper: {
    flex: 1,
    borderRadius: radii.lg,
    backgroundColor: colors.surface.raised,
    ...shadows.card,
  },
  card: {
    flex: 1,
    borderRadius: radii.lg,
    overflow: 'hidden',
  },
  scroll: {
    paddingHorizontal: spacing[4],
  },
  scrollContent: {
    paddingVertical: spacing[4],
  },
  storyText: {
    fontSize: 14,
    lineHeight: 21,
    color: colors.text.primary,
  },
});
