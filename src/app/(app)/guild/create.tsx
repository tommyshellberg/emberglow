/**
 * Create Guild Screen
 *
 * Full-screen form for creating a new guild with name, tagline, and icon selection.
 * Uses card-based styling consistent with custom quest screen.
 */

import { useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, TextInput } from 'react-native';

import {
  Button,
  Card,
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
  GUILD_VALIDATION,
} from '@/features/guilds/constants/guild-strings';
import { useCreateGuild } from '@/features/guilds/hooks';
import type { GuildIcon } from '@/features/guilds/types/guild-types';

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
        error instanceof Error ? error.message : 'Failed to create guild. Please try again.'
      );
    }
  }, [name, tagline, icon, createGuildMutation, router]);

  return (
    <View className="flex-1 bg-background">
      <FocusAwareStatusBar />
      <ScreenHeader
        title={GUILD_TITLES.CREATE_TITLE}
        showBackButton
        onBackPress={handleBack}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <ScreenContainer reverseGradient>
          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ flexGrow: 1 }}
          >
            <View className="flex-1 px-4 py-6">
              {/* Form Card */}
              <Card className="mb-6 rounded-xl p-5">
                {/* Name Input */}
                <View className="mb-5">
                  <Text className="mb-2 text-sm font-medium text-neutral-200">
                    {GUILD_FORM.NAME_LABEL}
                  </Text>
                  <TextInput
                    testID="guild-name-input"
                    value={name}
                    onChangeText={handleNameChange}
                    placeholder={GUILD_FORM.NAME_PLACEHOLDER}
                    placeholderTextColor="#5C7380"
                    autoCapitalize="words"
                    autoFocus
                    maxLength={50}
                    style={{
                      height: 48,
                      borderBottomWidth: 1,
                      borderBottomColor: '#D4A574', // guild-300
                      backgroundColor: 'transparent',
                      paddingHorizontal: 4,
                      paddingVertical: 8,
                      fontSize: 18,
                      color: '#e8dcc7', // cream
                    }}
                  />
                  {validationError && (
                    <Text className="mt-2 text-sm text-red-400">
                      {validationError}
                    </Text>
                  )}
                </View>

                {/* Tagline Input */}
                <View>
                  <Text className="mb-2 text-sm font-medium text-neutral-200">
                    {GUILD_FORM.TAGLINE_LABEL}
                  </Text>
                  <TextInput
                    testID="guild-tagline-input"
                    value={tagline}
                    onChangeText={setTagline}
                    placeholder={GUILD_FORM.TAGLINE_PLACEHOLDER}
                    placeholderTextColor="#5C7380"
                    autoCapitalize="sentences"
                    maxLength={100}
                    style={{
                      height: 48,
                      borderBottomWidth: 1,
                      borderBottomColor: '#D4A574', // guild-300
                      backgroundColor: 'transparent',
                      paddingHorizontal: 4,
                      paddingVertical: 8,
                      fontSize: 18,
                      color: '#e8dcc7', // cream
                    }}
                  />
                </View>
              </Card>

              {/* Icon Selector Card */}
              <Card className="mb-6 rounded-xl p-5">
                <Text className="mb-4 text-sm font-medium text-neutral-200">
                  {GUILD_FORM.ICON_LABEL}
                </Text>
                <GuildIconSelector selected={icon} onSelect={setIcon} />
              </Card>

              {/* Error Message */}
              {createGuildMutation.error && (
                <View className="mb-4 rounded-lg bg-red-400/10 p-3">
                  <Text className="text-center text-sm text-red-400">
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
              label="Create Guild"
              onPress={handleSubmit}
              loading={createGuildMutation.isPending}
              disabled={createGuildMutation.isPending || !isFormValid}
              className="bg-guild-300"
              textClassName="text-richBlack-500 font-semibold"
            />
          </View>
        </ScreenContainer>
      </KeyboardAvoidingView>
    </View>
  );
}
