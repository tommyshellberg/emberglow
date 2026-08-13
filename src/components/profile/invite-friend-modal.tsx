import type { BottomSheetModal } from '@gorhom/bottom-sheet';
import React from 'react';
import { Controller } from 'react-hook-form';

import {
  BottomSheetKeyboardAwareScrollView,
  Button,
  Input,
  Text,
  View,
} from '@/components/ui';
import { Modal } from '@/components/ui/modal';

type InviteFriendModalProps = {
  modalRef: React.RefObject<BottomSheetModal>;
  onClose: () => void;
  onCancel?: () => void;
  onSubmit: (data: any) => void;
  formMethods: any;
  error: string;
  success: string;
  isPending: boolean;
};

export function InviteFriendModal({
  modalRef,
  onClose,
  onCancel,
  onSubmit,
  formMethods,
  error,
  success,
  isPending,
}: InviteFriendModalProps) {
  const { control, handleSubmit, formState } = formMethods;
  const { errors, isValid } = formState;

  return (
    <Modal ref={modalRef} snapPoints={['60%']} title="Invite a Friend">
      <BottomSheetKeyboardAwareScrollView>
        <View className="p-4">
          <Text className="mb-4 text-center text-gray-600">
            Enter your friend's email address to send them a friend request.
          </Text>

          <Controller
            control={control}
            name="email"
            rules={{
              required: 'Email is required',
              pattern: {
                value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                message: 'Please enter a valid email address',
              },
            }}
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="Email Address"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                autoCapitalize="none"
                keyboardType="email-address"
                error={errors.email?.message}
              />
            )}
          />

          {error ? (
            <Text className="mb-2 text-center text-red-500">{error}</Text>
          ) : null}

          {success ? (
            <Text className="mb-2 text-center text-teal-700">{success}</Text>
          ) : null}

          <View className="mt-4 flex-row justify-between">
            <Button
              label={success ? 'Done' : 'Cancel'}
              onPress={success ? onClose : onCancel || onClose}
              variant="outline"
              className="mr-2 flex-1"
            />

            {!success && (
              <Button
                label="Send Invite"
                onPress={handleSubmit(onSubmit)}
                className={`ml-2 flex-1 ${isValid ? 'opacity-100' : 'opacity-50'} bg-primary-400`}
                loading={isPending}
                disabled={isPending || !isValid}
                textClassName="font-bold text-white"
              />
            )}
          </View>
        </View>
      </BottomSheetKeyboardAwareScrollView>
    </Modal>
  );
}
