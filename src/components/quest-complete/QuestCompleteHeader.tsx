import React, { useEffect } from 'react';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

import { Eyebrow, Text } from '@/components/ui';
import { getQuestModeLabel } from '@/lib/utils/quest-utils';

import { ANIMATION_TIMING } from './constants';
import { QuestImage } from './QuestImage';
import type { QuestCompleteHeaderProps } from './types';

export function QuestCompleteHeader({
  quest,
  disableAnimations = false,
}: QuestCompleteHeaderProps) {
  const headerOpacity = useSharedValue(0);

  const headerStyle = useAnimatedStyle(() => ({
    opacity: headerOpacity.value,
  }));

  useEffect(() => {
    if (!disableAnimations) {
      headerOpacity.value = withDelay(
        ANIMATION_TIMING.HEADER_DELAY,
        withTiming(1, { duration: ANIMATION_TIMING.HEADER_DURATION })
      );
    } else {
      headerOpacity.value = 1;
    }
  }, [headerOpacity, disableAnimations]);

  return (
    <Animated.View
      className="mb-3 mt-4 w-full items-center"
      style={headerStyle}
      accessibilityRole="header"
    >
      <Eyebrow text={getQuestModeLabel(quest.mode)} className="mb-1" />
      <Text className="font-quest mb-2 text-center text-3xl text-cream-500 drop-shadow-md">
        Quest Complete!
      </Text>

      {quest.title && (
        <Text className="mb-4 text-center text-lg font-medium italic text-white drop-shadow-md">
          {quest.title}
        </Text>
      )}

      <QuestImage quest={quest} disableAnimations={disableAnimations} />
    </Animated.View>
  );
}
