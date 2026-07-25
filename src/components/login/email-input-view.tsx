import React, { useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { Button, Input } from '@/components/emberglow';
import { colors, spacing } from '@/theme';

import { ErrorBanner } from './error-banner';
import { cardBody, cardTitle } from './text-styles';
import { emailSchema } from './types';

type EmailInputViewProps = {
  onSubmit: (email: string) => void;
  isLoading: boolean;
  error: string;
  /**
   * Heading and subheading, supplied by the screen: the same email step is
   * a sign-in for a returning user and a sign-up for someone converting a
   * provisional account (see `copy.ts`). Required rather than defaulted so
   * a caller cannot silently get the wrong framing.
   */
  title: string;
  subtitle: string;
};

// Mockup puts `marginTop: 14` on the send button; carried here as the
// input block's bottom margin instead — Input and Button are adjacent
// siblings below, so this margin sits directly between them.
const INPUT_MARGIN_BOTTOM = 14;

/**
 * Email input form view for magic link authentication
 * Handles email input, validation, and submission
 */
export function EmailInputView({
  onSubmit,
  isLoading,
  error,
  title,
  subtitle,
}: EmailInputViewProps) {
  const [email, setEmail] = useState('');

  const isValidEmail = (emailToValidate: string): boolean => {
    return emailSchema.safeParse({ email: emailToValidate }).success;
  };

  const handleSubmit = () => {
    onSubmit(email);
  };

  return (
    <View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.body}>{subtitle}</Text>

      <ErrorBanner error={error} />

      <Input
        testID="email-input"
        label="Email"
        placeholder="you@example.com"
        keyboardType="email-address"
        autoCapitalize="none"
        value={email}
        onChangeText={setEmail}
        accessibilityLabel="Email address"
        accessibilityHint="Enter your email to receive a login link"
        containerStyle={styles.inputContainer}
      />

      <Button
        testID="login-button"
        variant="primary"
        size="lg"
        fullWidth
        label="Send sign-in link"
        onPress={handleSubmit}
        disabled={isLoading || !isValidEmail(email)}
        accessibilityLabel="Send login link"
        accessibilityHint="Sends a magic link to your email for authentication"
      >
        {isLoading ? <ActivityIndicator color={colors.text.onAccent} /> : null}
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  title: {
    ...cardTitle,
    marginBottom: spacing[1],
  },
  body: {
    ...cardBody,
    marginBottom: spacing[4],
  },
  inputContainer: {
    marginBottom: INPUT_MARGIN_BOTTOM,
  },
});
