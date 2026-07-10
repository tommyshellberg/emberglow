import { usePostHog } from 'posthog-react-native';
import React from 'react';
import { View } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';

import { type QuestOption } from '@/api/quest/types';
import { Badge, Button, type ButtonVariant } from '@/components/emberglow';
import { CARD_WIDTH } from '@/features/home/constants/home-constants';
import { shadows } from '@/theme';

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
 * A single story CTA — the shadowed, fixed-width (or flexed, for side-by-side
 * options) wrapper around an Emberglow `Button`, plus a premium-lock `Badge`
 * when the destination quest requires premium. Emberglow's `Button` has no
 * premium-locked variant (ground rule 4), so the lock is communicated via
 * the label text (unchanged) and this badge rather than a color swap.
 */
function StoryCTA({
  label,
  onPress,
  disabled,
  variant,
  isPremiumLocked,
  flex,
  delay,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  variant: ButtonVariant;
  isPremiumLocked: boolean;
  flex?: boolean;
  delay: number;
}) {
  return (
    <Animated.View
      entering={FadeInDown.duration(600).delay(delay)}
      style={[flex ? { flex: 1 } : { width: CARD_WIDTH }, shadows.card]}
    >
      {isPremiumLocked && (
        <View style={{ alignSelf: 'flex-start', marginBottom: 6 }}>
          <Badge tone="warm">⭐ Premium</Badge>
        </View>
      )}
      <Button
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

  // Single server quest with no branching - show start button
  if (serverQuests.length === 1 && storyOptions.length === 0) {
    const quest = serverQuests[0];
    const isPremiumLocked = Boolean(quest.isPremium) && !hasPremiumAccess;
    return (
      <Animated.View
        entering={FadeIn.duration(600).delay(200)}
        className="w-full items-center px-4"
      >
        {isPremiumLocked && (
          <PremiumCTATracker questId={quest.customId} type="storyline" />
        )}
        <StoryCTA
          label={
            isPremiumLocked
              ? 'Unlock full Vaedros storyline'
              : !hasStartedStoryline
                ? 'Begin your journey'
                : 'Start Quest'
          }
          onPress={() => {
            if (!isPremiumLocked) {
              onQuestSelect(quest.customId);
            } else {
              posthog.capture('premium_upsell_cta_clicked', {
                upsell_type: 'storyline_quest',
                trigger_location: 'home_storyline',
                quest_type: 'story',
                quest_id: quest.customId,
              });
              onShowPaywall();
            }
          }}
          variant="primary"
          isPremiumLocked={isPremiumLocked}
          delay={400}
        />
      </Animated.View>
    );
  }

  // No options available
  if (storyOptions.length === 0) {
    return null;
  }

  // Single option
  if (storyOptions.length === 1) {
    const option = storyOptions[0];
    const nextQuest =
      option.nextQuest ||
      serverQuests.find((q) => q.customId === option.nextQuestId);
    const questIsPremium = nextQuest?.isPremium || false;
    const isPremiumLocked = questIsPremium && !hasPremiumAccess;

    return (
      <Animated.View
        entering={FadeIn.duration(600).delay(200)}
        className="w-full items-center px-4"
      >
        <StoryCTA
          label={
            isPremiumLocked ? 'Unlock full Vaedros storyline' : option.text
          }
          onPress={() => {
            if (isPremiumLocked) {
              posthog.capture('premium_upsell_cta_clicked', {
                upsell_type: 'storyline_quest',
                trigger_location: 'home_storyline_options',
                quest_type: 'story',
                quest_id: option.nextQuestId,
              });
              onShowPaywall();
            } else {
              onQuestSelect(option.nextQuestId);
            }
          }}
          variant="primary"
          isPremiumLocked={isPremiumLocked}
          disabled={!option.nextQuestId}
          delay={400}
        />
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

  // If any options are premium and user doesn't have access, show single unlock button
  if (anyOptionsPremium && !hasPremiumAccess) {
    return (
      <Animated.View
        entering={FadeIn.duration(600).delay(200)}
        className="w-full items-center px-4"
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

  // Multiple options - render side by side
  return (
    <Animated.View
      entering={FadeIn.duration(600).delay(200)}
      className="w-full items-center px-4"
    >
      <View className="w-full flex-row justify-between gap-3">
        {storyOptions.map((option: QuestOption, index: number) => {
          const nextQuest =
            option.nextQuest ||
            serverQuests.find((q) => q.customId === option.nextQuestId);
          const questIsPremium = nextQuest?.isPremium || false;
          const isPremiumLocked = questIsPremium && !hasPremiumAccess;

          return (
            <React.Fragment key={option.id}>
              {isPremiumLocked && (
                <PremiumCTATracker
                  questId={option.nextQuestId || undefined}
                  type="storyline"
                />
              )}
              <StoryCTA
                label={
                  isPremiumLocked
                    ? 'Unlock full Vaedros storyline'
                    : option.text
                }
                onPress={() => {
                  if (isPremiumLocked) {
                    posthog.capture('premium_upsell_cta_clicked', {
                      upsell_type: 'storyline_quest',
                      trigger_location: 'home_storyline_options',
                      quest_type: 'story',
                      quest_id: option.nextQuestId,
                    });
                    onShowPaywall();
                  } else {
                    onQuestSelect(option.nextQuestId);
                  }
                }}
                variant={
                  isPremiumLocked
                    ? 'primary'
                    : index === 0
                      ? 'secondary'
                      : 'primary'
                }
                isPremiumLocked={isPremiumLocked}
                disabled={!option.nextQuestId}
                flex
                delay={400 + index * 100}
              />
            </React.Fragment>
          );
        })}
      </View>
    </Animated.View>
  );
}
