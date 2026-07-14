import LottieView from 'lottie-react-native';
import { Check, Sparkles } from 'lucide-react-native';
import React, { useEffect, useRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import type { Perk } from '@/api/skill-tree/types';
import {
  BottomSheet,
  Button,
  useEmberglowBottomSheet,
} from '@/components/emberglow';
import {
  colors,
  fontFamily,
  palette,
  radii,
  spacing,
  withAlpha,
} from '@/theme';

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
  const { ref, present } = useEmberglowBottomSheet();
  const glowOpacity = useSharedValue(0);
  const checkmarkScale = useSharedValue(0);

  useEffect(() => {
    if (visible && perk) {
      present();

      // Play confetti animation
      lottieRef.current?.play();

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
      glowOpacity.value = 0;
      checkmarkScale.value = 0;
    }
  }, [visible, perk, present, glowOpacity, checkmarkScale]);

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
  }));

  const checkmarkStyle = useAnimatedStyle(() => ({
    transform: [{ scale: checkmarkScale.value }],
  }));

  if (!visible || !perk) return null;

  return (
    <BottomSheet ref={ref} title="Perk Unlocked!" onDismiss={onClose}>
      <View testID="unlock-celebration-modal" style={styles.container}>
        {/* Confetti Animation */}
        <View style={styles.lottieContainer} pointerEvents="none">
          <LottieView
            ref={lottieRef}
            source={require('@/../assets/animations/lightning.json')}
            style={styles.lottie}
            loop
            autoPlay
            resizeMode="cover"
          />
        </View>

        {/* Glow Effect */}
        <Animated.View style={[styles.glow, glowStyle]} pointerEvents="none" />

        {/* Success Icon with Checkmark */}
        <View style={styles.iconRow}>
          <View style={styles.iconCircle}>
            <Sparkles size={32} color={palette.sandy} />
          </View>
          <Animated.View style={[styles.checkmark, checkmarkStyle]}>
            <Check size={16} color={colors.text.onAccent} />
          </Animated.View>
        </View>

        {/* Perk Name + Description */}
        <Text style={styles.perkName}>{perk.name}</Text>
        <Text style={styles.perkDescription}>{perk.description}</Text>

        {/* Choice Selection Info */}
        {perk.isChoice && perk.selectedChoice && (
          <View style={styles.choiceBox}>
            <Text style={styles.choiceLabel}>Selected Path</Text>
            <Text style={styles.choiceValue}>
              {perk.choices?.find((c) => c.id === perk.selectedChoice)?.name ||
                perk.selectedChoice}
            </Text>
          </View>
        )}

        {/* Close Button */}
        <Button
          label="Continue"
          variant="primary"
          fullWidth
          onPress={onClose}
          testID="unlock-celebration-close-button"
        />
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing[3],
  },
  lottieContainer: {
    position: 'absolute',
    top: '-90%',
    left: 0,
    right: 0,
    height: '200%',
    zIndex: 10,
  },
  lottie: {
    width: '100%',
    height: '100%',
  },
  glow: {
    position: 'absolute',
    top: -8,
    left: -8,
    right: -8,
    bottom: -8,
    borderRadius: radii.xl,
    backgroundColor: withAlpha(colors.status.success, 0.3),
  },
  iconRow: {
    alignSelf: 'flex-end',
    marginBottom: spacing[2],
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: withAlpha(colors.status.success, 0.2),
  },
  checkmark: {
    position: 'absolute',
    top: -4,
    right: -4,
    borderRadius: radii.pill,
    padding: spacing[1] + 2,
    backgroundColor: colors.status.success,
  },
  perkName: {
    fontFamily: fontFamily.semibold,
    fontSize: 20,
    color: colors.text.primary,
  },
  perkDescription: {
    fontFamily: fontFamily.regular,
    fontSize: 14,
    lineHeight: 20,
    color: colors.text.secondary,
  },
  choiceBox: {
    borderRadius: radii.md,
    backgroundColor: withAlpha(palette.cinnabar, 0.12),
    padding: spacing[3],
    gap: 2,
  },
  choiceLabel: {
    fontFamily: fontFamily.semibold,
    fontSize: 12,
    color: colors.text.accent,
    textAlign: 'center',
  },
  choiceValue: {
    fontFamily: fontFamily.medium,
    fontSize: 14,
    color: colors.text.primary,
    textAlign: 'center',
  },
});
