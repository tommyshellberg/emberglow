import LottieView from 'lottie-react-native';
import { Check, Sparkles } from 'lucide-react-native';
import React, { useEffect, useRef } from 'react';
import { Modal, Pressable, View as RNView } from 'react-native';
import Animated, {
  FadeIn,
  FadeOut,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import type { Perk } from '@/api/skill-tree/types';
import { Button, Text } from '@/components/ui';

interface UnlockCelebrationModalProps {
  perk: Perk | null;
  visible: boolean;
  onClose: () => void;
}

export function UnlockCelebrationModal({
  perk,
  visible,
  onClose,
}: UnlockCelebrationModalProps) {
  const lottieRef = useRef<LottieView>(null);
  const cardScale = useSharedValue(0);
  const glowOpacity = useSharedValue(0);
  const checkmarkScale = useSharedValue(0);

  useEffect(() => {
    if (visible && perk) {
      // Play confetti animation
      lottieRef.current?.play();

      // Animate card entrance with spring
      cardScale.value = withDelay(
        200,
        withSpring(1, {
          damping: 12,
          stiffness: 100,
        })
      );

      // Pulse glow effect
      glowOpacity.value = withDelay(
        300,
        withSequence(
          withTiming(1, { duration: 400 }),
          withTiming(0.6, { duration: 400 }),
          withTiming(1, { duration: 400 })
        )
      );

      // Animate checkmark with delay
      checkmarkScale.value = withDelay(
        800,
        withSpring(1, {
          damping: 8,
          stiffness: 150,
        })
      );
    } else {
      // Reset animations when modal closes
      cardScale.value = 0;
      glowOpacity.value = 0;
      checkmarkScale.value = 0;
    }
  }, [visible, perk, cardScale, glowOpacity, checkmarkScale]);

  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ scale: cardScale.value }],
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
  }));

  const checkmarkStyle = useAnimatedStyle(() => ({
    transform: [{ scale: checkmarkScale.value }],
  }));

  if (!perk) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      testID="unlock-celebration-modal"
    >
      <Pressable
        className="flex-1 items-center justify-center bg-black/80"
        onPress={onClose}
        testID="celebration-modal-backdrop"
      >
        <RNView className="w-11/12 max-w-md">
          {/* Confetti Animation - Full Container Coverage */}
          <RNView className="absolute inset-0" style={{ zIndex: 10 }}>
            <LottieView
              ref={lottieRef}
              source={require('@/../assets/animations/lightning.json')}
              style={{
                position: 'absolute',
                width: '100%',
                height: '100%',
                top: '-90%',
              }}
              loop={true}
              autoPlay={true}
              resizeMode="cover"
            />
          </RNView>

          {/* Glow Effect */}
          <Animated.View
            style={glowStyle}
            className="absolute -inset-2 rounded-2xl bg-secondary-300/30 blur-xl"
          />

          {/* Main Card */}
          <Pressable onPress={() => {}}>
            <Animated.View
              entering={FadeIn.duration(300)}
              exiting={FadeOut.duration(200)}
              style={cardStyle}
              className="rounded-2xl bg-cardBackground p-6"
            >
            {/* Header Row */}
            <RNView className="mb-6 flex-row items-start justify-between">
              {/* Title */}
              <RNView className="flex-1">
                <Text className="text-center text-2xl font-bold text-cream-500">
                  Perk Unlocked!
                </Text>
              </RNView>

              {/* Success Icon with Checkmark - Top Right */}
              <RNView className="relative ml-2">
                {/* Background Circle */}
                <RNView className="size-16 items-center justify-center rounded-full bg-secondary-300/20">
                  <Sparkles size={32} color="#36B6D3" />
                </RNView>

                {/* Animated Checkmark */}
                <Animated.View
                  style={checkmarkStyle}
                  className="absolute -right-1 -top-1 rounded-full bg-secondary-300 p-1.5"
                >
                  <Check size={16} color="#FFFFFF" />
                </Animated.View>
              </RNView>
            </RNView>

            {/* Perk Name - Left Aligned */}
            <Text className="mb-2 text-xl font-bold text-cream-500">
              {perk.name}
            </Text>

            {/* Perk Description - Left Aligned */}
            <Text className="mb-6 text-sm leading-5 text-cream-500/80">
              {perk.description}
            </Text>

            {/* Choice Selection Info */}
            {perk.isChoice && perk.selectedChoice && (
              <RNView className="mb-6 rounded-lg bg-primary-400/20 p-3">
                <Text className="mb-1 text-center text-xs font-semibold text-primary-400">
                  Selected Path
                </Text>
                <Text className="text-center text-sm font-medium text-cream-500">
                  {perk.choices?.find((c) => c.id === perk.selectedChoice)
                    ?.name || perk.selectedChoice}
                </Text>
              </RNView>
            )}

            {/* Close Button */}
            <Button
              label="Continue"
              variant="default"
              onPress={onClose}
              className="bg-secondary-300"
              testID="unlock-celebration-close-button"
            />
          </Animated.View>
          </Pressable>
        </RNView>
      </Pressable>
    </Modal>
  );
}
