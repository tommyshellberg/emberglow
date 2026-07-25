import { LinearGradient } from 'expo-linear-gradient';
import { usePostHog } from 'posthog-react-native';
import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { type QuestTemplate, useNextAvailableQuests } from '@/api/quest';
import { AVAILABLE_QUESTS } from '@/app/data/quests';
import { DecisionSlider, EyebrowLabel } from '@/components/emberglow';
import { EmberProgress } from '@/components/onboarding/ember-progress';
import { BackgroundImage, FocusAwareStatusBar } from '@/components/ui';
import { audioCacheService } from '@/lib/services/audio-cache.service';
import QuestTimer from '@/lib/services/quest-timer';
import { useCharacterStore } from '@/store/character-store';
import { useQuestStore } from '@/store/quest-store';
import type { StoryQuestTemplate } from '@/store/types';
import {
  colors,
  durations,
  easing,
  fontFamily,
  scrims,
  spacing,
} from '@/theme';
import { getQuestAudioPath } from '@/utils/audio-utils';

// prototypes/onboarding/onboarding-screens.jsx HookScreen, lines 258-281.
const HERO_NAME_FALLBACK = 'stranger';
const CONTENT_PADDING_TOP = 54;
const CONTENT_PADDING_BOTTOM = 36;
const TITLE_FONT_SIZE = 36;
// Mockup constrains the narrative body to `34ch` — approximated in points
// (same ratio as verify.tsx's ERROR_BODY_MAX_WIDTH: 240px / 28ch).
const NARRATIVE_MAX_WIDTH = 291;
const NARRATIVE_FONT_SIZE = 16;
const INSTRUCTION_FONT_SIZE = 14;
// One step below the instruction line — a hint, not an instruction.
const HOLD_HINT_FONT_SIZE = 13;

// Staged fade+rise entrance — converges the screen's former 4-stage
// bespoke-spring choreography onto the phase's standard pattern
// (withDelay/withTiming + easing.emberOut), keeping 4 stages: progress,
// hook text, instruction line, CTA.
const STAGE_STAGGER = durations.fast; // 150ms between each stage
const STAGE_DURATION = durations.slow; // 600ms fade+rise per stage
// `: number` widens spacing's literal type for useSharedValue.
const RISE_DISTANCE: number = spacing[4]; // 16 — gentle rise distance

// Discoverability breathe on the hold hint — the orb below reads as inert
// "dark glass" at rest (DecisionSlider's resting pulse peaks at only 12%), so
// this ember-like fade draws the eye to the hold affordance. Half-cycle is
// close to the orb's own 1100ms pulse so caption and ember feel kin; the
// `Easing.inOut(Easing.sin)` shape matches the orb's breathe exactly. Kicks in
// only after the CTA entrance stage settles, and yields to reduce-motion (the
// orb stops its pulse there too — the warm Sandy color carries salience alone).
const HINT_BREATHE_MS = 1400;
const HINT_BREATHE_MIN_OPACITY = 0.55;
const HINT_BREATHE_MAX_OPACITY = 1;
// CTA stage starts at STAGE_STAGGER*3, then STAGE_DURATION to settle — begin
// the breathe after that so the entrance fade-in owns the intro cleanly.
const HINT_BREATHE_DELAY = STAGE_STAGGER * 3 + STAGE_DURATION;

// story/recap/options are required on StoryQuestTemplate but optional on the
// server's QuestTemplate. Every real story quest (including quest-1, the
// very first one - see app/data/quests.ts) always populates these, so treat
// a quest missing any of them as malformed server data rather than
// rendering blank narrative content.
function isCompleteStoryQuest(
  quest: QuestTemplate
): quest is QuestTemplate &
  Required<Pick<QuestTemplate, 'story' | 'recap' | 'options'>> {
  return !!quest.story && !!quest.recap && !!quest.options;
}

export default function FirstQuestScreen() {
  const prepareQuest = useQuestStore((state) => state.prepareQuest);
  const setServerAvailableQuests = useQuestStore(
    (state) => state.setServerAvailableQuests
  );
  const heroName = useCharacterStore(
    (state) => state.character?.name ?? HERO_NAME_FALLBACK
  );

  // Fetch the first quest from server
  const { data: questData } = useNextAvailableQuests();

  const posthog = usePostHog();

  // Entrance animation values — see STAGE_* constants above.
  const progressOpacity = useSharedValue(0);
  const progressTranslateY = useSharedValue(-RISE_DISTANCE);

  const textOpacity = useSharedValue(0);
  const textTranslateY = useSharedValue(RISE_DISTANCE);

  const instructionOpacity = useSharedValue(0);
  const instructionTranslateY = useSharedValue(RISE_DISTANCE);

  const buttonOpacity = useSharedValue(0);
  const buttonTranslateY = useSharedValue(RISE_DISTANCE);

  // Steady-state breathe on the hold hint (starts at full so the entrance
  // fade-in owns the intro; the repeat is armed post-entrance below).
  const reduceMotion = useReducedMotion();
  const hintOpacity = useSharedValue(HINT_BREATHE_MAX_OPACITY);

  useEffect(() => {
    posthog.capture('onboarding_open_first_quest_screen');

    // Preload audio for the first quest
    const preloadFirstQuestAudio = async () => {
      try {
        const firstStoryQuest = AVAILABLE_QUESTS.find(
          (quest) => quest.mode === 'story'
        );

        if (firstStoryQuest && firstStoryQuest.id) {
          const audioPath = getQuestAudioPath(firstStoryQuest.id, 'vaedros');
          await audioCacheService.preloadAudio([audioPath]);
        }
      } catch (error) {
        console.warn('Failed to preload first quest audio:', error);
      }
    };

    preloadFirstQuestAudio();
  }, [posthog]);

  // Start the staged entrance animation on mount.
  useEffect(() => {
    const timingConfig = {
      duration: STAGE_DURATION,
      easing: Easing.bezier(...easing.emberOut),
    };

    progressOpacity.value = withTiming(1, timingConfig);
    progressTranslateY.value = withTiming(0, timingConfig);

    textOpacity.value = withDelay(STAGE_STAGGER, withTiming(1, timingConfig));
    textTranslateY.value = withDelay(
      STAGE_STAGGER,
      withTiming(0, timingConfig)
    );

    instructionOpacity.value = withDelay(
      STAGE_STAGGER * 2,
      withTiming(1, timingConfig)
    );
    instructionTranslateY.value = withDelay(
      STAGE_STAGGER * 2,
      withTiming(0, timingConfig)
    );

    buttonOpacity.value = withDelay(
      STAGE_STAGGER * 3,
      withTiming(1, timingConfig)
    );
    buttonTranslateY.value = withDelay(
      STAGE_STAGGER * 3,
      withTiming(0, timingConfig)
    );
  }, [
    buttonOpacity,
    buttonTranslateY,
    instructionOpacity,
    instructionTranslateY,
    progressOpacity,
    progressTranslateY,
    textOpacity,
    textTranslateY,
  ]);

  // Arm the infinite hold-hint breathe once, after the entrance settles.
  // Reduce-motion holds it static at full opacity — parity with the orb
  // below, whose resting pulse is also suppressed under reduce-motion.
  useEffect(() => {
    if (reduceMotion) {
      hintOpacity.value = HINT_BREATHE_MAX_OPACITY;
      return;
    }
    const breatheConfig = {
      duration: HINT_BREATHE_MS,
      easing: Easing.inOut(Easing.sin),
    };
    hintOpacity.value = withDelay(
      HINT_BREATHE_DELAY,
      withRepeat(
        withSequence(
          withTiming(HINT_BREATHE_MIN_OPACITY, breatheConfig),
          withTiming(HINT_BREATHE_MAX_OPACITY, breatheConfig)
        ),
        -1
      )
    );
  }, [hintOpacity, reduceMotion]);

  const progressStyle = useAnimatedStyle(() => ({
    opacity: progressOpacity.value,
    transform: [{ translateY: progressTranslateY.value }],
  }));

  const hintStyle = useAnimatedStyle(() => ({
    opacity: hintOpacity.value,
  }));

  const textStyle = useAnimatedStyle(() => ({
    opacity: textOpacity.value,
    transform: [{ translateY: textTranslateY.value }],
  }));

  const buttonStyle = useAnimatedStyle(() => ({
    opacity: buttonOpacity.value,
    transform: [{ translateY: buttonTranslateY.value }],
  }));

  // Update store when server quests are loaded
  useEffect(() => {
    if (questData?.quests) {
      setServerAvailableQuests(
        questData.quests,
        questData.hasMoreQuests || false,
        questData.storylineComplete || false
      );
    }
  }, [questData, setServerAvailableQuests]);

  // Handle starting the first quest
  const handleStartQuest = async () => {
    try {
      posthog.capture('onboarding_trigger_start_first_quest');

      // Use the first quest from server if available
      const firstStoryQuest = questData?.quests?.[0];

      if (firstStoryQuest && isCompleteStoryQuest(firstStoryQuest)) {
        // Convert server quest to client format
        const clientQuest: StoryQuestTemplate = {
          ...firstStoryQuest,
          id: firstStoryQuest.customId, // Use customId as the primary ID for client
          _id: firstStoryQuest._id, // Preserve MongoDB ID for questTemplateId
          mode: 'story' as const,
          // Server's QuestTemplate.poiSlug is optional; default to '' (the
          // same "no POI mapped yet" placeholder used in app/data/quests.ts)
          // when absent. quest-store.ts only calls revealLocation() when
          // poiSlug is truthy, so an empty string is a safe no-op default.
          poiSlug: firstStoryQuest.poiSlug ?? '',
        };

        // Prepare the quest in the store
        posthog.capture('onboarding_prepare_first_quest');
        prepareQuest(clientQuest);

        // Prepare the quest timer - wrap in try/catch to prevent errors
        try {
          await QuestTimer.prepareQuest(clientQuest);
          posthog.capture('onboarding_success_start_first_quest');
        } catch (error) {
          console.error('Error preparing quest timer:', error);
          // Continue with navigation even if timer setup fails
        }

        // Router will automatically navigate to pending-quest via the useEffect above
      } else {
        posthog.capture('onboarding_error_no_story_quest_found');
      }
    } catch (error) {
      posthog.capture('onboarding_error_start_first_quest');
      console.error('Error starting quest:', error);
    }
  };

  return (
    <View style={styles.flex}>
      <FocusAwareStatusBar />

      <BackgroundImage
        source={require('@/../assets/images/background/card-background-alt.jpg')}
      />

      {/* Scrims over the background art (HookScreen, lines 263-264) */}
      <LinearGradient
        pointerEvents="none"
        colors={scrims.top.colors}
        start={scrims.top.start}
        end={scrims.top.end}
        style={styles.scrimTop}
      />
      <LinearGradient
        pointerEvents="none"
        colors={scrims.bottom.colors}
        start={scrims.bottom.start}
        end={scrims.bottom.end}
        style={styles.scrimBottom}
      />

      <View style={styles.content}>
        <Animated.View style={progressStyle}>
          <EmberProgress current={5} />
        </Animated.View>

        <View style={styles.spacer} />

        {/* Bottom-anchored text block — no card container, text sits
            directly on the scrim (HookScreen). */}
        <Animated.View style={textStyle}>
          <EyebrowLabel tone="warm">Chapter one</EyebrowLabel>
          <Text style={styles.title}>The forest awakens</Text>
          <Text style={styles.narrative}>
            {`The kingdom of Vaedros is failing. Its people stare into glowing glass, and the old roads grow quiet. You, ${heroName}, wake beneath tall pines with no memory — only a pull toward the ember light on the horizon.`}
          </Text>
        </Animated.View>

        <Animated.View style={[buttonStyle, styles.buttonWrapper]}>
          {/* First-time users won't know the orb is a hold control — this
              hint enters with the CTA stage. Copy is provisional; the
              founder adjusts wording on the visual pass. */}
          <Animated.Text style={[styles.holdHint, hintStyle]}>
            Press and hold the ember to begin
          </Animated.Text>
          {/* Single-choice hold-to-commit (Task 28): the screen already
              leads with the "Chapter one" EyebrowLabel above, so the
              slider's own default eyebrow ("One path remains") is
              suppressed here to avoid doubling the device — a founder-
              flagged judgment call, reversible by dropping this prop. */}
          <DecisionSlider
            choices={['Wake up']}
            eyebrow={null}
            testID="wake-up-button"
            onCommit={handleStartQuest}
          />
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  scrimTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '30%',
  },
  scrimBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '72%',
  },
  content: {
    flex: 1,
    paddingTop: CONTENT_PADDING_TOP,
    paddingHorizontal: spacing[6],
    paddingBottom: CONTENT_PADDING_BOTTOM,
  },
  spacer: {
    flex: 1,
  },
  title: {
    fontFamily: fontFamily.display,
    fontSize: TITLE_FONT_SIZE,
    // Repo convention for Erstoria display text: fontSize * 1.15, not the
    // documented leading.display (1.12) — see pending-quest.tsx.
    lineHeight: TITLE_FONT_SIZE * 1.15,
    color: colors.text.primary,
    marginTop: 10,
  },
  narrative: {
    fontFamily: fontFamily.regular,
    fontSize: NARRATIVE_FONT_SIZE,
    lineHeight: NARRATIVE_FONT_SIZE * 1.6,
    color: colors.text.secondary,
    maxWidth: NARRATIVE_MAX_WIDTH,
    marginTop: 14,
  },
  instruction: {
    fontFamily: fontFamily.regular,
    fontSize: INSTRUCTION_FONT_SIZE,
    lineHeight: INSTRUCTION_FONT_SIZE * 1.5,
    color: colors.text.muted,
    marginTop: 14,
  },
  buttonWrapper: {
    // Reduced from the former Button's 26pt: the CTA stage is now the hint
    // line (~20pt + 8pt gap) + the single-choice slider block (eyebrow-less
    // label row + 60pt track zone + 14pt internal gap ≈ 98pt) — ~126pt total
    // vs. the 54pt Button it replaced (net ~+58pt after this 14pt trim).
    // The `spacer` above absorbs the slack on typical screens; small-screen
    // fit is only verifiable on-device.
    marginTop: 12,
  },
  holdHint: {
    fontFamily: fontFamily.regular,
    fontSize: HOLD_HINT_FONT_SIZE,
    lineHeight: HOLD_HINT_FONT_SIZE * 1.5,
    // Sandy (the "glow/highlight" ember tone), not muted bone: warms the hint
    // toward the literal "ember" it names and lifts it above the surrounding
    // muted body copy. Paired with the breathe above for discoverability.
    color: colors.accent.glow,
    textAlign: 'center',
    marginBottom: spacing[2],
  },
});
