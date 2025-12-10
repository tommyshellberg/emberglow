import React from 'react';
import { ActivityIndicator } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { type QuestRewardPreviewResponse } from '@/api/quest-runs/types';
import { getCharacterAvatar } from '@/app/utils/character-utils';
import { RewardPreviewCard } from '@/components/quest-preview';
import { Card, Text, View } from '@/components/ui';
import colors from '@/components/ui/colors';
import { DurationBadge } from '@/components/ui/duration-badge';

import { ANIMATION_CONFIG, TEST_IDS, UI_CONFIG } from '../constants';
import { type CharacterData, type PendingQuestData } from '../types';
import { getQuestSubtitle } from '../utils';

interface QuestInfoCardProps {
  quest: PendingQuestData;
  character: CharacterData | null;
  rewardPreview?: QuestRewardPreviewResponse;
  isLoadingPreview?: boolean;
}

/**
 * QuestInfoCard component
 *
 * Displays quest information including title, duration, and subtitle
 * with character avatar header image, plus reward preview if available
 */
export function QuestInfoCard({
  quest,
  character,
  rewardPreview,
  isLoadingPreview,
}: QuestInfoCardProps) {
  const subtitle = getQuestSubtitle(quest.mode);

  const adjustedDuration = rewardPreview?.effects.duration;

  return (
    <Card
      testID={TEST_IDS.QUEST_CARD}
      headerImage={getCharacterAvatar(character?.type)}
      headerImageStyle={{ height: UI_CONFIG.HEADER_IMAGE_HEIGHT }}
    >
      <View className="p-6">
        {/* Quest Title and Duration - Same Row */}
        <Animated.View
          entering={FadeInDown.delay(
            ANIMATION_CONFIG.QUEST_TITLE_DELAY
          ).duration(ANIMATION_CONFIG.QUEST_INFO_FADE_DURATION)}
          className="mb-1 flex-row items-baseline justify-between"
        >
          <Text
            className="flex-1 text-2xl font-bold text-white"
            style={{ fontWeight: '700' }}
            accessibilityRole="header"
            accessibilityLabel={`Quest title: ${quest.title}`}
          >
            {quest.title}
          </Text>
          <View className="ml-3">
            <DurationBadge
              duration={quest.durationMinutes}
              adjustedDuration={adjustedDuration}
              iconSize={UI_CONFIG.CLOCK_ICON_SIZE}
              iconColor={colors.secondary[300]}
            />
          </View>
        </Animated.View>

        {/* Subtitle */}
        <Animated.Text
          entering={FadeInDown.delay(
            ANIMATION_CONFIG.QUEST_SUBTITLE_DELAY
          ).duration(ANIMATION_CONFIG.QUEST_INFO_FADE_DURATION)}
          className="leading-relaxed text-neutral-200"
          accessibilityLabel={subtitle}
        >
          {subtitle}
        </Animated.Text>

        {/* Reward Preview */}
        {isLoadingPreview ? (
          <Animated.View
            entering={FadeInDown.delay(
              ANIMATION_CONFIG.QUEST_SUBTITLE_DELAY + 200
            ).duration(ANIMATION_CONFIG.QUEST_INFO_FADE_DURATION)}
            className="mt-4 items-center justify-center py-8"
          >
            <ActivityIndicator color={colors.primary[400]} />
            <Text className="mt-2 text-sm text-neutral-300">
              Loading rewards...
            </Text>
          </Animated.View>
        ) : rewardPreview && rewardPreview.participantRewards.length > 0 ? (
          <Animated.View
            entering={FadeInDown.delay(
              ANIMATION_CONFIG.QUEST_SUBTITLE_DELAY + 200
            ).duration(ANIMATION_CONFIG.QUEST_INFO_FADE_DURATION)}
            className="mt-4"
          >
            <RewardPreviewCard
              participant={rewardPreview.participantRewards[0]}
            />
          </Animated.View>
        ) : null}
      </View>
    </Card>
  );
}
