import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { usePostHog } from 'posthog-react-native';
import React, { useCallback } from 'react';
import { Image, ScrollView } from 'react-native';
import Animated, {
  FadeIn,
  FadeInDown,
  FadeInLeft,
} from 'react-native-reanimated';

import {
  Button,
  Eyebrow,
  FocusAwareStatusBar,
  Text,
  Title,
  View,
} from '@/components/ui';
import colors from '@/components/ui/colors';

type FeatureIcon = React.ComponentProps<typeof Feather>['name'];

const UNLOCKS: { icon: FeatureIcon; label: string }[] = [
  { icon: 'book-open', label: 'Continue your story across 29 more quests' },
  { icon: 'edit-3', label: 'Forge custom quests from your real-world goals' },
  { icon: 'feather', label: "Track your hero's journey in the journal" },
  {
    icon: 'map',
    label: 'Explore the map of Vaedros and uncover hidden regions',
  },
  {
    icon: 'users',
    label: 'Form a guild and run cooperative quests with friends',
  },
];

function UnlockRow({ icon, label }: { icon: FeatureIcon; label: string }) {
  return (
    <View className="mb-4 flex-row items-start">
      <View
        className="mr-4 mt-0.5 size-8 items-center justify-center rounded-full"
        style={{ backgroundColor: 'rgba(229, 88, 56, 0.28)' }}
      >
        <Feather name={icon} size={16} color={colors.brown} />
      </View>
      <Text className="flex-1 text-base leading-relaxed">{label}</Text>
    </View>
  );
}

export default function QuestCompletedSignupScreen() {
  const posthog = usePostHog();

  const handleCreateAccount = useCallback(() => {
    posthog.capture('onboarding_trigger_try_create_account');

    // Navigate to login - the login flow will handle setting onboarding to COMPLETED
    // after successful authentication
    router.replace('/login');
  }, [posthog]);

  return (
    <View className="flex-1">
      <FocusAwareStatusBar />

      <View className="absolute inset-0">
        <Image
          source={require('@/../assets/images/background/onboarding-bg.jpg')}
          className="size-full"
          resizeMode="cover"
        />
        <View className="absolute inset-0 bg-black/55" />
      </View>

      <View className="flex-1 px-6 pb-6">
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ paddingTop: 24, paddingBottom: 16 }}
          showsVerticalScrollIndicator={false}
        >
          <Animated.View entering={FadeInLeft.delay(50)}>
            <Eyebrow text="Quest One · Complete" />
          </Animated.View>

          <Animated.View entering={FadeInLeft.delay(150)}>
            <Title text="Claim Your Legend" />
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(600)}>
            <Text className="mt-1 text-lg font-bold leading-relaxed">
              You've completed your first quest!
            </Text>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(1100)}>
            <Text className="mt-4 text-base leading-relaxed">
              Create a free account to keep your hero's story alive.
            </Text>
          </Animated.View>

          <Animated.View
            entering={FadeIn.delay(1500)}
            className="my-7 h-px"
            style={{ backgroundColor: 'rgba(247, 164, 75, 0.4)' }}
          />

          <Animated.View entering={FadeInDown.delay(1600)}>
            <Text className="mb-5 font-erstoria text-2xl text-white">
              Sign up to unlock:
            </Text>

            {UNLOCKS.map(({ icon, label }) => (
              <UnlockRow key={icon} icon={icon} label={label} />
            ))}
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(2100)}>
            <Text className="mt-6 text-base italic leading-relaxed">
              Your hero is currently stored on this device only. Secure the
              journey now and pick up right where you left off—anywhere,
              anytime.
            </Text>
          </Animated.View>
        </ScrollView>

        <Animated.View entering={FadeIn.delay(2600)} className="pt-4">
          <Button
            testID="create-account-button"
            label="Create Account"
            onPress={handleCreateAccount}
            accessibilityLabel="Create Account"
            className="bg-primary-500"
            textClassName="text-white font-bold"
          />
        </Animated.View>
      </View>
    </View>
  );
}
