import React from 'react';
import { ScrollView } from 'react-native';

import { BackgroundImage, ScreenContainer, View } from '@/components/ui';
import { CompactRewardBreakdown } from '@/features/quest-result/components';
import { useCustomQuestStory } from '@/hooks/useCustomQuestStory';
import { calculatePerkBonuses } from '@/lib/perks';
import { getCurrentUserRewards } from '@/lib/utils/quest-utils';
import { useUserStore } from '@/store/user-store';

import { QuestCompleteActions } from './quest-complete/QuestCompleteActions';
import { QuestCompleteHeader } from './quest-complete/QuestCompleteHeader';
import { QuestCompleteStory } from './quest-complete/QuestCompleteStory';
import type { QuestCompleteProps } from './quest-complete/types';

export function QuestComplete({
  quest,
  story,
  onContinue,
  continueText = 'Continue',
  showActionButton = true,
  disableEnteringAnimations = false,
}: QuestCompleteProps) {
  const customStory = useCustomQuestStory(quest);
  const displayStory = customStory || story;
  const currentUserId = useUserStore((state) => state.user?.id);

  // Get reward breakdown data if perks were applied
  const rewardsData = getCurrentUserRewards(quest, currentUserId);
  const perksWithBonuses = rewardsData
    ? calculatePerkBonuses(
        rewardsData.baseXP,
        rewardsData.adjustedXP,
        rewardsData.perksApplied
      )
    : [];

  return (
    <View className="relative flex-1">
      {/* Background Image */}
      <BackgroundImage
        source={require('@/../assets/images/background/pending-quest-bg-alt.jpg')}
      >
        {/* Semi-transparent overlay */}
        <View className="bg-background-light/80 absolute inset-0" />
      </BackgroundImage>

      {/* Content */}
      <ScreenContainer fullScreen className="px-4">
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, alignItems: 'center' }}
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          <QuestCompleteHeader
            quest={quest}
            disableAnimations={disableEnteringAnimations}
          />

          <View className="w-full px-2">
            <QuestCompleteStory
              story={displayStory}
              quest={quest}
              disableAnimations={disableEnteringAnimations}
            />
          </View>

          {/* Compact reward breakdown - after story, before actions */}
          {rewardsData && perksWithBonuses.length > 0 && (
            <View className="mt-3 w-full px-2">
              <CompactRewardBreakdown
                baseXP={rewardsData.baseXP}
                adjustedXP={rewardsData.adjustedXP}
                perksApplied={perksWithBonuses}
              />
            </View>
          )}

          {showActionButton && (
            <QuestCompleteActions
              quest={quest}
              onContinue={onContinue}
              continueText={continueText}
              disableAnimations={disableEnteringAnimations}
            />
          )}
        </ScrollView>
      </ScreenContainer>
    </View>
  );
}

// Re-export types for convenience
export type { QuestCompleteProps } from './quest-complete/types';
