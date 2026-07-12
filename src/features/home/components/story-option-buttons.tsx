import { usePostHog } from 'posthog-react-native';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';

import { type QuestOption } from '@/api/quest/types';
import {
  Badge,
  Button,
  type ButtonVariant,
  DecisionSlider,
} from '@/components/emberglow';
import { CARD_WIDTH } from '@/features/home/constants/home-constants';
import { shadows, spacing } from '@/theme';

interface ServerQuest {
  customId: string;
  isPremium?: boolean;
  [key: string]: any;
}

interface StoryOptionButtonsProps {
  activeIndex: number;
  serverQuests: ServerQuest[];
  storyOptions: QuestOption[];
  hasStartedStoryline: boolean;
  hasPremiumAccess: boolean;
  onQuestSelect: (questId: string | null) => void;
  onShowPaywall: () => void;
}

// Component for tracking premium CTA views
const PremiumCTATracker = ({
  questId,
  type,
}: {
  questId?: string;
  type: 'storyline' | 'cooperative';
}) => {
  const posthog = usePostHog();

  React.useEffect(() => {
    if (type === 'storyline') {
      posthog.capture('premium_upsell_cta_viewed', {
        upsell_type: 'storyline_quest',
        trigger_location: 'home_storyline',
        quest_type: 'story',
        quest_id: questId,
      });
    }
  }, [questId, type, posthog]);

  return null;
};

/**
 * A single story CTA — the shadowed, fixed-width wrapper around an
 * Emberglow `Button`, plus a premium-lock `Badge` when the destination
 * quest requires premium. Emberglow's `Button` has no premium-locked
 * variant (ground rule 4), so the lock is communicated via the label text
 * (unchanged) and this badge rather than a color swap.
 *
 * Now used only for the premium-locked / paywall branches — non-premium
 * story decisions render `DecisionSlider` instead (see `StoryDecision`
 * below).
 */
function StoryCTA({
  label,
  onPress,
  disabled,
  variant,
  isPremiumLocked,
  delay,
  testID,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  variant: ButtonVariant;
  isPremiumLocked: boolean;
  delay: number;
  testID?: string;
}) {
  return (
    <Animated.View
      testID={testID}
      entering={FadeInDown.duration(600).delay(delay)}
      style={[{ width: CARD_WIDTH }, shadows.card]}
    >
      {isPremiumLocked && (
        <View style={styles.premiumBadge}>
          <Badge tone="warm">Premium</Badge>
        </View>
      )}
      <Button
        testID={testID ? `${testID}-button` : undefined}
        label={label}
        onPress={onPress}
        disabled={disabled}
        variant={variant}
        size="lg"
        fullWidth
      />
    </Animated.View>
  );
}

/**
 * Entrance wrapper for a `DecisionSlider` CTA — mirrors `StoryCTA`'s
 * `FadeInDown` choreography (same 600ms duration / delay convention) but
 * without the `CARD_WIDTH`/`shadows.card` treatment: the slider is a single
 * full-width block (decisionSlider README), not a button pill.
 */
function StoryDecision({
  children,
  delay,
}: {
  children: React.ReactNode;
  delay: number;
}) {
  return (
    <Animated.View
      entering={FadeInDown.duration(600).delay(delay)}
      style={styles.decisionWrapper}
    >
      {children}
    </Animated.View>
  );
}

/**
 * The two-choice story decision. `DecisionSlider` locks after a commit and
 * has no way to disable just one side — if a commit lands on the side
 * missing `nextQuestId` (a rare data-integrity edge case; today's Button
 * row instead renders that one side disabled while the other stays
 * usable), routing a `null` questId would be wrong and the now-locked
 * slider would dead-end the player with no way to retry. Treat that commit
 * as a no-op and remount the slider (via `key`) so it's interactive again
 * instead of stuck on a route to nowhere.
 */
function TwoChoiceDecision({
  optionA,
  optionB,
  onQuestSelect,
  testID,
}: {
  optionA: QuestOption;
  optionB: QuestOption;
  /** Never called with null — the dead-side guard filters that out. */
  onQuestSelect: (questId: string) => void;
  testID?: string;
}) {
  const [resetKey, setResetKey] = React.useState(0);
  const options = [optionA, optionB] as const;

  return (
    <DecisionSlider
      key={resetKey}
      testID={testID}
      choices={[optionA.text, optionB.text]}
      onCommit={(index) => {
        const nextQuestId = options[index].nextQuestId;
        if (!nextQuestId) {
          setResetKey((n) => n + 1);
          return;
        }
        onQuestSelect(nextQuestId);
      }}
    />
  );
}

export function StoryOptionButtons({
  activeIndex,
  serverQuests,
  storyOptions,
  hasStartedStoryline,
  hasPremiumAccess,
  onQuestSelect,
  onShowPaywall,
}: StoryOptionButtonsProps) {
  const posthog = usePostHog();

  // Only show for story mode (carousel index 0)
  if (activeIndex !== 0) return null;

  // Single server quest with no branching — hold-to-commit slider (or the
  // premium unlock button, unchanged).
  if (serverQuests.length === 1 && storyOptions.length === 0) {
    const quest = serverQuests[0];
    const isPremiumLocked = Boolean(quest.isPremium) && !hasPremiumAccess;

    if (isPremiumLocked) {
      return (
        <Animated.View
          entering={FadeIn.duration(600).delay(200)}
          style={styles.container}
        >
          <PremiumCTATracker questId={quest.customId} type="storyline" />
          <StoryCTA
            label="Unlock full Vaedros storyline"
            onPress={() => {
              posthog.capture('premium_upsell_cta_clicked', {
                upsell_type: 'storyline_quest',
                trigger_location: 'home_storyline',
                quest_type: 'story',
                quest_id: quest.customId,
              });
              onShowPaywall();
            }}
            variant="primary"
            isPremiumLocked
            delay={400}
          />
        </Animated.View>
      );
    }

    return (
      <Animated.View
        entering={FadeIn.duration(600).delay(200)}
        style={styles.container}
      >
        <StoryDecision delay={400}>
          <DecisionSlider
            // Fresh decision (new quest) -> fresh, unlocked slider instance,
            // matching the two-choice wrapper's identity semantics.
            key={quest.customId}
            choices={[
              !hasStartedStoryline ? 'Begin your journey' : 'Start Quest',
            ]}
            onCommit={() => onQuestSelect(quest.customId)}
          />
        </StoryDecision>
      </Animated.View>
    );
  }

  // No options available
  if (storyOptions.length === 0) {
    return null;
  }

  // Single option — hold-to-commit slider (or the premium unlock button,
  // unchanged).
  if (storyOptions.length === 1) {
    const option = storyOptions[0];
    const nextQuest =
      option.nextQuest ||
      serverQuests.find((q) => q.customId === option.nextQuestId);
    const questIsPremium = nextQuest?.isPremium || false;
    const isPremiumLocked = questIsPremium && !hasPremiumAccess;

    if (isPremiumLocked) {
      return (
        <Animated.View
          entering={FadeIn.duration(600).delay(200)}
          style={styles.container}
        >
          <StoryCTA
            label="Unlock full Vaedros storyline"
            onPress={() => {
              posthog.capture('premium_upsell_cta_clicked', {
                upsell_type: 'storyline_quest',
                trigger_location: 'home_storyline_options',
                quest_type: 'story',
                quest_id: option.nextQuestId,
              });
              onShowPaywall();
            }}
            variant="primary"
            isPremiumLocked
            disabled={!option.nextQuestId}
            delay={400}
          />
        </Animated.View>
      );
    }

    return (
      <Animated.View
        entering={FadeIn.duration(600).delay(200)}
        style={styles.container}
      >
        <StoryDecision delay={400}>
          <DecisionSlider
            // Fresh decision (new option) -> fresh, unlocked slider instance,
            // matching the two-choice wrapper's identity semantics.
            key={option.id}
            choices={[option.text]}
            onCommit={() => onQuestSelect(option.nextQuestId)}
            disabled={!option.nextQuestId}
          />
        </StoryDecision>
      </Animated.View>
    );
  }

  // Check if any options lead to premium content
  const anyOptionsPremium = storyOptions.some((option) => {
    const nextQuest =
      option.nextQuest ||
      serverQuests.find((q) => q.customId === option.nextQuestId);
    return nextQuest?.isPremium || false;
  });

  // If any options are premium and user doesn't have access, show single
  // unlock button — unchanged.
  if (anyOptionsPremium && !hasPremiumAccess) {
    return (
      <Animated.View
        entering={FadeIn.duration(600).delay(200)}
        style={styles.container}
      >
        <StoryCTA
          label="Unlock full Vaedros storyline"
          onPress={onShowPaywall}
          variant="primary"
          isPremiumLocked
          delay={400}
        />
      </Animated.View>
    );
  }

  // Two options, unlocked — drag-to-commit slider. Local quest data
  // confirms the spec invariant of exactly one or two options per branch
  // (never more), so this fallback is always exactly two.
  const [optionA, optionB] = storyOptions;

  return (
    <Animated.View
      entering={FadeIn.duration(600).delay(200)}
      style={styles.container}
    >
      <StoryDecision delay={400}>
        <TwoChoiceDecision
          key={`${optionA.id}-${optionB.id}`}
          optionA={optionA}
          optionB={optionB}
          onQuestSelect={onQuestSelect}
          testID={`story-option-${optionA.id}-${optionB.id}`}
        />
      </StoryDecision>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    alignItems: 'center',
    // Local padding is on top of ScreenContainer's own 16pt inset. The
    // CARD_WIDTH-based StoryCTA buttons below are wider than the resulting
    // content box and self-center via overflow, so their rendered inset
    // from the true screen edge is unaffected by this value (always nets
    // out to the deck's 20pt — verified by inspection). DecisionSlider has
    // no fixed width, so it *does* respect this padding: spacing[2] (8pt)
    // combined with ScreenContainer's 16pt lands it at a 24pt inset,
    // matching the decisionSlider README's 24pt side padding at 390pt
    // design width exactly.
    paddingHorizontal: spacing[2],
  },
  decisionWrapper: {
    width: '100%',
  },
  premiumBadge: {
    alignSelf: 'flex-start',
    marginBottom: 6,
  },
});
