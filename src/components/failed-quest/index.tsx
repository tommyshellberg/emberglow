import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

import { Button, EyebrowLabel } from '@/components/emberglow';
import { BackgroundImage, ScreenContainer } from '@/components/ui';
import { getQuestModeLabel } from '@/lib/utils/quest-utils';
import type {
  CustomQuestTemplate,
  Quest,
  StoryQuestTemplate,
} from '@/store/types';
import { colors, easing, fontFamily, spacing, text } from '@/theme';

type FailedQuestProps = {
  quest: Quest | StoryQuestTemplate | CustomQuestTemplate;
  onRetry: () => void;
};

// Fade+translateY via withDelay/withTiming/easing.emberOut — the entrance
// pattern this screen now shares with QuestComplete's sub-components.
const EMBER_OUT = Easing.bezier(...easing.emberOut);
const RISE_DISTANCE = 20;

export function FailedQuest({ quest, onRetry }: FailedQuestProps) {
  // Create animated values for header, message, and button animations
  const headerAnim = useSharedValue(0);
  const messageAnim = useSharedValue(0);
  const buttonAnim = useSharedValue(0);

  // Trigger animations in sequence on mount
  useEffect(() => {
    headerAnim.value = withTiming(1, { duration: 500, easing: EMBER_OUT });
    messageAnim.value = withDelay(
      600,
      withTiming(1, { duration: 500, easing: EMBER_OUT })
    );
    buttonAnim.value = withDelay(
      1200,
      withTiming(1, { duration: 500, easing: EMBER_OUT })
    );
  }, [headerAnim, messageAnim, buttonAnim]);

  const headerAnimatedStyle = useAnimatedStyle(() => ({
    opacity: headerAnim.value,
    transform: [{ translateY: RISE_DISTANCE * (1 - headerAnim.value) }],
  }));

  const messageAnimatedStyle = useAnimatedStyle(() => ({
    opacity: messageAnim.value,
    transform: [{ translateY: RISE_DISTANCE * (1 - messageAnim.value) }],
  }));

  const buttonAnimatedStyle = useAnimatedStyle(() => ({
    opacity: buttonAnim.value,
    transform: [{ translateY: RISE_DISTANCE * (1 - buttonAnim.value) }],
  }));

  return (
    <View style={styles.flex}>
      {/* Background image */}
      <BackgroundImage />

      <ScreenContainer style={styles.screenPadding}>
        {/* Title Section */}
        <Animated.View style={[styles.header, headerAnimatedStyle]}>
          <EyebrowLabel>
            {getQuestModeLabel(quest.mode).toUpperCase()}
          </EyebrowLabel>
          <Text style={styles.title}>Quest Failed</Text>
          <Text style={styles.questTitle}>{quest.title}</Text>
        </Animated.View>

        {/* Message Section */}
        <Animated.View style={[styles.message, messageAnimatedStyle]}>
          <Text style={styles.messagePrimary}>
            It's okay to fail – every setback teaches you a lesson.
          </Text>
          <Text style={styles.messageSecondary}>
            Resist unlocking out of boredom.
          </Text>
          <Text style={styles.messageSecondary}>
            Using your phone less helps build focus and mindfulness.
          </Text>
        </Animated.View>

        {/* Button Section */}
        <Animated.View style={[styles.buttonRow, buttonAnimatedStyle]}>
          <Button label="Try Again" onPress={onRetry} variant="primary" />
        </Animated.View>
      </ScreenContainer>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  screenPadding: {
    paddingVertical: spacing[8],
  },
  header: {
    marginTop: spacing[12],
    alignItems: 'center',
  },
  title: {
    ...text.h1,
    color: colors.text.primary,
    textAlign: 'center',
    marginTop: spacing[2],
  },
  questTitle: {
    fontFamily: fontFamily.medium,
    fontSize: 18,
    textAlign: 'center',
    color: colors.text.primary,
    marginTop: spacing[2],
  },
  message: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: spacing[6],
    marginVertical: spacing[6],
  },
  messagePrimary: {
    fontFamily: fontFamily.regular,
    fontSize: 16,
    textAlign: 'center',
    color: colors.text.primary,
    marginBottom: spacing[4],
  },
  messageSecondary: {
    fontFamily: fontFamily.regular,
    fontSize: 15,
    textAlign: 'center',
    color: colors.text.secondary,
    marginBottom: spacing[4],
  },
  buttonRow: {
    alignItems: 'center',
  },
});
