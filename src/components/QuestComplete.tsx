import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { BackgroundImage, ScreenContainer } from '@/components/ui';
import { CompactRewardBreakdown } from '@/features/quest-result/components';
import { useCustomQuestStory } from '@/hooks/useCustomQuestStory';
import { calculatePerkBonuses } from '@/lib/perks';
import { getCurrentUserRewards } from '@/lib/utils/quest-utils';
import { useUserStore } from '@/store/user-store';
import { colors, spacing } from '@/theme';

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
    <View style={styles.flex}>
      {/* Background Image */}
      <BackgroundImage
        source={require('@/../assets/images/background/pending-quest-bg-alt.jpg')}
        tintClassName=""
      >
        {/* Darkening overlay for text legibility over the art, normalized
            to a theme token instead of a NativeWind class. */}
        <View style={styles.overlay} />
      </BackgroundImage>

      {/* Content */}
      <ScreenContainer fullScreen transparent>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          <QuestCompleteHeader
            quest={quest}
            disableAnimations={disableEnteringAnimations}
          />

          <View style={styles.storySection}>
            <QuestCompleteStory
              story={displayStory}
              quest={quest}
              disableAnimations={disableEnteringAnimations}
            />
          </View>

          {/* Compact reward breakdown - after story, before actions */}
          {rewardsData && perksWithBonuses.length > 0 && (
            <View style={styles.rewardSection}>
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

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.surface.overlay,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  storySection: {
    width: '100%',
    paddingHorizontal: spacing[2],
  },
  rewardSection: {
    marginTop: spacing[3],
    width: '100%',
    paddingHorizontal: spacing[2],
  },
});

// Re-export types for convenience
export type { QuestCompleteProps } from './quest-complete/types';
