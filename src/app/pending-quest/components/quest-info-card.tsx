import { Clock } from 'lucide-react-native';
import React from 'react';
import { ActivityIndicator, Image, type ImageStyle } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { type QuestRewardPreviewResponse } from '@/api/quest-runs/types';
import { getCharacterAvatar } from '@/app/utils/character-utils';
import { RewardPreviewCard } from '@/components/quest-preview';
import { Card, Text, View } from '@/components/ui';
import colors from '@/components/ui/colors';

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
  const hasDurationReduction =
    adjustedDuration != null &&
    adjustedDuration !== quest.durationMinutes &&
    adjustedDuration < quest.durationMinutes;

  return (
    <Card testID={TEST_IDS.QUEST_CARD}>
      {/* Custom Header with Image and Overlays */}
      <View
        style={{
          height: UI_CONFIG.HEADER_IMAGE_HEIGHT,
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        {/* Character Image - positioned at top, not centered */}
        <Image
          source={getCharacterAvatar(character?.type)}
          style={
            {
              width: '100%',
              height: UI_CONFIG.HEADER_IMAGE_HEIGHT * 1.5,
              position: 'absolute',
              top: 0,
              left: 0,
            } as ImageStyle
          }
          resizeMode="cover"
        />

        {/* White tint overlay (matching Card component) */}
        <View
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(255, 255, 255, 0.1)',
          }}
        />

        {/* Gradient overlay for text readability */}
        <View
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: 80,
            backgroundColor: 'rgba(0, 0, 0, 0.4)',
          }}
        />

        {/* Title Overlay - Top Left */}
        <Animated.View
          entering={FadeInDown.delay(
            ANIMATION_CONFIG.QUEST_TITLE_DELAY
          ).duration(ANIMATION_CONFIG.QUEST_INFO_FADE_DURATION)}
          style={{
            position: 'absolute',
            top: 16,
            left: 16,
            right: 80,
          }}
        >
          <Text
            className="text-xl font-bold text-white"
            style={{ fontWeight: '700', textShadowColor: 'rgba(0, 0, 0, 0.5)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3 }}
            accessibilityRole="header"
            accessibilityLabel={`Quest title: ${quest.title}`}
            numberOfLines={2}
          >
            {quest.title}
          </Text>
        </Animated.View>

        {/* Duration Overlay - Top Right */}
        <Animated.View
          entering={FadeInDown.delay(
            ANIMATION_CONFIG.QUEST_TITLE_DELAY
          ).duration(ANIMATION_CONFIG.QUEST_INFO_FADE_DURATION)}
          style={{
            position: 'absolute',
            top: 16,
            right: 16,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            borderRadius: 8,
            paddingHorizontal: 10,
            paddingVertical: 6,
            flexDirection: 'row',
            alignItems: 'center',
          }}
        >
          <Clock size={UI_CONFIG.DURATION_OVERLAY_ICON_SIZE} color={colors.white} />
          {hasDurationReduction ? (
            <View className="ml-2 flex-row items-baseline">
              <Text
                className="text-base text-neutral-400"
                style={{ textDecorationLine: 'line-through' }}
                accessibilityLabel={`Original duration: ${quest.durationMinutes} minutes`}
              >
                {quest.durationMinutes}
              </Text>
              <Text
                className="mx-1 text-base font-bold"
                style={{ color: colors.primary[400] }}
                accessibilityLabel={`Reduced duration: ${adjustedDuration} minutes`}
              >
                {adjustedDuration} min
              </Text>
            </View>
          ) : (
            <Text
              className="ml-2 text-base font-semibold text-white"
              accessibilityLabel={`Duration: ${quest.durationMinutes} minutes`}
            >
              {quest.durationMinutes} min
            </Text>
          )}
        </Animated.View>
      </View>

      <View className="p-6">
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
