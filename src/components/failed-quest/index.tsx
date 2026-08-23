import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

import { useNextAvailableQuests } from '@/api/quest';
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

// This component hard-codes its English strings (no `t()`), so this
// consequence line is hard-coded too, matching the rest of the file.
const CONSEQUENCE_LINE =
  'The story moves on. What you couldn’t finish will follow you.';

// How long we wait for the server to say whether the story still offers this
// quest. The query retries 3x behind a 30s timeout, and the onboarding version
// of this screen has no back button, so a bad connection would otherwise pin a
// new user to a spinner for about two minutes.
const DECIDE_TIMEOUT_MS = 5000;

// The height of the primary CTA (Button's default `md` size). The spinner sits
// in the same slot, so it reserves the same height and the layout does not jump
// when the button replaces it.
const BUTTON_SLOT_HEIGHT = 48;

/**
 * What this screen offers the player.
 * - `deciding`: we are still asking the server; show a spinner, nothing else.
 * - `retry`: the failed quest is still on offer (or we could not find out).
 * - `moved-on`: the story replaced this quest; only Continue is left.
 */
type Outcome = 'deciding' | 'retry' | 'moved-on';

export function FailedQuest({ quest, onRetry }: FailedQuestProps) {
  const isStory = quest.mode === 'story';
  const { refetch } = useNextAvailableQuests({ enabled: isStory });
  // The answer is resolved once, into local state. Reading the shared query's
  // live `data`/`isFetching` instead would let a later refetch elsewhere in the
  // app swap this screen's button while the player is looking at it.
  const [outcome, setOutcome] = useState<Outcome>(
    isStory ? 'deciding' : 'retry'
  );

  useEffect(() => {
    if (!isStory) return;
    // The server marks the run failed before this screen mounts, so ask again
    // for fresh options: they say whether the story kept or replaced this quest.
    let settled = false;
    const settle = (next: Outcome) => {
      if (settled) return;
      settled = true;
      setOutcome(next);
    };
    const timer = setTimeout(() => {
      // No answer in time. We do not know that the story moved on, so offer
      // the retry rather than telling the player something that may be false.
      settle('retry');
    }, DECIDE_TIMEOUT_MS);
    refetch()
      .then(({ data }) => {
        clearTimeout(timer);
        const offered = data?.quests;
        // No data means the request failed. Again: we do not know, so retry.
        settle(
          offered === undefined || offered.some((q) => q.customId === quest.id)
            ? 'retry'
            : 'moved-on'
        );
      })
      .catch(() => {
        clearTimeout(timer);
        settle('retry');
      });
    return () => {
      settled = true;
      clearTimeout(timer);
    };
  }, [isStory, refetch, quest.id]);

  const deciding = outcome === 'deciding';
  const stillOffered = outcome === 'retry';

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
      <BackgroundImage tintClassName="">
        {/* Darkening overlay for text legibility over the art, normalized
            to a theme token instead of BackgroundImage's default NativeWind
            white tint (which was never visible before — the old opaque
            ScreenContainer gradient fully occluded this art). */}
        <View style={styles.overlay} />
      </BackgroundImage>

      {/* The gap has to travel through `bottomPadding`, not the style prop:
          ScreenContainer sets `paddingBottom` (inset + gap), and Yoga resolves
          padding by edge specificity rather than source order, so a
          `paddingVertical` here would lose at the bottom edge no matter that
          it is applied later. */}
      <ScreenContainer
        testID="failed-quest-content"
        transparent
        bottomPadding={spacing[8]}
        style={styles.screenPadding}
      >
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
          {outcome === 'moved-on' && (
            <Text style={styles.messagePrimary}>{CONSEQUENCE_LINE}</Text>
          )}
          <Text style={styles.messagePrimary}>
            It's okay to fail – every setback teaches you a lesson.
          </Text>
          {/* Nothing that depends on the answer renders while we are still
              deciding, so no line flashes and then changes. */}
          {outcome === 'retry' && (
            <>
              <Text style={styles.messageSecondary}>
                Resist unlocking out of boredom.
              </Text>
              <Text style={styles.messageSecondary}>
                Using your phone less helps build focus and mindfulness.
              </Text>
            </>
          )}
        </Animated.View>

        {/* Button Section */}
        <Animated.View style={[styles.buttonRow, buttonAnimatedStyle]}>
          {deciding ? (
            <View style={styles.buttonSlot}>
              <ActivityIndicator
                testID="failed-quest-loading"
                accessibilityLabel="Checking what happens next"
                color={colors.text.primary}
              />
            </View>
          ) : (
            <Button
              label={stillOffered ? 'Try Again' : 'Continue'}
              onPress={onRetry}
              variant="primary"
              fullWidth
            />
          )}
        </Animated.View>
      </ScreenContainer>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.surface.overlay,
  },
  screenPadding: {
    // Top only — the bottom is ScreenContainer's, via `bottomPadding`.
    paddingTop: spacing[8],
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
  buttonSlot: {
    // Same height as the primary CTA that replaces it, so the layout holds.
    height: BUTTON_SLOT_HEIGHT,
    justifyContent: 'center',
  },
  buttonRow: {
    // Full-width CTA pinned at the bottom, matching screenPadding's side
    // margins (welcome.tsx's canonical full-width primary CTA pattern).
    paddingHorizontal: spacing[6],
  },
});
