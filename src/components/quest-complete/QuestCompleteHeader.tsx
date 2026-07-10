import React, { useEffect } from 'react';
import { StyleSheet, Text } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

import { EyebrowLabel } from '@/components/emberglow';
import { getQuestModeLabel } from '@/lib/utils/quest-utils';
import { colors, easing, fontFamily, spacing, text } from '@/theme';

import { ANIMATION_TIMING } from './constants';
import { QuestImage } from './QuestImage';
import type { QuestCompleteHeaderProps } from './types';

const EMBER_OUT = Easing.bezier(...easing.emberOut);
/** Rise distance for the fade+translateY entrance, matching FailedQuest's convergence. */
const RISE_DISTANCE = 16;

export function QuestCompleteHeader({
  quest,
  disableAnimations = false,
}: QuestCompleteHeaderProps) {
  const headerOpacity = useSharedValue(0);

  const headerStyle = useAnimatedStyle(() => ({
    opacity: headerOpacity.value,
    transform: [{ translateY: RISE_DISTANCE * (1 - headerOpacity.value) }],
  }));

  useEffect(() => {
    if (!disableAnimations) {
      headerOpacity.value = withDelay(
        ANIMATION_TIMING.HEADER_DELAY,
        withTiming(1, {
          duration: ANIMATION_TIMING.HEADER_DURATION,
          easing: EMBER_OUT,
        })
      );
    } else {
      headerOpacity.value = 1;
    }
  }, [headerOpacity, disableAnimations]);

  return (
    <Animated.View
      style={[styles.container, headerStyle]}
      accessibilityRole="header"
    >
      <EyebrowLabel style={styles.eyebrow}>
        {getQuestModeLabel(quest.mode).toUpperCase()}
      </EyebrowLabel>
      <Text style={styles.title}>Quest Complete!</Text>

      {quest.title && <Text style={styles.subtitle}>{quest.title}</Text>}

      <QuestImage quest={quest} disableAnimations={disableAnimations} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    alignItems: 'center',
    marginTop: spacing[4],
    marginBottom: spacing[3],
  },
  eyebrow: {
    marginBottom: spacing[1],
  },
  title: {
    ...text.h1,
    color: colors.text.primary,
    textAlign: 'center',
    marginBottom: spacing[2],
  },
  subtitle: {
    fontFamily: fontFamily.medium,
    fontStyle: 'italic',
    fontSize: 18,
    textAlign: 'center',
    color: colors.text.primary,
    marginBottom: spacing[4],
  },
});
