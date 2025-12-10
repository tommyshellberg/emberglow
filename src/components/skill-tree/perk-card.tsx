import React from 'react';
import { View } from 'react-native';
import Animated, {
  FadeIn,
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
} from 'react-native-reanimated';

import type { Perk } from '@/api/skill-tree/types';
import { Button, Text } from '@/components/ui';

import { PerkIcon } from './perk-icon';

interface PerkCardProps {
  perk: Perk;
  currentLevel: number;
  onUnlock?: (perkId: string) => void;
  testID?: string;
}

export function PerkCard({
  perk,
  currentLevel,
  onUnlock,
  testID,
}: PerkCardProps) {
  const isAvailable = !perk.isUnlocked && perk.levelRequired <= currentLevel;
  const isLocked = !perk.isUnlocked && perk.levelRequired > currentLevel;
  const isUnlocked = perk.isUnlocked;

  // Animation values for button press feedback
  const buttonScale = useSharedValue(1);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const handleUnlockPress = () => {
    // Animate button press
    buttonScale.value = withSequence(
      withSpring(0.95, { damping: 10, stiffness: 400 }),
      withSpring(1, { damping: 10, stiffness: 400 })
    );
    onUnlock?.(perk.id);
  };

  const buttonStyle = useAnimatedStyle(() => ({
    transform: [{ scale: buttonScale.value }],
  }));

  return (
    <Animated.View
      entering={FadeInDown.delay(100).duration(400)}
      testID={
        testID ||
        (isLocked
          ? 'perk-card-locked'
          : isAvailable
            ? 'perk-card-available'
            : 'perk-card-unlocked')
      }
      style={{
        backgroundColor: isAvailable
          ? 'rgba(229, 88, 56, 0.08)' // Subtle primary tint for available
          : 'rgba(44, 69, 107, 0.90)', // cardBackground from colors.js
        ...(isAvailable && {
          shadowColor: '#E55838',
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.3,
          shadowRadius: 8,
          elevation: 4,
        }),
      }}
      className={`
        rounded-lg p-4 mb-3
        ${isLocked ? 'opacity-50' : ''}
        ${
          isAvailable
            ? 'border-2 border-primary-400'
            : isUnlocked
              ? 'border border-secondary-300'
              : 'border border-neutral-400/30'
        }
      `}
    >
      {/* Header: Perk Name + Icon */}
      <View className="mb-3 flex-row items-center justify-between">
        <Text className="flex-1 pr-3 text-xl font-bold text-cream-500">
          {perk.name}
        </Text>

        <PerkIcon
          perkId={perk.selectedChoice || perk.id}
          isUnlocked={isUnlocked}
          size={32}
        />
      </View>

      {/* Perk Description */}
      <Text className="mb-3 text-sm leading-5 text-cream-500/80">
        {perk.description}
      </Text>

      {/* Level Requirement (Locked) */}
      {isLocked && (
        <View className="mt-2">
          <Text className="text-xs text-neutral-200">
            Level {perk.levelRequired} Required
          </Text>
        </View>
      )}

      {/* Selected Choice (Unlocked Choice Node) */}
      {isUnlocked && perk.isChoice && perk.selectedChoice && (
        <View className="mt-2 rounded-md bg-primary-400/20 p-3">
          <Text className="mb-1 text-xs font-semibold text-primary-400">
            Selected Path
          </Text>
          <Text className="text-sm font-medium text-cream-500">
            {perk.choices?.find((c) => c.id === perk.selectedChoice)?.name ||
              perk.selectedChoice}
          </Text>
        </View>
      )}

      {/* Unlock Date (Unlocked) */}
      {isUnlocked && perk.unlockedAt && (
        <View className="mt-2">
          <Text className="text-xs text-neutral-200">
            Unlocked {formatDate(perk.unlockedAt)}
          </Text>
        </View>
      )}

      {/* Unlock Button (Available) */}
      {isAvailable && onUnlock && (
        <View className="mt-3">
          <Animated.View entering={FadeIn.delay(200)} style={buttonStyle}>
            <Button
              label={perk.isChoice ? 'Choose Path' : 'Unlock'}
              variant="default"
              size="default"
              onPress={handleUnlockPress}
              className="bg-primary-400"
              testID={`unlock-button-${perk.id}`}
            />
          </Animated.View>
        </View>
      )}
    </Animated.View>
  );
}
