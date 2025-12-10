import { BlurView } from 'expo-blur';
import { router } from 'expo-router';
import React, { useEffect } from 'react';
import { ActivityIndicator } from 'react-native';
import Animated, {
  FadeIn,
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useQuestRewardPreview } from '@/api/quest-runs';
import { useWebSocket } from '@/components/providers/websocket-provider';
import { LockInstructions, QuestCard } from '@/components/quest';
import {
  BackgroundImage,
  Button,
  ScreenContainer,
  Text,
  View,
} from '@/components/ui';
import colors from '@/components/ui/colors';
import { useQuestStore } from '@/store/quest-store';
import { type CustomQuestTemplate } from '@/store/types';
import { useUserStore } from '@/store/user-store';

// Type guard for custom quests
function isCustomQuest(
  quest: { mode?: string } | null | undefined
): quest is CustomQuestTemplate {
  return quest?.mode === 'custom';
}

export default function CooperativePendingQuestScreen() {
  const pendingQuest = useQuestStore((state) => state.pendingQuest);
  const cooperativeQuestRun = useQuestStore(
    (state) => state.cooperativeQuestRun
  );
  const insets = useSafeAreaInsets();
  const cancelQuest = useQuestStore((state) => state.cancelQuest);
  const user = useUserStore((state) => state.user);
  const { addListener, removeListener, joinQuestRoom, leaveQuestRoom } =
    useWebSocket();

  // Countdown state
  const [showCountdown, setShowCountdown] = React.useState(true);
  const [countdownSeconds, setCountdownSeconds] = React.useState(5);

  // Fetch cooperative reward preview
  const participantIds =
    cooperativeQuestRun?.participants?.map(
      (p: { userId: string }) => p.userId
    ) || [];
  const { data: rewardPreview } = useQuestRewardPreview({
    questData: pendingQuest
      ? {
          durationMinutes: pendingQuest.durationMinutes || 0,
          category: isCustomQuest(pendingQuest)
            ? pendingQuest.category
            : undefined,
          mode: pendingQuest.mode || 'custom',
          reward: {
            xp: pendingQuest.reward?.xp || 0,
          },
        }
      : undefined,
    participantIds,
    enabled: !!pendingQuest && participantIds.length > 0 && !showCountdown,
  });

  // Header animation using react-native-reanimated
  const headerOpacity = useSharedValue(0);
  const headerScale = useSharedValue(0.9);
  const cardOpacity = useSharedValue(0);
  const cardScale = useSharedValue(0.9);
  const buttonOpacity = useSharedValue(0);
  const buttonScale = useSharedValue(0.9);

  const headerAnimatedStyle = useAnimatedStyle(() => ({
    opacity: headerOpacity.value,
    transform: [{ scale: headerScale.value }],
  }));

  const cardAnimatedStyle = useAnimatedStyle(() => ({
    opacity: cardOpacity.value,
    transform: [{ scale: cardScale.value }],
  }));

  const buttonAnimatedStyle = useAnimatedStyle(() => ({
    opacity: buttonOpacity.value,
    transform: [{ scale: buttonScale.value }],
  }));

  // Debug logging for cooperative quest state
  useEffect(() => {
    console.log('[CooperativePendingQuest] State:', {
      questRunId: cooperativeQuestRun?.id,
      participants: cooperativeQuestRun?.participants,
      userId: user?.id,
      questCategory: isCustomQuest(pendingQuest)
        ? pendingQuest.category
        : undefined,
      hasCooperativeQuestRun: !!cooperativeQuestRun,
    });
  }, [cooperativeQuestRun, user?.id, pendingQuest]);

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
      // DO NOT navigate here - the phone is unlocked if we're viewing this screen
      // The navigation state resolver will handle routing when appropriate
    };

    const handleParticipantReady = (data: any) => {
      console.log('[CooperativePendingQuest] Participant ready update:', data);
      // The websocket provider already handles updating the store
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
            }, 500); // Show 0 for half a second before transitioning
          }
          return newCount;
        });
      }, 1000);

      return () => clearInterval(countdownInterval);
    }
  }, [showCountdown]);

  // Run animations when countdown ends
  useEffect(() => {
    if (pendingQuest && !showCountdown) {
      headerOpacity.value = withTiming(1, { duration: 500 });
      headerScale.value = withTiming(1, { duration: 500 });
      cardOpacity.value = withDelay(500, withTiming(1, { duration: 500 }));
      cardScale.value = withDelay(500, withTiming(1, { duration: 500 }));
      buttonOpacity.value = withDelay(1000, withTiming(1, { duration: 500 }));
      buttonScale.value = withDelay(1000, withTiming(1, { duration: 500 }));
    }
  }, [
    pendingQuest,
    showCountdown,
    buttonOpacity,
    buttonScale,
    cardOpacity,
    cardScale,
    headerOpacity,
    headerScale,
  ]);

  const handleCancelQuest = () => {
    cancelQuest();
    router.back();
  };

  // Loading state while waiting for data
  if (!pendingQuest || !cooperativeQuestRun) {
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

  // Main quest ready screen
  return (
    <View className="flex-1">
      {/* Full-screen Background Image */}
      <BackgroundImage
        source={require('@/../assets/images/background/pending-quest-bg-alt.jpg')}
      >
        {/* BlurView for a subtle overlay effect */}
        <BlurView intensity={30} tint="regular" className="absolute inset-0" />
      </BackgroundImage>

      <ScreenContainer
        fullScreen
        style={{
          paddingTop: insets.top + 20,
          paddingHorizontal: 20,
        }}
      >
        <Animated.View
          className="mb-8 items-center"
          style={headerAnimatedStyle}
        >
          <Text className="text-3xl font-bold" style={{ fontWeight: '700' }}>
            Cooperative Quest
          </Text>
        </Animated.View>

        <Animated.View className="flex-0" style={cardAnimatedStyle}>
          <QuestCard
            title={pendingQuest.title}
            duration={pendingQuest.durationMinutes}
            adjustedDuration={rewardPreview?.effects?.duration}
          >
            {/* Motivational Header */}
            <Animated.Text
              entering={FadeInDown.delay(600).duration(800)}
              className="mb-2 text-center text-lg font-bold"
              style={{ color: colors.primary[500], fontWeight: '700' }}
            >
              Stronger Together
            </Animated.Text>

            {/* Concise Quest Info */}
            <Animated.Text
              entering={FadeInDown.delay(900).duration(800)}
              className="mb-6 text-center text-base"
              style={{ color: colors.neutral[500] }}
            >
              {cooperativeQuestRun.participants?.length || 2} companions
              embarking on this journey
            </Animated.Text>

            {/* Companions List */}
            <Animated.View
              entering={FadeInDown.delay(1200).duration(800)}
              className="mb-6"
            >
              {cooperativeQuestRun.participants?.map(
                (participant: any, index: number) => (
                  <Animated.View
                    key={participant.userId}
                    entering={FadeInDown.delay(1200 + index * 100).duration(
                      600
                    )}
                    className="mb-2 flex-row items-center justify-center"
                  >
                    <Text className="text-base" style={{ fontWeight: '600' }}>
                      {participant.userId === user?.id
                        ? '✨ You'
                        : `⚔️ ${participant.userName || participant.characterName || 'Quest Companion'}`}
                    </Text>
                  </Animated.View>
                )
              ) || (
                <Text className="text-center text-base">
                  You and your quest companion
                </Text>
              )}
            </Animated.View>

            {/* Pooled Rewards Preview */}
            {rewardPreview && (
              <Animated.View
                entering={FadeInDown.delay(1400).duration(800)}
                className="mb-6 rounded-lg p-4"
                style={{ backgroundColor: colors.primary[100] }}
              >
                <Text
                  className="mb-2 text-center text-sm font-bold"
                  style={{ color: colors.primary[500], fontWeight: '700' }}
                >
                  Pooled Rewards
                </Text>
                <View className="flex-row justify-center">
                  <View className="items-center">
                    <Text
                      className="text-xl font-bold"
                      style={{ color: colors.primary[500], fontWeight: '700' }}
                    >
                      +{rewardPreview.participantRewards[0]?.adjustedXP || 0} XP
                    </Text>
                    {(rewardPreview.participantRewards[0]?.multiplier || 1) >
                      1 && (
                      <Text
                        className="text-xs"
                        style={{ color: colors.primary[400] }}
                      >
                        {Math.round(
                          ((rewardPreview.participantRewards[0]?.multiplier ||
                            1) -
                            1) *
                            100
                        )}
                        % bonus from perks
                      </Text>
                    )}
                  </View>
                  {rewardPreview.effects?.duration && (
                    <View className="ml-6 items-center">
                      <Text
                        className="text-xl font-bold"
                        style={{ color: colors.primary[500], fontWeight: '700' }}
                      >
                        {rewardPreview.effects.duration} min
                      </Text>
                      <Text
                        className="text-xs"
                        style={{ color: colors.primary[400] }}
                      >
                        reduced duration
                      </Text>
                    </View>
                  )}
                </View>
              </Animated.View>
            )}

            {/* Lock Instructions */}
            <LockInstructions variant="cooperative" delay={1500} />
          </QuestCard>
        </Animated.View>

        <View className="flex-1" />

        <Animated.View style={buttonAnimatedStyle}>
          <Button
            onPress={handleCancelQuest}
            variant="destructive"
            className="items-center rounded-full"
          >
            <Text
              className="text-base font-semibold"
              style={{ fontWeight: '700' }}
            >
              Cancel Quest
            </Text>
          </Button>
        </Animated.View>
      </ScreenContainer>
    </View>
  );
}
