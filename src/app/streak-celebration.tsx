import { useFocusEffect, useRouter } from 'expo-router';
import LottieView from 'lottie-react-native';
import { Share } from 'lucide-react-native';
import React, { useCallback } from 'react';
import { Alert, Image, Share as RNShare } from 'react-native';
import Animated, {
  FadeInDown,
  useAnimatedStyle,
} from 'react-native-reanimated';

import { StreakCounter } from '@/components/StreakCounter';
import { ScreenContainer, Text, View } from '@/components/ui';
import { Button } from '@/components/ui/button';
import { red, secondary } from '@/components/ui/colors';
import { useCharacterStore } from '@/store/character-store';
import { useQuestStore } from '@/store/quest-store';

import { AnimatedStreakDay } from './AnimatedStreakDay';
import {
  ANIMATION_TIMING,
  COLORS,
  LAYOUT,
} from './streak-celebration.constants';
import { generateStreakVisualization } from './streak-visualization.util';
import { useStreakAnimation } from './use-streak-animation';

export default function StreakCelebrationScreen() {
  const router = useRouter();
  const dailyQuestStreak = useCharacterStore((state) => state.dailyQuestStreak);
  const markStreakCelebrationShown = useCharacterStore(
    (state) => state.markStreakCelebrationShown
  );
  const setShouldShowStreakCelebration = useQuestStore(
    (state) => state.setShouldShowStreakCelebration
  );

  // Generate 5-day streak visualization
  const streakDays = generateStreakVisualization(dailyQuestStreak);

  // Animation hook
  const { weekViewOpacity, dayAnimations, lottieRef, playAnimations } =
    useStreakAnimation(streakDays);

  const weekViewStyle = useAnimatedStyle(() => ({
    opacity: weekViewOpacity.value,
  }));

  // Play animations when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      // Mark that the streak celebration was shown when accessing this screen
      markStreakCelebrationShown();
      playAnimations();
    }, [playAnimations, markStreakCelebrationShown])
  );

  const handleShare = async () => {
    try {
      const shareMessage = `I'm on a ${dailyQuestStreak} day quest streak in emberglow! 🔥 Join me on this epic adventure!\n\nhttps://emberglowapp.com`;

      await RNShare.share({
        message: shareMessage,
        title: 'My emberglow Streak',
      });
    } catch (error) {
      Alert.alert('Error', 'Failed to share streak');
    }
  };

  const handleContinue = () => {
    // Clear the flag when user clicks continue
    setShouldShowStreakCelebration(false);
    // Navigate back to the main app screen
    router.back();
  };

  return (
    <View className="flex-1">
      {/* Background */}
      <View className="absolute inset-0">
        <Image
          source={require('@/../assets/images/background/pending-quest-bg-alt.jpg')}
          className="size-full"
          resizeMode="cover"
        />
        <View className="absolute inset-0" />
      </View>

      <ScreenContainer
        fullScreen
        className="items-center justify-between px-6 pt-20"
      >
        <View className="w-full flex-1 items-center justify-center">
          {/* Streak Counter with Confetti Animation */}
          <View
            className="relative mb-6 w-full items-center justify-center"
            style={{ height: 320 }}
          >
            <LottieView
              ref={lottieRef}
              source={require('@/../assets/animations/congrats.json')}
              style={{
                position: 'absolute',
                width: '100%',
                height: '100%',
                opacity: 0.8,
              }}
              loop={true}
              autoPlay={false}
              resizeMode="cover"
            />
            <View style={{ zIndex: 1 }}>
              <StreakCounter animate={true} size="large" disablePress={true} />
            </View>
          </View>

          {/* Streak Text */}
          <Text
            className="mb-12 text-4xl font-bold"
            style={{ color: red[500] }}
          >
            day streak!
          </Text>
        </View>

        <View className="w-full">
          {/* 5-Day Streak Visualization */}
          <Animated.View
            className="mb-6 w-full rounded-2xl"
            style={[
              weekViewStyle,
              {
                backgroundColor: COLORS.WEEK_VIEW_BACKGROUND,
                padding: LAYOUT.WEEK_VIEW_PADDING,
              },
            ]}
            entering={FadeInDown.delay(
              ANIMATION_TIMING.WEEK_VIEW_DELAY
            ).duration(ANIMATION_TIMING.WEEK_VIEW_DURATION)}
          >
            <View className="flex-row justify-between">
              {streakDays.map((day, index) => (
                <AnimatedStreakDay
                  key={index}
                  day={day}
                  animationValue={dayAnimations[index]}
                />
              ))}
            </View>

            <Text
              className="mt-4 text-center text-sm"
              style={{ color: COLORS.REMINDER_TEXT }}
            >
              Complete a quest each day so your streak won't reset!
            </Text>
          </Animated.View>

          {/* Buttons */}
          <Animated.View
            className="w-full space-y-3"
            entering={FadeInDown.delay(1000).duration(600)}
          >
            {/* Share Button */}
            <Button
              variant="outline"
              onPress={handleShare}
              className="flex-row items-center justify-center"
              style={{ borderColor: red[300] }}
              accessibilityLabel={`Share your ${dailyQuestStreak} day streak`}
              accessibilityRole="button"
              accessibilityHint="Opens sharing options to share your streak progress"
            >
              <Share size={20} color={red[300]} className="mr-2" />
              <Text className="font-semibold" style={{ color: red[300] }}>
                Share
              </Text>
            </Button>

            {/* Continue Button */}
            <Button
              onPress={handleContinue}
              style={{ backgroundColor: secondary[300] }}
              accessibilityLabel="Continue to home screen"
              accessibilityRole="button"
              accessibilityHint="Returns to the main app"
            >
              <Text className="font-semibold text-white">CONTINUE</Text>
            </Button>
          </Animated.View>
        </View>
      </ScreenContainer>
    </View>
  );
}
