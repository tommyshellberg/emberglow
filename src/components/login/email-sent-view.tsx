import * as Linking from 'expo-linking';
import { Mail } from 'lucide-react-native';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/emberglow';
import {
  colors,
  fontFamily,
  palette,
  shadows,
  spacing,
  withAlpha,
} from '@/theme';

import { CONTACT_EMAIL, SEND_ATTEMPTS_THRESHOLD } from './constants';
import { cardBody, cardMeta, cardTitle } from './text-styles';

type EmailSentViewProps = {
  email: string;
  onSendAgain: () => void;
  onChangeEmail: () => void;
  isLoading: boolean;
  sendAttempts: number;
  /** Error from a failed resend attempt — presentation of existing
   * `use-magic-link` state, previously dropped silently on this screen. */
  error: string;
};

const MAIL_ICON_SIZE = 24;
const ICON_DISC_SIZE = 56;
// Per the auth-screens.jsx mockup's LoginSentFrame: title `margin: '14px 0
// 4px'`, ghost button `marginTop: 6`, footnote `margin: '14px 6px 0'`.
const TITLE_MARGIN_TOP = 14;
const CHANGE_EMAIL_MARGIN_TOP = 6;
const FOOTNOTE_MARGIN_TOP = 14;

/**
 * Success view shown after magic link email is sent
 * Shows confirmation message and options to resend or change email
 */
export function EmailSentView({
  email,
  onSendAgain,
  onChangeEmail,
  isLoading,
  sendAttempts,
  error,
}: EmailSentViewProps) {
  const handleContactSupport = () => {
    Linking.openURL(`mailto:${CONTACT_EMAIL}?subject=Login%20Help`);
  };

  const showSupportContact = sendAttempts > SEND_ATTEMPTS_THRESHOLD;
  // Default deliverability nudge — only shown when there's nothing more
  // pressing (a resend error or the support-contact escalation) to say in
  // the footnote slot.
  const showSpamHint = !error && !showSupportContact;

  return (
    <View>
      <View style={styles.header}>
        <View style={styles.iconDisc}>
          <Mail size={MAIL_ICON_SIZE} color={palette.sandy} />
        </View>
        <Text style={styles.title}>Check your inbox</Text>
        <Text style={styles.body}>
          A sign-in link is on its way to{' '}
          <Text style={styles.email}>{email}</Text>
        </Text>
      </View>

      <Button
        testID="send-again-button"
        variant="secondary"
        fullWidth
        label="Resend link"
        onPress={onSendAgain}
        disabled={isLoading}
        accessibilityLabel="Send login link again"
        accessibilityHint="Resends the magic link to your email"
        containerStyle={styles.resendButton}
      />
      <Button
        variant="ghost"
        fullWidth
        label="Change email"
        onPress={onChangeEmail}
        disabled={isLoading}
        accessibilityLabel="Change email address"
        accessibilityHint="Returns to the email entry form"
        containerStyle={styles.changeEmailButton}
      />

      {error ? <Text style={styles.footnote}>{error}</Text> : null}
      {showSupportContact ? (
        <Text style={styles.footnote}>
          Having trouble? {'\n'} Write us at{' '}
          <Text
            style={styles.footnoteLink}
            onPress={handleContactSupport}
            accessibilityRole="link"
            accessibilityLabel={`Contact support at ${CONTACT_EMAIL}`}
          >
            {CONTACT_EMAIL}
          </Text>
        </Text>
      ) : null}
      {showSpamHint ? (
        <Text style={styles.footnote}>
          Didn't see it? Check your spam folder.
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    alignItems: 'center',
  },
  iconDisc: {
    width: ICON_DISC_SIZE,
    height: ICON_DISC_SIZE,
    borderRadius: ICON_DISC_SIZE / 2,
    backgroundColor: withAlpha(palette.sandy, 0.14),
    borderWidth: 1,
    borderColor: withAlpha(palette.sandy, 0.45),
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.glowWarm,
  },
  title: {
    ...cardTitle,
    marginTop: TITLE_MARGIN_TOP,
    marginBottom: spacing[1],
  },
  body: {
    ...cardBody,
    textAlign: 'center',
  },
  email: {
    fontFamily: fontFamily.semibold,
    color: colors.text.primary,
  },
  resendButton: {
    marginTop: spacing[5],
  },
  changeEmailButton: {
    marginTop: CHANGE_EMAIL_MARGIN_TOP,
  },
  footnote: {
    ...cardMeta,
    textAlign: 'center',
    marginTop: FOOTNOTE_MARGIN_TOP,
  },
  footnoteLink: {
    fontFamily: fontFamily.medium,
    color: colors.text.accent,
    textDecorationLine: 'underline',
  },
});
