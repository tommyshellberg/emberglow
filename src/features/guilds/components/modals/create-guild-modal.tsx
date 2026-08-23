/**
 * CreateGuildModal Component
 *
 * Modal for creating a new guild with name, tagline, and icon selection.
 * Includes form validation and loading state handling.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { BottomSheetView } from '@gorhom/bottom-sheet';

import { Button, Input, Text, View } from '@/components/ui';
import { Modal, useModal } from '@/components/ui/modal';

import { GUILD_FORM, GUILD_TITLES, GUILD_VALIDATION } from '../../constants/guild-strings';
import type { CreateGuildModalProps, GuildIcon } from '../../types/guild-types';
import { GuildIconSelector } from '../guild-icon-selector';

export function CreateGuildModal({
  visible,
  onSubmit,
  onClose,
  isLoading,
  error,
}: CreateGuildModalProps) {
  const { ref, present, dismiss } = useModal();
  const hasPresented = useRef(false);

  // Form state
  const [name, setName] = useState('');
  const [tagline, setTagline] = useState('');
  const [icon, setIcon] = useState<GuildIcon | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Form is valid when name and icon are provided
  const isFormValid = name.trim().length > 0 && icon !== null;

  // Present or dismiss modal based on visible prop
  useEffect(() => {
    if (visible && !hasPresented.current) {
      present();
      hasPresented.current = true;
    } else if (!visible && hasPresented.current) {
      dismiss();
      hasPresented.current = false;
      // Reset form when closing
      setName('');
      setTagline('');
      setIcon(null);
      setValidationError(null);
    }
  }, [visible, present, dismiss]);

  const handleDismiss = useCallback(() => {
    hasPresented.current = false;
    onClose();
  }, [onClose]);

  const handleSubmit = useCallback(() => {
    // Double-check validation (button should be disabled, but just in case)
    if (!name.trim() || !icon) {
      return;
    }

    setValidationError(null);
    onSubmit({
      name: name.trim(),
      tagline: tagline.trim() || undefined,
      icon,
    });
  }, [name, tagline, icon, onSubmit]);

  const handleNameChange = useCallback((text: string) => {
    setName(text);
    // Clear validation error when user starts typing
    if (validationError) {
      setValidationError(null);
    }
  }, [validationError]);

  return (
    <Modal
      ref={ref}
      snapPoints={['75%']}
      title={GUILD_TITLES.CREATE_TITLE}
      onDismiss={handleDismiss}
    >
      <BottomSheetView className="flex-1 px-4 pb-8">
        {/* Name Input */}
        <View className="mb-4">
          <Text className="mb-1 text-sm font-medium text-neutral-200">
            {GUILD_FORM.NAME_LABEL}
          </Text>
          <Input
            testID="guild-name-input"
            placeholder={GUILD_FORM.NAME_PLACEHOLDER}
            value={name}
            onChangeText={handleNameChange}
            autoCapitalize="words"
            maxLength={50}
          />
          {validationError && (
            <Text className="mt-1 text-sm text-red-400">{validationError}</Text>
          )}
        </View>

        {/* Tagline Input */}
        <View className="mb-6">
          <Text className="mb-1 text-sm font-medium text-neutral-200">
            {GUILD_FORM.TAGLINE_LABEL}
          </Text>
          <Input
            testID="guild-tagline-input"
            placeholder={GUILD_FORM.TAGLINE_PLACEHOLDER}
            value={tagline}
            onChangeText={setTagline}
            autoCapitalize="sentences"
            maxLength={100}
          />
        </View>

        {/* Icon Selector */}
        <View className="mb-6">
          <Text className="mb-3 text-sm font-medium text-neutral-200">
            {GUILD_FORM.ICON_LABEL}
          </Text>
          <GuildIconSelector selected={icon} onSelect={setIcon} />
        </View>

        {/* Error Message */}
        {error && (
          <View className="mb-4 rounded-lg bg-red-400/10 p-3">
            <Text className="text-center text-sm text-red-400">{error}</Text>
          </View>
        )}

        {/* Submit Button */}
        <Button
          testID="create-guild-submit"
          label="Create Guild"
          onPress={handleSubmit}
          loading={isLoading}
          disabled={isLoading || !isFormValid}
          className="mt-auto bg-guild-300"
          textClassName="text-richBlack-500 font-semibold"
        />
      </BottomSheetView>
    </Modal>
  );
}
