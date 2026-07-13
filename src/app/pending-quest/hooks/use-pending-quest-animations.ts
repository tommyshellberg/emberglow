import { useEffect } from 'react';
import {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { ANIMATION_CONFIG } from '../constants';
import { type AnimationStyles } from '../types';

/**
 * Custom hook to manage all animations for the pending quest screen
 *
 * Orchestrates the entrance animations for header, card, button, and shimmer effect
 *
 * @param shouldAnimate - Whether to trigger animations (typically when quest data is present)
 * @returns Object containing animated styles for all screen elements
 */
export function usePendingQuestAnimations(
  shouldAnimate: boolean
): AnimationStyles {
  // Animation shared values
  const headerOpacity = useSharedValue<number>(
    ANIMATION_CONFIG.INITIAL_OPACITY
  );
  const headerScale = useSharedValue<number>(ANIMATION_CONFIG.INITIAL_SCALE);
  const cardOpacity = useSharedValue<number>(ANIMATION_CONFIG.INITIAL_OPACITY);
  const cardScale = useSharedValue<number>(ANIMATION_CONFIG.INITIAL_SCALE);
  const buttonOpacity = useSharedValue<number>(
    ANIMATION_CONFIG.INITIAL_OPACITY
  );
  const buttonScale = useSharedValue<number>(ANIMATION_CONFIG.INITIAL_SCALE);
  const shimmerOpacity = useSharedValue<number>(
    ANIMATION_CONFIG.SHIMMER_MAX_OPACITY
  );

  // Animated styles
  const headerStyle = useAnimatedStyle(() => ({
    opacity: headerOpacity.value,
    transform: [{ scale: headerScale.value }],
  }));

  const cardStyle = useAnimatedStyle(() => ({
    opacity: cardOpacity.value,
    transform: [{ scale: cardScale.value }],
  }));

  const buttonStyle = useAnimatedStyle(() => ({
    opacity: buttonOpacity.value,
    transform: [{ scale: buttonScale.value }],
  }));

  const shimmerStyle = useAnimatedStyle(() => ({
    opacity: shimmerOpacity.value,
  }));

  // Trigger animations when shouldAnimate becomes true
  useEffect(() => {
    if (shouldAnimate) {
      // Header animation
      headerOpacity.value = withTiming(ANIMATION_CONFIG.FINAL_OPACITY, {
        duration: ANIMATION_CONFIG.HEADER_DURATION,
      });
      headerScale.value = withTiming(ANIMATION_CONFIG.FINAL_SCALE, {
        duration: ANIMATION_CONFIG.HEADER_DURATION,
      });

      // Card animation (delayed)
      cardOpacity.value = withDelay(
        ANIMATION_CONFIG.CARD_DELAY,
        withTiming(ANIMATION_CONFIG.FINAL_OPACITY, {
          duration: ANIMATION_CONFIG.CARD_DURATION,
        })
      );
      cardScale.value = withDelay(
        ANIMATION_CONFIG.CARD_DELAY,
        withTiming(ANIMATION_CONFIG.FINAL_SCALE, {
          duration: ANIMATION_CONFIG.CARD_DURATION,
        })
      );

      // Button animation (further delayed)
      buttonOpacity.value = withDelay(
        ANIMATION_CONFIG.BUTTON_DELAY,
        withTiming(ANIMATION_CONFIG.FINAL_OPACITY, {
          duration: ANIMATION_CONFIG.BUTTON_DURATION,
        })
      );
      buttonScale.value = withDelay(
        ANIMATION_CONFIG.BUTTON_DELAY,
        withTiming(ANIMATION_CONFIG.FINAL_SCALE, {
          duration: ANIMATION_CONFIG.BUTTON_DURATION,
        })
      );

      // Shimmer effect (repeating)
      shimmerOpacity.value = withDelay(
        ANIMATION_CONFIG.SHIMMER_DELAY,
        withRepeat(
          withSequence(
            withTiming(ANIMATION_CONFIG.SHIMMER_MIN_OPACITY, {
              duration: ANIMATION_CONFIG.SHIMMER_DURATION,
            }),
            withTiming(ANIMATION_CONFIG.SHIMMER_MAX_OPACITY, {
              duration: ANIMATION_CONFIG.SHIMMER_DURATION,
            })
          ),
          -1, // Repeat infinitely
          true // Reverse animation
        )
      );
    }
  }, [
    shouldAnimate,
    buttonOpacity,
    buttonScale,
    cardOpacity,
    cardScale,
    headerOpacity,
    headerScale,
    shimmerOpacity,
  ]);

  return {
    headerStyle,
    cardStyle,
    buttonStyle,
    shimmerStyle,
  };
}
