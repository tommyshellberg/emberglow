import { router } from 'expo-router';
import { Clock, Lock, Users } from 'lucide-react-native';
import React, { useEffect } from 'react';
import { ActivityIndicator, Image, type ImageStyle } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useQuestRewardPreview } from '@/api/quest-runs';
import { getCharacterAvatar } from '@/app/utils/character-utils';
import { useWebSocket } from '@/components/providers/websocket-provider';
import { RewardPreviewCard } from '@/components/quest-preview';
import {
  BackgroundImage,
  Button,
  Card,
  Eyebrow,
  Text,
  Title,
  View,
} from '@/components/ui';
import colors from '@/components/ui/colors';
import { getQuestModeLabel } from '@/lib/utils/quest-utils';
import { useCharacterStore } from '@/store/character-store';
import { useQuestStore } from '@/store/quest-store';
import { type CustomQuestTemplate } from '@/store/types';
import { useUserStore } from '@/store/user-store';

import {
  ANIMATION_CONFIG,
  STRINGS,
  UI_CONFIG,
} from './pending-quest/constants';
import { usePendingQuestAnimations } from './pending-quest/hooks/use-pending-quest-animations';

// Type guard for quests with category (custom or cooperative)
function hasCategory(
  quest: { mode?: string; category?: string } | null | undefined
): quest is { mode: string; category: string } {
  return (
    (quest?.mode === 'custom' || quest?.mode === 'cooperative') &&
    !!quest?.category
  );
}

export default function CooperativePendingQuestScreen() {
  const pendingQuest = useQuestStore((state) => state.pendingQuest);
  const cooperativeQuestRun = useQuestStore(
    (state) => state.cooperativeQuestRun
  );
  const character = useCharacterStore((state) => state.character);
  const insets = useSafeAreaInsets();
  const cancelQuest = useQuestStore((state) => state.cancelQuest);
  const user = useUserStore((state) => state.user);
  const { addListener, removeListener, joinQuestRoom, leaveQuestRoom } =
    useWebSocket();

  // Use animation hook for all screen animations
  const { headerStyle, cardStyle, buttonStyle, shimmerStyle } =
    usePendingQuestAnimations(!!pendingQuest);

  // Countdown state
  const [showCountdown, setShowCountdown] = React.useState(true);
  const [countdownSeconds, setCountdownSeconds] = React.useState(5);

  // Fetch cooperative reward preview
  const participantIds =
    cooperativeQuestRun?.participants?.map(
      (p: { userId: string }) => p.userId
    ) || (user?.id ? [user.id] : []);

  const { data: rewardPreview, isLoading: isLoadingPreview } =
    useQuestRewardPreview({
      questData: pendingQuest
        ? {
            durationMinutes: pendingQuest.durationMinutes || 0,
            category: hasCategory(pendingQuest)
              ? pendingQuest.category
              : undefined,
            mode: pendingQuest.mode || 'cooperative',
            reward: {
              xp: pendingQuest.reward?.xp || 0,
            },
          }
        : undefined,
      participantIds,
      enabled: !!pendingQuest && participantIds.length > 0 && !showCountdown,
    });

  const adjustedDuration = rewardPreview?.effects?.duration;
  const hasDurationReduction =
    adjustedDuration != null &&
    pendingQuest &&
    adjustedDuration !== pendingQuest.durationMinutes &&
    adjustedDuration < pendingQuest.durationMinutes;


  // Join the quest room for real-time updates
  useEffect(() => {
    if (cooperativeQuestRun?.id) {
      console.log(
        '[CooperativePendingQuest] Joining quest room:',
        cooperativeQuestRun.id
      );
      joinQuestRoom(cooperativeQuestRun.id);

      return () => {
        console.log(
          '[CooperativePendingQuest] Leaving quest room:',
          cooperativeQuestRun.id
        );
        leaveQuestRoom(cooperativeQuestRun.id);
      };
    }
  }, [cooperativeQuestRun?.id, joinQuestRoom, leaveQuestRoom]);

  // Listen for quest events
  useEffect(() => {
    const handleQuestStarted = (data: any) => {
      console.log('[CooperativePendingQuest] Quest started:', data);
    };

    const handleParticipantReady = (data: any) => {
      console.log('[CooperativePendingQuest] Participant ready update:', data);
    };

    addListener('questStarted', handleQuestStarted);
    addListener('participantReady', handleParticipantReady);

    return () => {
      removeListener('questStarted', handleQuestStarted);
      removeListener('participantReady', handleParticipantReady);
    };
  }, [addListener, removeListener]);

  // Handle countdown
  useEffect(() => {
    if (showCountdown) {
      const countdownInterval = setInterval(() => {
        setCountdownSeconds((prev) => {
          const newCount = prev - 1;
          if (newCount === 0) {
            clearInterval(countdownInterval);
            setTimeout(() => {
              setShowCountdown(false);
            }, 500);
          }
          return newCount;
        });
      }, 1000);

      return () => clearInterval(countdownInterval);
    }
  }, [showCountdown]);

  const handleCancelQuest = () => {
    cancelQuest();
    router.back();
  };

  // Loading state
  if (!pendingQuest) {
    return (
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator />
      </View>
    );
  }

  // Show countdown screen
  if (showCountdown) {
    return (
      <View
        className="flex-1 items-center justify-center"
        style={{ backgroundColor: colors.primary[400] }}
      >
        <Animated.Text
          entering={FadeIn.duration(500)}
          className="mb-4 text-3xl font-bold text-white"
          style={{ fontWeight: '700' }}
        >
          Get Ready!
        </Animated.Text>
        <Animated.Text
          entering={FadeIn.delay(200).duration(500)}
          className="mb-8 text-xl text-white"
        >
          Lock your phone in...
        </Animated.Text>
        <Animated.View
          entering={FadeIn.delay(400).duration(500)}
          className="mb-8 size-32 items-center justify-center rounded-full"
          style={{ backgroundColor: colors.white }}
        >
          <Text
            className="text-6xl font-bold"
            style={{ color: colors.primary[400], fontWeight: '700' }}
          >
            {countdownSeconds}
          </Text>
        </Animated.View>
        <Animated.Text
          entering={FadeIn.delay(600).duration(500)}
          className="px-8 text-center text-lg text-white"
        >
          All companions must lock together
        </Animated.Text>
      </View>
    );
  }

  const participantCount = cooperativeQuestRun?.participants?.length || 2;

  // Main quest ready screen
  return (
    <View className="flex-1">
      {/* Full-screen Background Image */}
      <BackgroundImage
        testID="background-image"
        source={require('@/../assets/images/background/pending-quest-bg-alt.jpg')}
      />

      <View
        className="flex-1 justify-between"
        style={{
          paddingTop: insets.top,
          paddingHorizontal: UI_CONFIG.HORIZONTAL_PADDING,
        }}
      >
        {/* Eyebrow + Title */}
        <Animated.View style={headerStyle} className="items-center">
          <Eyebrow text={getQuestModeLabel('cooperative')} />
          <Title variant="centered" className="text-4xl">
            Start Quest
          </Title>
        </Animated.View>

        {/* Card with Quest Info */}
        <View className="flex-1 justify-center">
          <Animated.View style={cardStyle}>
            <Card>
              {/* Header with Character Image */}
              <View
                style={{
                  height: UI_CONFIG.HEADER_IMAGE_HEIGHT,
                  overflow: 'hidden',
                  position: 'relative',
                }}
              >
                {/* Character Image */}
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

                {/* White tint overlay */}
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
                    style={{
                      fontWeight: '700',
                      textShadowColor: 'rgba(0, 0, 0, 0.5)',
                      textShadowOffset: { width: 0, height: 1 },
                      textShadowRadius: 3,
                    }}
                    numberOfLines={2}
                  >
                    {pendingQuest.title}
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
                  <Clock
                    size={UI_CONFIG.DURATION_OVERLAY_ICON_SIZE}
                    color={colors.white}
                  />
                  {hasDurationReduction ? (
                    <View className="ml-2 flex-row items-baseline">
                      <Text
                        className="text-base text-neutral-400"
                        style={{ textDecorationLine: 'line-through' }}
                      >
                        {pendingQuest.durationMinutes}
                      </Text>
                      <Text
                        className="mx-1 text-base font-bold"
                        style={{ color: colors.primary[400] }}
                      >
                        {adjustedDuration} min
                      </Text>
                    </View>
                  ) : (
                    <Text className="ml-2 text-base font-semibold text-white">
                      {pendingQuest.durationMinutes} min
                    </Text>
                  )}
                </Animated.View>

                {/* Participants Badge - Bottom Left */}
                <Animated.View
                  entering={FadeInDown.delay(
                    ANIMATION_CONFIG.QUEST_TITLE_DELAY + 100
                  ).duration(ANIMATION_CONFIG.QUEST_INFO_FADE_DURATION)}
                  style={{
                    position: 'absolute',
                    bottom: 16,
                    left: 16,
                    backgroundColor: colors.primary[500],
                    borderRadius: 20,
                    paddingHorizontal: 12,
                    paddingVertical: 6,
                    flexDirection: 'row',
                    alignItems: 'center',
                  }}
                >
                  <Users size={16} color={colors.white} />
                  <Text
                    className="ml-2 text-sm font-semibold text-white"
                    style={{ fontWeight: '600' }}
                  >
                    {participantCount} Companions
                  </Text>
                </Animated.View>
              </View>

              {/* Card Content */}
              <View className="p-6">
                {/* Subtitle */}
                <Animated.Text
                  entering={FadeInDown.delay(
                    ANIMATION_CONFIG.QUEST_SUBTITLE_DELAY
                  ).duration(ANIMATION_CONFIG.QUEST_INFO_FADE_DURATION)}
                  className="leading-relaxed text-neutral-200"
                >
                  Stronger together — complete this quest with your companions
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
                ) : rewardPreview &&
                  rewardPreview.participantRewards.length > 0 ? (
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
          </Animated.View>
        </View>

        {/* Lock Instructions - Outside Card with Shimmer */}
        <Animated.View
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
          <Text className="ml-2 text-base font-semibold text-white">
            All companions must lock phones to begin
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
