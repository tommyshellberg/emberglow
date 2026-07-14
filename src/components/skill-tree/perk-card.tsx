import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  FadeIn,
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
} from 'react-native-reanimated';

import type { Perk } from '@/api/skill-tree/types';
import { Badge, type BadgeTone, Button } from '@/components/emberglow';
import {
  colors,
  fontFamily,
  palette,
  radii,
  shadows,
  spacing,
  withAlpha,
} from '@/theme';

import { PerkIcon } from './perk-icon';

export type PerkStatus = 'locked' | 'available' | 'unlocked';

/**
 * Single source of truth for the perk tri-state gate — shared by PerkCard's
 * own styling and SkillTreeScreen's filter/sort, so the two never disagree
 * about whether a perk is locked, available, or unlocked.
 */
export function getPerkStatus(perk: Perk, currentLevel: number): PerkStatus {
  if (perk.isUnlocked) return 'unlocked';
  return perk.levelRequired <= currentLevel ? 'available' : 'locked';
}

const statusTone: Record<PerkStatus, BadgeTone> = {
  available: 'ember',
  unlocked: 'success',
  locked: 'neutral',
};

/**
 * Only the available state gets an explicit status badge — unlocked perks
 * already signal state via full-opacity icon + unlock date, and locked ones
 * via the "Level N Required" caption. Labeled "Ready" rather than
 * "Available" so it doesn't collide with the screen's "Available" filter
 * chip in text queries (both real and in tests).
 */
const statusLabel: Partial<Record<PerkStatus, string>> = {
  available: 'Ready',
};

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
  const status = getPerkStatus(perk, currentLevel);
  const isAvailable = status === 'available';
  const isLocked = status === 'locked';
  const isUnlocked = status === 'unlocked';

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
      style={isUnlocked ? [styles.glowWrapper, shadows.glowWarm] : undefined}
    >
      <View
        testID={testID || `perk-card-${status}`}
        style={[
          styles.card,
          isUnlocked && styles.cardUnlocked,
          isLocked && styles.cardLocked,
        ]}
      >
        {/* Header: Icon + Perk Name + Status Badge */}
        <View style={styles.headerRow}>
          <PerkIcon
            perkId={perk.selectedChoice || perk.id}
            isUnlocked={isUnlocked}
            size={32}
          />
          <Text style={styles.name}>{perk.name}</Text>
          {statusLabel[status] ? (
            <Badge tone={statusTone[status]}>{statusLabel[status]}</Badge>
          ) : null}
        </View>

        {/* Perk Description */}
        <Text style={styles.description}>{perk.description}</Text>

        {/* Level Requirement (Locked) */}
        {isLocked && (
          <Text style={styles.meta}>Level {perk.levelRequired} Required</Text>
        )}

        {/* Selected Choice (Unlocked Choice Node) */}
        {isUnlocked && perk.isChoice && perk.selectedChoice && (
          <View style={styles.choiceBox}>
            <Text style={styles.choiceLabel}>Selected Path</Text>
            <Text style={styles.choiceValue}>
              {perk.choices?.find((c) => c.id === perk.selectedChoice)?.name ||
                perk.selectedChoice}
            </Text>
          </View>
        )}

        {/* Unlock Date (Unlocked) */}
        {isUnlocked && perk.unlockedAt && (
          <Text style={styles.meta}>
            Unlocked {formatDate(perk.unlockedAt)}
          </Text>
        )}

        {/* Unlock Button (Available) */}
        {isAvailable && onUnlock && (
          <Animated.View
            entering={FadeIn.delay(200)}
            style={[styles.buttonRow, buttonStyle]}
          >
            <Button
              label={perk.isChoice ? 'Choose Path' : 'Unlock'}
              variant="primary"
              size="md"
              onPress={handleUnlockPress}
              testID={`unlock-button-${perk.id}`}
            />
          </Animated.View>
        )}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  glowWrapper: {
    borderRadius: radii.lg,
    backgroundColor: colors.surface.raised,
  },
  card: {
    borderRadius: radii.lg,
    backgroundColor: colors.surface.raised,
    borderWidth: 1,
    borderColor: colors.border.hairline,
    padding: spacing[4],
    marginBottom: spacing[3],
    gap: spacing[2],
  },
  // Only unlocked perks carry the warm emphasis (border + glowWarm shadow,
  // applied on the Animated.View wrapper above) — available perks stay on
  // the quiet hairline border from `card` above, matching the mockup
  // (social.jsx PerkCard, ~lines 47-56), which reserves the loud treatment
  // for the state the player has actually achieved.
  cardUnlocked: {
    borderWidth: 2,
    borderColor: withAlpha(palette.cinnabar, 0.5),
  },
  cardLocked: {
    opacity: 0.5,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
  },
  name: {
    flex: 1,
    fontFamily: fontFamily.semibold,
    fontSize: 18,
    color: colors.text.primary,
  },
  description: {
    fontFamily: fontFamily.regular,
    fontSize: 14,
    lineHeight: 20,
    color: colors.text.secondary,
  },
  meta: {
    fontFamily: fontFamily.regular,
    fontSize: 12,
    color: colors.text.muted,
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
  },
  choiceValue: {
    fontFamily: fontFamily.medium,
    fontSize: 14,
    color: colors.text.primary,
  },
  buttonRow: {
    marginTop: spacing[1],
    alignSelf: 'flex-start',
  },
});
