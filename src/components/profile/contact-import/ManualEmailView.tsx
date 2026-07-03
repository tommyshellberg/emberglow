import { Mail } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { TextInput, View } from 'react-native';

import { Button, Text } from '@/components/ui';

interface ManualEmailViewProps {
  email: string;
  onEmailChange: (email: string) => void;
  onSubmit: (email: string) => void;
  onBack: () => void;
  isSubmitting: boolean;
}

export const ManualEmailView: React.FC<ManualEmailViewProps> = ({
  email: initialEmail,
  onEmailChange,
  onSubmit,
  onBack,
  isSubmitting,
}) => {
  // Use local state for smooth typing
  const [localEmail, setLocalEmail] = useState(initialEmail);

  // Update local state if parent email changes
  useEffect(() => {
    setLocalEmail(initialEmail);
  }, [initialEmail]);

  const handleSubmit = () => {
    // Update parent state and submit with the email
    onEmailChange(localEmail);
    onSubmit(localEmail);
  };
  return (
    <View className="flex-1 bg-background p-4">
      <View className="mb-8 flex-row items-center">
        <View className="mr-4 size-12 items-center justify-center rounded-full bg-secondary-100">
          <Mail size={24} color="#36B6D3" />
        </View>
        <View className="flex-1">
          <Text className="text-base text-neutral-200">
            Enter a friend's email to invite them to emberglow.
          </Text>
        </View>
      </View>

      <Text className="mb-2 text-sm font-medium text-neutral-200">
        Email Address
      </Text>

      <TextInput
        testID="invite-email-input"
        value={localEmail}
        onChangeText={setLocalEmail}
        placeholder="friend@example.com"
        placeholderTextColor="#8FA5B2"
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="off"
        autoCorrect={false}
        autoFocus={true}
        style={{
          marginBottom: 24,
          height: 48,
          borderRadius: 8,
          borderWidth: 1,
          borderColor: '#5C7380',
          backgroundColor: '#2c456b',
          paddingHorizontal: 16,
          fontSize: 16,
          color: '#e8dcc7',
        }}
      />

      <Button
        testID="invite-send-button"
        label="SEND INVITE"
        onPress={handleSubmit}
        disabled={!localEmail.trim() || isSubmitting}
        loading={isSubmitting}
        className="w-full"
      />
    </View>
  );
};
