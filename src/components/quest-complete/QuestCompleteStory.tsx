import React, { useEffect } from 'react';
import { ScrollView, useWindowDimensions } from 'react-native';
import Animated, {
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

import { StoryNarration } from '@/components/StoryNarration';
import { Text } from '@/components/ui';
import { Card } from '@/components/ui/card';

import { ANIMATION_TIMING } from './constants';
import type { QuestCompleteStoryProps } from './types';
import { isStoryQuest } from './types';

export function QuestCompleteStory({
  story,
  quest,
  disableAnimations = false,
}: QuestCompleteStoryProps) {
  const { height: screenHeight } = useWindowDimensions();
  const storyOpacity = useSharedValue(0);

  const storyStyle = useAnimatedStyle(() => ({
    opacity: storyOpacity.value,
  }));

  useEffect(() => {
    if (!disableAnimations) {
      storyOpacity.value = withDelay(
        ANIMATION_TIMING.STORY_DELAY,
        withTiming(1, { duration: ANIMATION_TIMING.STORY_DURATION })
      );
    } else {
      storyOpacity.value = 1;
    }
  }, [storyOpacity, disableAnimations]);

  const isStory = isStoryQuest(quest);
  const isCooperative = quest.mode === 'cooperative';
  const displayStory = story || 'Congratulations on completing your quest!';

  const enteringAnimation = disableAnimations
    ? undefined
    : FadeInDown.delay(ANIMATION_TIMING.ENTERING_DELAY_1).duration(600);

  // Cooperative quests have no narrative to fill a story card with, so skip
  // the card entirely and show the congrats message directly on the screen.
  if (isCooperative) {
    return (
      <Animated.View
        entering={enteringAnimation}
        className="my-2 w-full items-center px-4"
        style={storyStyle}
        accessibilityLabel="Quest completion story"
      >
        <Text
          className="text-center text-base leading-6 text-white"
          accessibilityRole="text"
        >
          {displayStory}
        </Text>
      </Animated.View>
    );
  }

  // Fixed height: 1/4 of screen height
  const storyHeight = Math.round(screenHeight * 0.25);

  return (
    <Animated.View
      entering={enteringAnimation}
      className="my-2 w-full"
      style={[storyStyle, { height: storyHeight }]}
      accessibilityLabel="Quest completion story"
    >
      <Card className="flex-1 rounded-xl">
        <ScrollView
          className="px-4"
          contentContainerStyle={{ paddingVertical: 16 }}
          showsVerticalScrollIndicator={true}
        >
          <Text
            className="text-sm leading-6 text-white"
            accessibilityRole="text"
          >
            {displayStory}
          </Text>
        </ScrollView>
      </Card>

      {/* Audio Controls - Only show for story quests */}
      {isStory && <StoryNarration quest={quest} />}
    </Animated.View>
  );
}
