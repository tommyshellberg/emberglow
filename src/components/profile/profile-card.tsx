import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ImageBackground,
  Pressable,
  StyleSheet,
  TextInput,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import CHARACTERS from '@/app/data/characters';
import { levels } from '@/app/data/level-progression';
import { EyebrowLabel, XPBar } from '@/components/emberglow';
import { Text, View } from '@/components/ui';
import { PROFILE_COLORS } from '@/features/profile/constants/profile-constants';
import type { Character } from '@/features/profile/types/profile-types';
import { updateUserCharacter } from '@/lib/services/user';
import { useCharacterStore } from '@/store/character-store';
import {
  colors,
  fontFamily,
  fontSize,
  radii,
  scrims,
  shadows,
  spacing,
} from '@/theme';

type ProfileCardProps = {
  /** The character data to render */
  character: Character;
};

export function ProfileCard({ character }: ProfileCardProps) {
  const characterDetails = CHARACTERS.find((c) => c.id === character.type);
  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState(character.name);
  const [isLoading, setIsLoading] = useState(false);
  const updateCharacter = useCharacterStore((state) => state.updateCharacter);

  // Animation values for success feedback
  const successScale = useSharedValue(1);
  const successOpacity = useSharedValue(0);

  const successAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: successScale.value }],
    opacity: successOpacity.value,
  }));

  // XP progress toward next level — same calc the removed standalone
  // Experience card used to run; the design folds this into the hero card's
  // bottom bar instead of a separate card (item 2 of the visual-QA spec).
  const currentLevelData = levels.find((l) => l.level === character.level);
  const nextLevelData = levels.find((l) => l.level === character.level + 1);
  // character.currentXP from server is TOTAL XP, not progress toward next level
  const totalXP = character.currentXP;
  const xpProgressTowardNext =
    totalXP - (currentLevelData?.totalXPRequired || 0);
  const xpRequiredForCurrentToNext = nextLevelData
    ? nextLevelData.totalXPRequired - (currentLevelData?.totalXPRequired || 0)
    : 100; // fallback

  const handleSaveName = async () => {
    if (editedName.trim() === character.name) {
      setIsEditing(false);
      return;
    }

    setIsLoading(true);
    try {
      // Update on server - exclude xpToNextLevel which may exist in persisted data
      const { ...characterForServer } = character;
      await updateUserCharacter({
        ...characterForServer,
        name: editedName.trim(),
      });

      // Update local store
      updateCharacter({ name: editedName.trim() });

      // Success animation
      successOpacity.value = withSequence(
        withTiming(1, { duration: 200 }),
        withTiming(0, { duration: 800, delay: 400 })
      );
      successScale.value = withSequence(withSpring(1.2), withSpring(1));

      setIsEditing(false);
    } catch (error) {
      // TODO: Replace with logger service
      Alert.alert(
        'Update Failed',
        'Unable to update your character name. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.cardWrapper}>
      <ImageBackground
        source={characterDetails?.profileImage}
        style={styles.heroImage}
        imageStyle={{ position: 'absolute', width: '100%' }}
      >
        {/* Bottom scrim — the art dissolves into the flat canvas instead of
            sitting behind a BlurView glass band. */}
        <LinearGradient
          colors={scrims.bottom.colors}
          start={scrims.bottom.start}
          end={scrims.bottom.end}
          style={StyleSheet.absoluteFillObject}
        />

        <View style={styles.heroContent}>
          {/* Name row with edit icon */}
          {isEditing ? (
            <View style={styles.editRow}>
              <TextInput
                value={editedName}
                onChangeText={setEditedName}
                style={styles.nameInput}
                autoFocus
                maxLength={20}
                editable={!isLoading}
              />
              <Pressable
                onPress={handleSaveName}
                style={[styles.iconButton, styles.saveButton]}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator
                    size="small"
                    color={colors.text.onAccent}
                  />
                ) : (
                  <Feather
                    name="check"
                    size={16}
                    color={colors.text.onAccent}
                  />
                )}
              </Pressable>
              <Pressable
                onPress={() => {
                  setEditedName(character.name);
                  setIsEditing(false);
                }}
                style={[styles.iconButton, styles.cancelButton]}
                disabled={isLoading}
              >
                <Feather name="x" size={16} color={colors.text.primary} />
              </Pressable>
            </View>
          ) : (
            <View style={styles.nameDisplayRow}>
              <View style={styles.nameWrap}>
                <Text style={styles.name}>{character.name}</Text>
                {/* Success checkmark overlay */}
                <Animated.View
                  style={[successAnimatedStyle, styles.successBadge]}
                  pointerEvents="none"
                >
                  <View style={styles.successIcon}>
                    <Feather
                      name="check"
                      size={16}
                      color={colors.text.onAccent}
                    />
                  </View>
                </Animated.View>
              </View>
              <Pressable
                onPress={() => setIsEditing(true)}
                style={styles.editPencilButton}
                accessible={true}
                accessibilityRole="button"
                accessibilityLabel="Edit character name"
                accessibilityHint="Tap to edit your character name"
              >
                <Feather
                  name="edit-2"
                  size={18}
                  color={PROFILE_COLORS.editIcon}
                />
              </Pressable>
            </View>
          )}

          {/* Level + class eyebrow — level first, middot separator */}
          <EyebrowLabel tone="warm" style={styles.levelLine}>
            {`Level ${character.level} · ${characterDetails?.type ?? ''}`}
          </EyebrowLabel>

          {/* XP progress toward next level, in-card per the design */}
          <XPBar
            level={character.level}
            xp={xpProgressTowardNext}
            xpNext={xpRequiredForCurrentToNext}
            style={styles.xpBar}
          />
        </View>
      </ImageBackground>
    </View>
  );
}

const styles = StyleSheet.create({
  cardWrapper: {
    marginHorizontal: spacing[4],
    marginTop: spacing[4],
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.border.hairline,
    overflow: 'hidden',
    ...shadows.card,
  },
  heroImage: {
    aspectRatio: 1.2,
    width: '100%',
  },
  heroContent: {
    position: 'absolute',
    left: spacing[4],
    right: spacing[4],
    bottom: spacing[4],
  },
  editRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  nameInput: {
    flex: 1,
    borderRadius: radii.md,
    backgroundColor: colors.surface.inset,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    fontFamily: fontFamily.semibold,
    fontSize: 17,
    color: colors.text.primary,
  },
  iconButton: {
    borderRadius: radii.pill,
    padding: spacing[2],
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButton: {
    backgroundColor: colors.accent.primary,
  },
  cancelButton: {
    backgroundColor: colors.surface.raised,
  },
  nameDisplayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  nameWrap: {
    position: 'relative',
  },
  name: {
    fontFamily: fontFamily.display,
    fontSize: fontSize.h2,
    lineHeight: fontSize.h2 * 1.15,
    color: colors.text.primary,
  },
  successBadge: {
    position: 'absolute',
    right: -30,
    top: '50%',
    marginTop: -12,
  },
  successIcon: {
    borderRadius: radii.pill,
    backgroundColor: colors.status.success,
    padding: spacing[1],
  },
  editPencilButton: {
    borderRadius: radii.pill,
    padding: spacing[1],
  },
  levelLine: {
    marginTop: spacing[1],
  },
  xpBar: {
    marginTop: spacing[3],
  },
});
