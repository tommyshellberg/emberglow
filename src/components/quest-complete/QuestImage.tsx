import LottieView from 'lottie-react-native';
import React, { useEffect, useRef } from 'react';

import { Image, Text, View } from '@/components/ui';
import { getCurrentUserAdjustedXP } from '@/lib/utils/quest-utils';
import { useUserStore } from '@/store/user-store';

import { ANIMATION_TIMING } from './constants';
import type { QuestImageProps } from './types';
import { getQuestImage } from './utils';

export function QuestImage({
  quest,
  disableAnimations = false,
}: QuestImageProps) {
  const lottieRef = useRef<LottieView>(null);
  const currentUserId = useUserStore((state) => state.user?.id);

  // Get the XP to display - use adjusted XP from rewards if available
  const displayXP = getCurrentUserAdjustedXP(quest, currentUserId);

  // Debug: Log what XP we're displaying
  console.log('[QuestImage] Displaying XP:', {
    displayXP,
    baseXP: quest.reward.xp,
    hasParticipants: !!quest.participants,
    participantCount: quest.participants?.length,
    currentUserId,
  });

  useEffect(() => {
    let timeout: NodeJS.Timeout;
    if (!disableAnimations && lottieRef.current) {
      timeout = setTimeout(() => {
        lottieRef.current?.play();
      }, ANIMATION_TIMING.LOTTIE_DELAY);
    }
    return () => {
      clearTimeout(timeout);
    };
  }, [disableAnimations]);

  return (
    <View
      className="relative mx-auto size-[160px] overflow-hidden rounded-xl shadow-lg"
      accessibilityLabel="Quest completion image"
      testID="quest-image-container"
    >
      {/* Background image */}
      <Image
        source={getQuestImage(quest)}
        style={{
          position: 'absolute',
          width: '100%',
          height: '100%',
        }}
        resizeMode="cover"
        testID="quest-image"
        accessibilityLabel="Quest completion image"
      />

      {/* Lottie animation overlay */}
      <LottieView
        ref={lottieRef}
        source={require('@/../assets/animations/congrats.json')}
        autoPlay={false}
        loop={false}
        style={{
          position: 'absolute',
          width: '100%',
          height: '100%',
          opacity: 0.3,
        }}
      />

      {/* XP badge positioned at bottom center */}
      <View className="absolute inset-x-0 bottom-2 items-center">
        <View
          className="rounded-full bg-white/90 px-3 py-1 shadow-md"
          accessibilityLabel={`Experience points reward: ${displayXP} XP`}
          accessibilityRole="text"
        >
          <Text className="text-sm font-bold text-neutral-800">
            +{displayXP} XP
          </Text>
        </View>
      </View>
    </View>
  );
}
