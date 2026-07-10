import { router } from 'expo-router';
import { Lock } from 'lucide-react-native';
import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useQuestRewardPreview } from '@/api/quest-runs';
import { Button, EyebrowLabel } from '@/components/emberglow';
import { BackgroundImage } from '@/components/ui';
import { getQuestModeLabel } from '@/lib/utils/quest-utils';
import { useCharacterStore } from '@/store/character-store';
import { useQuestStore } from '@/store/quest-store';
import { useUserStore } from '@/store/user-store';
import { colors, fontFamily, spacing, text } from '@/theme';

import { QuestInfoCard } from './pending-quest/components/quest-info-card';
import {
  ANIMATION_CONFIG,
  STRINGS,
  TEST_IDS,
  UI_CONFIG,
} from './pending-quest/constants';
import { usePendingQuestAnimations } from './pending-quest/hooks/use-pending-quest-animations';

export default function PendingQuestScreen() {
  const pendingQuest = useQuestStore((state) => state.pendingQuest);
  const character = useCharacterStore((state) => state.character);
  const cancelQuest = useQuestStore((state) => state.cancelQuest);
  const userId = useUserStore((state) => state.user?.id);
  const insets = useSafeAreaInsets();

  // Fetch quest reward preview
  // Custom and cooperative quests need questData, story quests need questTemplateId
  const needsQuestData =
    pendingQuest?.mode === 'custom' || pendingQuest?.mode === 'cooperative';
  const { data: rewardPreview, isLoading: isLoadingPreview } =
    useQuestRewardPreview({
      questTemplateId: needsQuestData ? undefined : pendingQuest?.id,
      questData: needsQuestData
        ? {
            durationMinutes: pendingQuest?.durationMinutes || 0,
            category: pendingQuest?.category,
            mode: pendingQuest?.mode || 'custom',
            reward: {
              xp: pendingQuest?.reward?.xp || 0,
            },
          }
        : undefined,
      participantIds: userId ? [userId] : [],
      enabled: !!pendingQuest && !!userId,
    });

  // Use animation hook for all screen animations
  const { headerStyle, cardStyle, buttonStyle, shimmerStyle } =
    usePendingQuestAnimations(!!pendingQuest);

  const handleCancelQuest = () => {
    cancelQuest();
    router.back();
  };

  if (!pendingQuest) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <View style={styles.flex}>
      {/* Full-screen Background Image */}
      <BackgroundImage
        testID="background-image"
        source={require('@/../assets/images/background/pending-quest-bg-alt.jpg')}
      ></BackgroundImage>

      <View
        style={[
          styles.content,
          {
            paddingTop: insets.top,
            paddingHorizontal: UI_CONFIG.HORIZONTAL_PADDING,
          },
        ]}
      >
        {/* Eyebrow + Title */}
        <Animated.View style={[headerStyle, styles.header]}>
          <EyebrowLabel>{getQuestModeLabel(pendingQuest.mode)}</EyebrowLabel>
          <Text style={styles.title}>{STRINGS.TITLE}</Text>
        </Animated.View>

        {/* Card with Quest Info */}
        <View style={styles.cardSection}>
          <Animated.View style={cardStyle}>
            <QuestInfoCard
              quest={pendingQuest}
              character={character}
              rewardPreview={rewardPreview}
              isLoadingPreview={isLoadingPreview}
            />
          </Animated.View>
        </View>

        {/* Lock Instructions - Outside Card with Shimmer */}
        <Animated.View
          testID={TEST_IDS.LOCK_INSTRUCTIONS}
          entering={FadeInDown.delay(
            ANIMATION_CONFIG.LOCK_INSTRUCTIONS_DELAY
          ).duration(ANIMATION_CONFIG.QUEST_INFO_FADE_DURATION)}
          style={[shimmerStyle, styles.lockRow]}
        >
          <Lock
            size={UI_CONFIG.LOCK_ICON_SIZE}
            color={colors.text.primary}
            accessibilityHidden
          />
          <Text
            style={styles.lockText}
            accessibilityLabel={STRINGS.LOCK_INSTRUCTIONS}
          >
            {STRINGS.LOCK_INSTRUCTIONS}
          </Text>
        </Animated.View>

        {/* Cancel Button */}
        <Animated.View
          style={[buttonStyle, { marginBottom: UI_CONFIG.BOTTOM_PADDING }]}
        >
          <Button
            onPress={handleCancelQuest}
            variant="outline"
            fullWidth
            label={STRINGS.CANCEL_BUTTON}
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
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    justifyContent: 'space-between',
  },
  header: {
    alignItems: 'center',
  },
  title: {
    ...text.h1,
    color: colors.text.primary,
    textAlign: 'center',
    marginTop: spacing[2],
  },
  cardSection: {
    flex: 1,
    justifyContent: 'center',
  },
  lockRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing[6],
  },
  lockText: {
    marginLeft: spacing[2],
    fontFamily: fontFamily.semibold,
    fontSize: 16,
    color: colors.text.primary,
  },
});
