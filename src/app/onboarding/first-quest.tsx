import { useRouter } from 'expo-router';
import { usePostHog } from 'posthog-react-native';
import React, { useEffect } from 'react';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { type QuestTemplate, useNextAvailableQuests } from '@/api/quest';
import { AVAILABLE_QUESTS } from '@/app/data/quests';
import {
  BackgroundImage,
  Button,
  Card,
  FocusAwareStatusBar,
  Text,
  Title,
  View,
} from '@/components/ui';
import { audioCacheService } from '@/lib/services/audio-cache.service';
import QuestTimer from '@/lib/services/quest-timer';
import { useQuestStore } from '@/store/quest-store';
import type { StoryQuestTemplate } from '@/store/types';
import { getQuestAudioPath } from '@/utils/audio-utils';

// story/recap/options are required on StoryQuestTemplate but optional on the
// server's QuestTemplate. Every real story quest (including quest-1, the
// very first one - see app/data/quests.ts) always populates these, so treat
// a quest missing any of them as malformed server data rather than
// rendering blank narrative content.
function isCompleteStoryQuest(
  quest: QuestTemplate
): quest is QuestTemplate &
  Required<Pick<QuestTemplate, 'story' | 'recap' | 'options'>> {
  return !!quest.story && !!quest.recap && !!quest.options;
}

export default function FirstQuestScreen() {
  const router = useRouter();
  const prepareQuest = useQuestStore((state) => state.prepareQuest);
  const pendingQuest = useQuestStore((state) => state.pendingQuest);
  const setServerAvailableQuests = useQuestStore(
    (state) => state.setServerAvailableQuests
  );

  // Fetch the first quest from server
  const { data: questData, isLoading } = useNextAvailableQuests();

  // Animation values for a smooth sequential fade-in effect
  const headerOpacity = useSharedValue(0);
  const headerTranslateY = useSharedValue(-20);

  const cardOpacity = useSharedValue(0);
  const cardTranslateY = useSharedValue(-15);

  const hintOpacity = useSharedValue(0);
  const hintTranslateY = useSharedValue(-10);

  const buttonOpacity = useSharedValue(0);
  const buttonTranslateY = useSharedValue(-5);

  const posthog = usePostHog();

  useEffect(() => {
    posthog.capture('onboarding_open_first_quest_screen');

    // Preload audio for the first quest
    const preloadFirstQuestAudio = async () => {
      try {
        const firstStoryQuest = AVAILABLE_QUESTS.find(
          (quest) => quest.mode === 'story'
        );

        if (firstStoryQuest && firstStoryQuest.id) {
          const audioPath = getQuestAudioPath(firstStoryQuest.id, 'vaedros');
          console.log('Preloading audio for first quest:', audioPath);
          await audioCacheService.preloadAudio([audioPath]);
        }
      } catch (error) {
        console.warn('Failed to preload first quest audio:', error);
      }
    };

    preloadFirstQuestAudio();
  }, [posthog]);

  // Check if we already have a pending quest - if so, navigate to pending-quest screen
  useEffect(() => {
    if (pendingQuest) {
      console.log(
        'First quest screen: Already have pending quest, navigating to pending-quest screen'
      );
      // Use push instead of replace so that canceling the quest can navigate back
      router.push('/pending-quest');
    }
  }, [pendingQuest, router]);

  // Start animations sequentially when component mounts
  useEffect(() => {
    // Header animation (first)
    headerOpacity.value = withTiming(1, { duration: 600 });
    headerTranslateY.value = withTiming(0, { duration: 600 });

    // Card animation (second)
    cardOpacity.value = withDelay(400, withTiming(1, { duration: 600 }));
    cardTranslateY.value = withDelay(400, withTiming(0, { duration: 600 }));

    // Hint text animation (third)
    hintOpacity.value = withDelay(800, withTiming(1, { duration: 600 }));
    hintTranslateY.value = withDelay(800, withTiming(0, { duration: 600 }));

    // Button animation (last)
    buttonOpacity.value = withDelay(1200, withTiming(1, { duration: 600 }));
    buttonTranslateY.value = withDelay(1200, withSpring(0));
  }, [
    buttonOpacity,
    buttonTranslateY,
    cardOpacity,
    cardTranslateY,
    headerOpacity,
    headerTranslateY,
    hintOpacity,
    hintTranslateY,
  ]);

  // Animated styles
  const headerStyle = useAnimatedStyle(() => ({
    opacity: headerOpacity.value,
    transform: [{ translateY: headerTranslateY.value }],
  }));

  const cardStyle = useAnimatedStyle(() => ({
    opacity: cardOpacity.value,
    transform: [{ translateY: cardTranslateY.value }],
  }));

  const hintStyle = useAnimatedStyle(() => ({
    opacity: hintOpacity.value,
    transform: [{ translateY: hintTranslateY.value }],
  }));

  const buttonStyle = useAnimatedStyle(() => ({
    opacity: buttonOpacity.value,
    transform: [{ translateY: buttonTranslateY.value }],
  }));

  // Update store when server quests are loaded
  useEffect(() => {
    if (questData?.quests) {
      setServerAvailableQuests(
        questData.quests,
        questData.hasMoreQuests || false,
        questData.storylineComplete || false
      );
    }
  }, [questData, setServerAvailableQuests]);

  // Handle starting the first quest
  const handleStartQuest = async () => {
    try {
      posthog.capture('onboarding_trigger_start_first_quest');

      // Use the first quest from server if available
      const firstStoryQuest = questData?.quests?.[0];

      if (firstStoryQuest && isCompleteStoryQuest(firstStoryQuest)) {
        // Convert server quest to client format
        const clientQuest: StoryQuestTemplate = {
          ...firstStoryQuest,
          id: firstStoryQuest.customId, // Use customId as the primary ID for client
          _id: firstStoryQuest._id, // Preserve MongoDB ID for questTemplateId
          mode: 'story' as const,
          // Server's QuestTemplate.poiSlug is optional; default to '' (the
          // same "no POI mapped yet" placeholder used in app/data/quests.ts)
          // when absent. quest-store.ts only calls revealLocation() when
          // poiSlug is truthy, so an empty string is a safe no-op default.
          poiSlug: firstStoryQuest.poiSlug ?? '',
        };

        // Prepare the quest in the store
        posthog.capture('onboarding_prepare_first_quest');
        prepareQuest(clientQuest);

        // Prepare the quest timer - wrap in try/catch to prevent errors
        try {
          await QuestTimer.prepareQuest(clientQuest);
          posthog.capture('onboarding_success_start_first_quest');
        } catch (error) {
          console.error('Error preparing quest timer:', error);
          // Continue with navigation even if timer setup fails
        }

        // Router will automatically navigate to pending-quest via the useEffect above
      } else {
        posthog.capture('onboarding_error_no_story_quest_found');
      }
    } catch (error) {
      posthog.capture('onboarding_error_start_first_quest');
      console.error('Error starting quest:', error);
    }
  };

  return (
    <View className="flex-1">
      <FocusAwareStatusBar />

      <BackgroundImage
        source={require('@/../assets/images/background/pending-quest-bg-alt.jpg')}
      />

      <View className="flex-1 justify-between p-6">
        <Animated.View style={headerStyle} className="mt-10">
          <Title variant="centered">Your Journey Begins</Title>
        </Animated.View>

        <View className="flex-1 justify-center">
          <Animated.View style={cardStyle}>
            <Card className="p-6">
              <Text className="mb-4 text-lg font-semibold text-white">
                The Kingdom of Vaedros is in peril.
              </Text>
              <Text className="mb-4 text-white">
                The balance is broken. The light is trapped. The darkness is
                growing.
              </Text>
              <Text className="mb-4 text-white">
                You awaken lying on your back, the earth cold and damp beneath
                you. The trees stretch high, their gnarled limbs tangled
                overhead, blotting out the sky.
              </Text>
            </Card>
          </Animated.View>
        </View>

        <Animated.View style={buttonStyle} className="mb-8 items-center">
          <Button
            label="Wake up"
            testID="wake-up-button"
            onPress={handleStartQuest}
            className="rounded-xl bg-primary-400 px-10"
            textClassName="text-white font-bold"
          />
        </Animated.View>
      </View>
    </View>
  );
}
