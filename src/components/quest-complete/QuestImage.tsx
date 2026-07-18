import LottieView from 'lottie-react-native';
import React, { useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';

import { Badge } from '@/components/emberglow';
import { Image } from '@/components/ui';
import { getCurrentUserAdjustedXP } from '@/lib/utils/quest-utils';
import { useUserStore } from '@/store/user-store';
import { radii, shadows } from '@/theme';

import { ANIMATION_TIMING } from './constants';
import type { QuestImageProps } from './types';
import { getQuestImage } from './utils';

const IMAGE_SIZE = 140;

export function QuestImage({
  quest,
  disableAnimations = false,
}: QuestImageProps) {
  const lottieRef = useRef<LottieView>(null);
  const currentUserId = useUserStore((state) => state.user?.id);

  // Get the XP to display - use adjusted XP from rewards if available
  const displayXP = getCurrentUserAdjustedXP(quest, currentUserId);

  useEffect(() => {
    // ReturnType<typeof setTimeout> instead of NodeJS.Timeout: under RN 0.79
    // setTimeout here resolves to the overload returning number, which isn't
    // assignable to NodeJS.Timeout.
    let timeout: ReturnType<typeof setTimeout>;
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
    // Two layers so the drop shadow (outer) isn't clipped by the rounded
    // image's `overflow: hidden` (inner) — iOS drops shadows on views that
    // also clip, see quest-card.tsx for the same pattern.
    <View style={styles.shadowWrapper}>
      <View
        style={styles.container}
        accessibilityLabel="Quest completion image"
        testID="quest-image-container"
      >
        {/* Background image */}
        <Image
          source={getQuestImage(quest)}
          style={StyleSheet.absoluteFillObject}
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
          style={styles.lottie}
        />

        {/* XP badge positioned at bottom center */}
        <View style={styles.badgeRow}>
          <View
            accessibilityLabel={`Experience points reward: ${displayXP} XP`}
            accessibilityRole="text"
          >
            <Badge tone="warm">{`+${displayXP} XP`}</Badge>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  shadowWrapper: {
    alignSelf: 'center',
    borderRadius: radii.lg,
    ...shadows.card,
  },
  container: {
    position: 'relative',
    width: IMAGE_SIZE,
    height: IMAGE_SIZE,
    overflow: 'hidden',
    borderRadius: radii.lg,
  },
  lottie: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    opacity: 0.3,
  },
  badgeRow: {
    position: 'absolute',
    bottom: 8,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
});
