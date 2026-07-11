import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

import { EyebrowLabel } from '@/components/emberglow';
import { StoryNarration } from '@/components/StoryNarration';
import {
  colors,
  easing,
  fontFamily,
  palette,
  radii,
  shadows,
  spacing,
  tracking,
} from '@/theme';

import { ANIMATION_TIMING } from './constants';
import type { QuestCompleteStoryProps } from './types';
import { isStoryQuest } from './types';

const EMBER_OUT = Easing.bezier(...easing.emberOut);
/** Rise distance for the fade+translateY entrance, matching FailedQuest's convergence. */
const RISE_DISTANCE = 16;

const DROP_CAP_SIZE = 34;
const BODY_FONT_SIZE = 15.5;
const BODY_LINE_HEIGHT = BODY_FONT_SIZE * 1.65;

/**
 * Story card (quest-flow.jsx:144-172) — surface.raised, hairline border,
 * radius lg, shadow-raised. Story quests get a "THE STORY SO FAR" eyebrow, a
 * drop-cap opener, and the audio player as the card's inset bottom section
 * (StoryNarration owns that inset chrome directly). Non-story quests get a
 * plain paragraph, matching the mockup's non-story branch (:172-176).
 */
export function QuestCompleteStory({
  story,
  quest,
  disableAnimations = false,
}: QuestCompleteStoryProps) {
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

  return (
    <Animated.View
      style={[styles.shadowWrapper, storyStyle]}
      accessibilityLabel="Quest completion story"
    >
      {/* Two layers so the drop shadow (outer) isn't clipped by the rounded
          card's `overflow: hidden` (inner) — see quest-card.tsx. */}
      <View style={styles.card}>
        <View style={styles.storySection}>
          {isStory && (
            <EyebrowLabel tone="muted" style={styles.eyebrow}>
              THE STORY SO FAR
            </EyebrowLabel>
          )}
          <Text style={styles.storyText} accessibilityRole="text">
            {isStory ? (
              <>
                {/* RN has no CSS float — the drop cap is a bigger inline
                    Text run at the start of the paragraph rather than a
                    true multi-line wraparound (not supported by RN Text
                    layout), per this component's documented bespoke
                    treatment. */}
                <Text style={styles.dropCap}>{displayStory.charAt(0)}</Text>
                {displayStory.slice(1)}
              </>
            ) : (
              displayStory
            )}
          </Text>
        </View>

        {/* Audio player — only for story quests. StoryNarration owns its
            own in-card inset chrome (surface.inset bg, hairline top
            border) directly, so it drops in as the card's bottom section. */}
        {isStory && <StoryNarration quest={quest} />}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  shadowWrapper: {
    width: '100%',
    borderRadius: radii.lg,
    backgroundColor: colors.surface.raised,
    ...shadows.raised,
  },
  card: {
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border.hairline,
    overflow: 'hidden',
  },
  storySection: {
    paddingHorizontal: spacing[5],
    paddingTop: spacing[5],
    paddingBottom: spacing[4],
  },
  eyebrow: {
    fontSize: 11,
    letterSpacing: 11 * tracking.label,
    marginBottom: spacing[2],
  },
  storyText: {
    fontFamily: fontFamily.regular,
    fontSize: BODY_FONT_SIZE,
    lineHeight: BODY_LINE_HEIGHT,
    color: colors.text.secondary,
  },
  dropCap: {
    fontFamily: fontFamily.display,
    fontWeight: 'normal',
    fontSize: DROP_CAP_SIZE,
    // Must match the body's line height, NOT the Erstoria fontSize * 1.15
    // convention: on iOS a nested Text's larger lineHeight is adopted by
    // the whole paragraph, double-spacing the opening paragraph. The cap
    // glyph overflows its line box upward instead.
    lineHeight: BODY_LINE_HEIGHT,
    color: palette.sandy,
  },
});
