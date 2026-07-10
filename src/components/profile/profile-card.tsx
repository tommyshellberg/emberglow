import { Feather } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
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
import { Card, Text, View } from '@/components/ui';
import { PROFILE_COLORS } from '@/features/profile/constants/profile-constants';
import type { Character } from '@/features/profile/types/profile-types';
import { updateUserCharacter } from '@/lib/services/user';
import { useCharacterStore } from '@/store/character-store';
import { colors, fontFamily, radii, spacing, text } from '@/theme';

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
    <Card style={styles.cardWrapper}>
      <ImageBackground
        source={characterDetails?.profileImage}
        style={styles.heroImage}
        imageStyle={{ position: 'absolute', width: '100%' }}
      >
        <View style={styles.heroContent}>
          {/* Top area - empty but keeps the layout vertical */}
          <View />

          {/* Bottom section with player info and blur */}
          <BlurView intensity={80} tint="dark" style={styles.blurPanel}>
            <View>
              {/* Name row with edit icon */}
              <View style={styles.nameRow}>
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
              </View>
              {/* Level and character type on second row, styled as a sandy eyebrow */}
              <Text style={styles.levelLine}>
                Level {character.level} {characterDetails?.type}
              </Text>
            </View>
          </BlurView>
        </View>
      </ImageBackground>
    </Card>
  );
}

const styles = StyleSheet.create({
  cardWrapper: {
    marginHorizontal: spacing[4],
    marginTop: spacing[4],
    overflow: 'hidden',
  },
  heroImage: {
    aspectRatio: 1.2,
    width: '100%',
  },
  heroContent: {
    flex: 1,
    flexDirection: 'column',
    justifyContent: 'space-between',
  },
  // `surface.card` is the token documented for "slightly translucent over
  // art" — the exact scenario here (info panel over the hero portrait).
  blurPanel: {
    overflow: 'hidden',
    padding: spacing[5],
    backgroundColor: colors.surface.card,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
    ...text.h2,
    color: colors.text.primary,
    // Erstoria is never bold; a hair of top padding keeps ascenders from
    // clipping given the display font's tight 1.12 line-height.
    paddingTop: 2,
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
    ...text.eyebrow,
    color: colors.text.accent,
    marginTop: spacing[1],
  },
});
