/**
 * Create Guild Screen
 *
 * Full-screen form for creating a new guild with name, tagline, and icon selection.
 * Uses card-based styling consistent with custom quest screen.
 */

import { useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
} from 'react-native';

import { Button, EyebrowLabel, Input } from '@/components/emberglow';
import {
  FocusAwareStatusBar,
  ScreenContainer,
  ScreenHeader,
  Text,
  View,
} from '@/components/ui';
import { GuildIconSelector } from '@/features/guilds/components/guild-icon-selector';
import {
  GUILD_FORM,
  GUILD_TITLES,
} from '@/features/guilds/constants/guild-strings';
import { useCreateGuild } from '@/features/guilds/hooks';
import type { GuildIcon } from '@/features/guilds/types/guild-types';
import { colors, radii, shadows, spacing, withAlpha } from '@/theme';

export default function CreateGuildScreen() {
  const router = useRouter();

  // Form state
  const [name, setName] = useState('');
  const [tagline, setTagline] = useState('');
  const [icon, setIcon] = useState<GuildIcon | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Form is valid when name and icon are provided
  const isFormValid = name.trim().length > 0 && icon !== null;

  // Create guild mutation
  const createGuildMutation = useCreateGuild();

  const handleBack = () => {
    router.back();
  };

  const handleNameChange = useCallback(
    (text: string) => {
      setName(text);
      if (validationError) {
        setValidationError(null);
      }
    },
    [validationError]
  );

  const handleSubmit = useCallback(async () => {
    // Double-check validation (button should be disabled, but just in case)
    if (!name.trim() || !icon) {
      return;
    }

    try {
      const guild = await createGuildMutation.mutateAsync({
        name: name.trim(),
        tagline: tagline.trim() || undefined,
        icon,
      });

      // Navigate to the new guild's detail page
      router.replace(`/guild/${guild.id}`);
    } catch (error) {
      console.error('Failed to create guild:', error);
      Alert.alert(
        'Error',
        error instanceof Error
          ? error.message
          : 'Failed to create guild. Please try again.'
      );
    }
  }, [name, tagline, icon, createGuildMutation, router]);

  return (
    <View style={styles.screenRoot}>
      <FocusAwareStatusBar />
      <ScreenHeader
        testID="create-guild-screen"
        title={GUILD_TITLES.CREATE_TITLE}
        showBackButton
        onBackPress={handleBack}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <ScreenContainer>
          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ flexGrow: 1 }}
          >
            <View className="flex-1 px-4 py-6">
              {/* Form Section */}
              <View style={styles.section}>
                {/* Name Input */}
                <View style={styles.field}>
                  <Input
                    testID="guild-name-input"
                    label={GUILD_FORM.NAME_LABEL}
                    value={name}
                    onChangeText={handleNameChange}
                    placeholder={GUILD_FORM.NAME_PLACEHOLDER}
                    autoCapitalize="words"
                    autoFocus
                    maxLength={50}
                  />
                  {validationError && (
                    <Text style={styles.validationErrorText}>
                      {validationError}
                    </Text>
                  )}
                </View>

                {/* Tagline Input */}
                <Input
                  testID="guild-tagline-input"
                  label={GUILD_FORM.TAGLINE_LABEL}
                  value={tagline}
                  onChangeText={setTagline}
                  placeholder={GUILD_FORM.TAGLINE_PLACEHOLDER}
                  autoCapitalize="sentences"
                  maxLength={100}
                />
              </View>

              {/* Icon Selector Section */}
              <View style={styles.section}>
                <EyebrowLabel tone="warm" style={styles.iconLabel}>
                  {GUILD_FORM.ICON_LABEL}
                </EyebrowLabel>
                <GuildIconSelector selected={icon} onSelect={setIcon} />
              </View>

              {/* Error Message */}
              {createGuildMutation.error && (
                <View style={styles.errorBanner}>
                  <Text style={styles.errorText}>
                    {createGuildMutation.error instanceof Error
                      ? createGuildMutation.error.message
                      : 'An error occurred'}
                  </Text>
                </View>
              )}
            </View>
          </ScrollView>

          {/* Submit Button - Fixed at bottom */}
          <View className="px-4 pb-8">
            <Button
              testID="create-guild-submit"
              variant="primary"
              size="lg"
              fullWidth
              label="Create Guild"
              onPress={handleSubmit}
              disabled={createGuildMutation.isPending || !isFormValid}
            >
              {createGuildMutation.isPending ? (
                <ActivityIndicator color={colors.text.onAccent} />
              ) : undefined}
            </Button>
          </View>
        </ScreenContainer>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  // Flat canvas behind the ScreenHeader band, matching the ScreenContainer
  // below it so there's no hard color-edge seam.
  screenRoot: {
    flex: 1,
    backgroundColor: colors.surface.app,
  },
  section: {
    ...shadows.raised,
    backgroundColor: colors.surface.raised,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border.hairline,
    padding: spacing[5],
    marginBottom: spacing[6],
  },
  field: {
    marginBottom: spacing[5],
  },
  iconLabel: {
    marginBottom: spacing[4],
  },
  validationErrorText: {
    marginTop: spacing[2],
    fontSize: 14,
    color: colors.status.danger,
  },
  errorBanner: {
    marginBottom: spacing[4],
    borderRadius: radii.md,
    padding: spacing[3],
    backgroundColor: withAlpha(colors.status.danger, 0.1),
  },
  errorText: {
    textAlign: 'center',
    fontSize: 14,
    color: colors.status.danger,
  },
});
