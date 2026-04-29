import { usePostHog } from 'posthog-react-native';
import React from 'react';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';

import { type QuestOption } from '@/api/quest/types';
import { Button, View } from '@/components/ui';
import Colors from '@/components/ui/colors';

import { CARD_WIDTH } from '@/features/home/constants/home-constants';

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
    return (
      <Animated.View
        entering={FadeIn.duration(600).delay(200)}
        className="w-full items-center px-4"
      >
        {quest.isPremium && !hasPremiumAccess && (
          <PremiumCTATracker questId={quest.customId} type="storyline" />
        )}
        <Animated.View
          entering={FadeInDown.duration(600).delay(400)}
          style={{
            width: CARD_WIDTH,
            shadowColor: Colors.black,
            shadowOffset: { width: 0, height: 3 },
            shadowOpacity: 0.12,
            shadowRadius: 4,
            elevation: 6,
          }}
        >
          <Button
            label={
              quest.isPremium && !hasPremiumAccess
                ? 'Unlock full Vaedros storyline'
                : !hasStartedStoryline
                  ? 'Begin your journey'
                  : 'Start Quest'
            }
            onPress={() => {
              if (!quest.isPremium || hasPremiumAccess) {
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
            className={`h-16 justify-center rounded-xl p-3 ${
              quest.isPremium && !hasPremiumAccess
                ? 'bg-amber-400'
                : 'bg-primary-300'
            }`}
            textClassName="text-sm text-white text-center leading-snug"
            textStyle={{ fontWeight: '700' }}
          />
        </Animated.View>
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

    return (
      <Animated.View
        entering={FadeIn.duration(600).delay(200)}
        className="w-full items-center px-4"
      >
        <Animated.View
          entering={FadeInDown.duration(600).delay(400)}
          style={{
            width: CARD_WIDTH,
            shadowColor: Colors.black,
            shadowOffset: { width: 0, height: 3 },
            shadowOpacity: 0.12,
            shadowRadius: 4,
            elevation: 6,
          }}
        >
          <Button
            label={
              questIsPremium && !hasPremiumAccess
                ? 'Unlock full Vaedros storyline'
                : option.text
            }
            onPress={() => {
              if (questIsPremium && !hasPremiumAccess) {
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
            className={`h-16 justify-center rounded-xl p-3 ${
              questIsPremium && !hasPremiumAccess
                ? 'bg-amber-400'
                : 'bg-primary-300'
            }`}
            textClassName="text-sm text-white text-center leading-snug"
            textStyle={{ fontWeight: '700' }}
            disabled={!option.nextQuestId}
          />
        </Animated.View>
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
        <Animated.View
          entering={FadeInDown.duration(600).delay(400)}
          style={{
            width: CARD_WIDTH,
            shadowColor: Colors.black,
            shadowOffset: { width: 0, height: 3 },
            shadowOpacity: 0.12,
            shadowRadius: 4,
            elevation: 6,
          }}
        >
          <Button
            label="Unlock full Vaedros storyline"
            onPress={onShowPaywall}
            className="h-16 justify-center rounded-xl bg-amber-400 p-3"
            textClassName="text-sm text-white text-center leading-snug"
            textStyle={{ fontWeight: '700' }}
          />
        </Animated.View>
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

          return (
            <Animated.View
              key={option.id}
              entering={FadeInDown.duration(600).delay(400 + index * 100)}
              className="flex-1"
              style={{
                shadowColor: Colors.black,
                shadowOffset: { width: 0, height: 3 },
                shadowOpacity: 0.12,
                shadowRadius: 4,
                elevation: 6,
              }}
            >
              {questIsPremium && !hasPremiumAccess && (
                <PremiumCTATracker
                  questId={option.nextQuestId || undefined}
                  type="storyline"
                />
              )}
              <Button
                label={
                  questIsPremium && !hasPremiumAccess
                    ? 'Unlock full Vaedros storyline'
                    : option.text
                }
                onPress={() => {
                  if (questIsPremium && !hasPremiumAccess) {
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
                className={`h-16 justify-center rounded-xl p-3 ${
                  questIsPremium && !hasPremiumAccess
                    ? 'bg-amber-400'
                    : index === 0
                      ? 'bg-neutral-300'
                      : 'bg-primary-300'
                }`}
                textClassName="text-sm text-white text-center leading-snug"
                textStyle={{ fontWeight: '700' }}
                disabled={!option.nextQuestId}
              />
            </Animated.View>
          );
        })}
      </View>
    </Animated.View>
  );
}
