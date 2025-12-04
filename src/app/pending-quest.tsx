import { router } from 'expo-router';
import { Lock } from 'lucide-react-native';
import React from 'react';
import { ActivityIndicator } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useQuestRewardPreview } from '@/api/quest-runs';
import { BackgroundImage, Button, Text, Title, View } from '@/components/ui';
import colors from '@/components/ui/colors';
import { useCharacterStore } from '@/store/character-store';
import { useQuestStore } from '@/store/quest-store';
import { useUserStore } from '@/store/user-store';

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

  // Fetch quest reward preview (solo quests only - cooperative has separate screen)
  // Custom quests need questData, story quests need questTemplateId
  const isCustomQuest = pendingQuest?.mode === 'custom';
  const { data: rewardPreview, isLoading: isLoadingPreview } =
    useQuestRewardPreview({
      questTemplateId: isCustomQuest ? undefined : pendingQuest?.id,
      questData: isCustomQuest
        ? {
            durationMinutes: pendingQuest?.durationMinutes || 0,
            category: pendingQuest?.category,
            mode: 'custom',
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
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <View className="flex-1">
      {/* Full-screen Background Image */}
      <BackgroundImage
        testID="background-image"
        source={require('@/../assets/images/background/pending-quest-bg-alt.jpg')}
      ></BackgroundImage>

      <View
        className="flex-1 justify-between"
        style={{
          paddingTop: insets.top,
          paddingHorizontal: UI_CONFIG.HORIZONTAL_PADDING,
        }}
      >
        {/* Title */}
        <Animated.View style={headerStyle}>
          <Title variant="centered" className="text-4xl">
            {STRINGS.TITLE}
          </Title>
        </Animated.View>

        {/* Card with Quest Info */}
        <View className="flex-1 justify-center">
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
          style={shimmerStyle}
          className="mb-6 flex-row items-center justify-center"
        >
          <Lock
            size={UI_CONFIG.LOCK_ICON_SIZE}
            color={colors.white}
            accessibilityHidden
          />
          <Text
            className="ml-2 text-base font-semibold text-white"
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
            variant="destructive"
            className="items-center rounded-full"
            accessibilityRole="button"
            accessibilityLabel={STRINGS.CANCEL_BUTTON}
            accessibilityHint="Cancels the quest and returns to the previous screen"
          >
            <Text
              className="text-base font-semibold"
              style={{ fontWeight: '700' }}
            >
              {STRINGS.CANCEL_BUTTON}
            </Text>
          </Button>
        </Animated.View>
      </View>
    </View>
  );
}
