/**
 * JoinGuildModal Component
 *
 * Modal for joining an existing guild using an invite code.
 * Styled to match the guild aesthetic with dark background and golden accents.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, TextInput } from 'react-native';
import { BottomSheetView } from '@gorhom/bottom-sheet';
import { Feather } from '@expo/vector-icons';

import { Button, Card, Text, View } from '@/components/ui';
import { Modal, useModal } from '@/components/ui/modal';

import { GUILD_VALIDATION } from '../../constants/guild-strings';
import type { JoinGuildModalProps } from '../../types/guild-types';

const INVITE_CODE_LENGTH = 8;

/**
 * Visual illustration showing the concept of joining a guild
 */
function JoinIllustration() {
  return (
    <Card className="border-guild-300/30 bg-guild-500/40 rounded-2xl border p-4">
      <View className="flex-row items-center justify-center">
        {/* "You" avatar */}
        <View className="items-center">
          <View className="size-12 items-center justify-center rounded-full border-2 border-guild-300/50 bg-guild-500">
            <Feather name="user" size={24} color="#D4A574" />
          </View>
          <Text className="mt-1 text-xs text-cream-300">You</Text>
        </View>

        {/* Arrow */}
        <View className="mx-4">
          <Feather name="arrow-right" size={24} color="#D4A574" />
        </View>

        {/* Guild representation */}
        <View className="items-center">
          <View className="flex-row -space-x-2">
            <View className="size-10 items-center justify-center rounded-full border-2 border-guild-500 bg-primary-400">
              <Text className="text-xs font-bold text-white">JM</Text>
            </View>
            <View className="size-10 items-center justify-center rounded-full border-2 border-guild-500 bg-guild-300">
              <Text className="text-xs font-bold text-richBlack-500">SK</Text>
            </View>
            <View className="size-10 items-center justify-center rounded-full border-2 border-guild-500 bg-secondary-400">
              <Text className="text-xs font-bold text-white">AL</Text>
            </View>
          </View>
          <Text className="mt-1 text-xs text-cream-300">Your Guild</Text>
        </View>
      </View>
    </Card>
  );
}

export function JoinGuildModal({
  visible,
  onSubmit,
  onClose,
  isLoading,
  error,
}: JoinGuildModalProps) {
  const { ref, present, dismiss } = useModal();
  const hasPresented = useRef(false);

  // Form state
  const [code, setCode] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);

  // Present or dismiss modal based on visible prop
  useEffect(() => {
    if (visible && !hasPresented.current) {
      present();
      hasPresented.current = true;
    } else if (!visible && hasPresented.current) {
      dismiss();
      hasPresented.current = false;
      // Reset form when closing
      setCode('');
      setValidationError(null);
    }
  }, [visible, present, dismiss]);

  const handleDismiss = useCallback(() => {
    hasPresented.current = false;
    onClose();
  }, [onClose]);

  const handleSubmit = useCallback(() => {
    const trimmedCode = code.trim().toUpperCase();

    // Validate code is not empty
    if (!trimmedCode) {
      setValidationError(GUILD_VALIDATION.INVITE_CODE_REQUIRED);
      return;
    }

    // Validate code format (8 alphanumeric characters)
    if (trimmedCode.length !== INVITE_CODE_LENGTH || !/^[A-Z0-9]+$/.test(trimmedCode)) {
      setValidationError(GUILD_VALIDATION.INVITE_CODE_INVALID);
      return;
    }

    setValidationError(null);
    onSubmit(trimmedCode);
  }, [code, onSubmit]);

  const handleCodeChange = useCallback((text: string) => {
    // Auto-uppercase and remove non-alphanumeric characters
    const sanitized = text.toUpperCase().replace(/[^A-Z0-9]/g, '');
    setCode(sanitized);
    // Clear validation error when user starts typing
    if (validationError) {
      setValidationError(null);
    }
  }, [validationError]);

  return (
    <Modal
      ref={ref}
      snapPoints={['55%']}
      title="Join a Guild"
      onDismiss={handleDismiss}
      backgroundStyle={{ backgroundColor: '#2c456b' }}
    >
      <BottomSheetView className="flex-1 px-4 pb-6">
        {/* Visual Illustration */}
        <View className="mb-5">
          <JoinIllustration />
        </View>

        {/* Headline */}
        <Text className="mb-2 text-xl font-bold text-cream-500">
          Enter Your Code
        </Text>

        {/* Description */}
        <Text className="mb-4 text-base leading-relaxed text-cream-300">
          Got an invite code from a friend? Enter it below to join their guild and start questing together.
        </Text>

        {/* Invite Code Input - Custom styled for dark background */}
        <View className="mb-4">
          <TextInput
            testID="guild-invite-code-input"
            placeholder="XXXXXXXX"
            placeholderTextColor="#5C7380"
            value={code}
            onChangeText={handleCodeChange}
            autoCapitalize="characters"
            autoCorrect={false}
            maxLength={INVITE_CODE_LENGTH}
            style={{
              height: 56,
              backgroundColor: 'rgba(212, 165, 116, 0.1)',
              borderWidth: 1,
              borderColor: validationError ? '#f87171' : '#D4A574',
              borderRadius: 12,
              paddingHorizontal: 16,
              fontSize: 24,
              fontFamily: 'monospace',
              letterSpacing: 8,
              textAlign: 'center',
              color: '#D4A574',
            }}
          />
          {validationError && (
            <Text className="mt-2 text-center text-sm text-red-400">{validationError}</Text>
          )}
        </View>

        {/* Error Message */}
        {error && (
          <View className="mb-4 rounded-lg bg-red-400/10 p-3">
            <Text className="text-center text-sm text-red-400">{error}</Text>
          </View>
        )}

        {/* Action Buttons */}
        <View className="space-y-3">
          <Button
            testID="join-guild-submit"
            label="Join Guild"
            onPress={handleSubmit}
            loading={isLoading}
            disabled={isLoading}
            className="bg-guild-300"
            textClassName="text-richBlack-500 font-semibold"
          />

          <Pressable onPress={handleDismiss} className="py-3">
            <Text className="text-center text-cream-500">Cancel</Text>
          </Pressable>
        </View>
      </BottomSheetView>
    </Modal>
  );
}
