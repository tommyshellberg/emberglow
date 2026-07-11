import * as Linking from 'expo-linking';
import { FlameKindling } from 'lucide-react-native';
import React, { useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { Button, Input } from '@/components/emberglow';
import {
  colors,
  fontFamily,
  palette,
  radii,
  spacing,
  tints,
  withAlpha,
} from '@/theme';

import { TERMS_URL } from './constants';
import { cardBody, cardTitle } from './text-styles';
import { emailSchema } from './types';

type EmailInputViewProps = {
  onSubmit: (email: string) => void;
  isLoading: boolean;
  error: string;
};

const ERROR_ICON_SIZE = 16;
// Error banner geometry per the auth-screens.jsx mockup's error row
// (`gap: 10`, `padding: '10px 12px'`, `marginBottom: 14`).
const ERROR_BANNER_GAP = 10;
const ERROR_BANNER_PADDING_VERTICAL = 10;
const ERROR_BANNER_MARGIN_BOTTOM = 14;
// Mockup puts `marginTop: 14` on the send button; carried here as the
// input block's bottom margin (the Terms line sits between them).
const INPUT_MARGIN_BOTTOM = 14;

/**
 * Email input form view for magic link authentication
 * Handles email input, validation, and submission
 */
export function EmailInputView({
  onSubmit,
  isLoading,
  error,
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
      <Text style={styles.title}>Welcome back</Text>
      <Text style={styles.body}>
        We'll send a sign-in link to your email. No password needed.
      </Text>

      {/* Error banner — bespoke composition (no Emberglow alert primitive).
          Renders whatever copy `use-magic-link` / the URL param produces;
          this component owns no error strings of its own. */}
      {error ? (
        <View style={styles.errorBanner} testID="error-message">
          <FlameKindling
            size={ERROR_ICON_SIZE}
            color={tints.cinnabar80}
            style={styles.errorIcon}
          />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

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

      {/* Terms and privacy — kept even though the mockup omits it (legal). */}
      <Text style={styles.terms}>
        By signing in to this app you agree with our{' '}
        <Text
          style={styles.termsLink}
          onPress={() => Linking.openURL(TERMS_URL)}
          accessibilityRole="link"
          accessibilityLabel="Terms of Use and Privacy Policy"
        >
          Terms of Use and Privacy Policy
        </Text>
        .
      </Text>

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
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: ERROR_BANNER_GAP,
    backgroundColor: withAlpha(palette.cinnabar, 0.12),
    borderWidth: 1,
    borderColor: withAlpha(palette.cinnabar, 0.4),
    borderRadius: radii.md,
    paddingVertical: ERROR_BANNER_PADDING_VERTICAL,
    paddingHorizontal: spacing[3],
    marginBottom: ERROR_BANNER_MARGIN_BOTTOM,
  },
  errorIcon: {
    marginTop: 2,
  },
  errorText: {
    flex: 1,
    fontFamily: fontFamily.regular,
    fontSize: 13.5,
    lineHeight: 13.5 * 1.45,
    color: colors.text.secondary,
  },
  inputContainer: {
    marginBottom: INPUT_MARGIN_BOTTOM,
  },
  terms: {
    fontFamily: fontFamily.regular,
    fontSize: 12.5,
    lineHeight: 12.5 * 1.5,
    color: colors.text.muted,
    textAlign: 'center',
    marginBottom: spacing[4],
  },
  termsLink: {
    fontFamily: fontFamily.medium,
    color: colors.text.secondary,
    textDecorationLine: 'underline',
  },
});
