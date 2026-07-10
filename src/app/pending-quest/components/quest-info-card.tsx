import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { type QuestRewardPreviewResponse } from '@/api/quest-runs/types';
import { getCharacterAvatar } from '@/app/utils/character-utils';
import { Badge, QuestCard } from '@/components/emberglow';
import { RewardPreviewCard } from '@/components/quest-preview';
import { colors, fontFamily, radii, shadows, spacing } from '@/theme';

import { ANIMATION_CONFIG, TEST_IDS } from '../constants';
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
  const formattedDuration = `${quest.durationMinutes} min`;

  return (
    <View>
      {/* Header art — Emberglow QuestCard's image/scrim pattern, character
          avatar standing in for hand-painted quest art. Duration is shown
          via our own Badge overlay (below) rather than QuestCard's built-in
          duration line, since that line can't render the strikethrough
          original-vs-reduced treatment perks require. Placed at the top,
          matching QuestCard's own content box which anchors to the bottom
          (see src/components/home/quest-card.tsx for the same pattern). */}
      <View style={styles.headerWrapper}>
        <QuestCard
          testID={TEST_IDS.QUEST_CARD}
          title={quest.title}
          image={getCharacterAvatar(character?.type)}
        />
        <View style={styles.durationOverlay} pointerEvents="none">
          {hasDurationReduction ? (
            <>
              <Text
                style={styles.originalDuration}
                accessibilityLabel={`Original duration: ${quest.durationMinutes} minutes`}
              >
                {formattedDuration}
              </Text>
              <Badge tone="warm">{`${adjustedDuration} min`}</Badge>
            </>
          ) : (
            <Badge tone="neutral">{formattedDuration}</Badge>
          )}
        </View>
      </View>

      <View style={styles.body}>
        {/* Subtitle */}
        <Animated.Text
          entering={FadeInDown.delay(
            ANIMATION_CONFIG.QUEST_SUBTITLE_DELAY
          ).duration(ANIMATION_CONFIG.QUEST_INFO_FADE_DURATION)}
          style={styles.subtitle}
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
            style={styles.loadingRow}
          >
            <ActivityIndicator color={colors.text.accent} />
            <Text style={styles.loadingText}>Loading rewards...</Text>
          </Animated.View>
        ) : rewardPreview && rewardPreview.participantRewards.length > 0 ? (
          <Animated.View
            entering={FadeInDown.delay(
              ANIMATION_CONFIG.QUEST_SUBTITLE_DELAY + 200
            ).duration(ANIMATION_CONFIG.QUEST_INFO_FADE_DURATION)}
          >
            <RewardPreviewCard
              participant={rewardPreview.participantRewards[0]}
            />
          </Animated.View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  headerWrapper: {
    position: 'relative',
  },
  durationOverlay: {
    position: 'absolute',
    top: spacing[3],
    right: spacing[3],
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  originalDuration: {
    fontFamily: fontFamily.regular,
    fontSize: 13,
    color: colors.text.muted,
    textDecorationLine: 'line-through',
  },
  body: {
    marginTop: spacing[4],
    padding: spacing[6],
    borderRadius: radii.lg,
    backgroundColor: colors.surface.raised,
    gap: spacing[4],
    ...shadows.raised,
  },
  subtitle: {
    fontFamily: fontFamily.regular,
    fontSize: 15,
    lineHeight: 21,
    color: colors.text.secondary,
  },
  loadingRow: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing[8],
  },
  loadingText: {
    marginTop: spacing[2],
    fontFamily: fontFamily.regular,
    fontSize: 13,
    color: colors.text.secondary,
  },
});
