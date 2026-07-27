import * as React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/emberglow';
import { spacing } from '@/theme';

import { LOGIN_COPY } from './copy';
import { cardBody, cardTitle } from './text-styles';
import type { LoginIntent } from './types';

export type NoAccountViewProps = {
  /** How the user arrived, which picks the framing (see `copy.ts`). */
  intent: LoginIntent;
  /**
   * The address the user just authorized with the provider. May be `''` —
   * `api/auth.ts` falls back to that rather than failing the sign-in over a
   * display string, and the copy table drops the clause when it is empty.
   */
  email: string;
  /** Into onboarding. This view owns no navigation. */
  onBeginJourney: () => void;
  /** Re-runs the provider with a fresh chooser. Only rendered when the
   * framing says a retry can succeed. */
  onTryAnotherAccount: () => void;
};

/**
 * Shown when the server reports that a verified identity owns no account.
 *
 * The dead end this replaces was the point: account creation now belongs to
 * onboarding, so this screen's job is to name what happened and hand the user
 * the way forward, not to apologise.
 */
export function NoAccountView({
  intent,
  email,
  onBeginJourney,
  onTryAnotherAccount,
}: NoAccountViewProps) {
  const copy = LOGIN_COPY[intent];

  return (
    <View>
      <Text style={styles.title}>{copy.noAccountTitle}</Text>
      <Text style={styles.body}>{copy.noAccountBody(email)}</Text>

      <Button
        testID="no-account-begin-button"
        label={copy.noAccountPrimaryLabel}
        variant="primary"
        size="lg"
        fullWidth
        onPress={onBeginJourney}
      />

      {copy.noAccountShowsRetry ? (
        <Button
          testID="no-account-retry-button"
          label="Try another account"
          variant="ghost"
          fullWidth
          onPress={onTryAnotherAccount}
          containerStyle={styles.retry}
        />
      ) : null}
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
    marginTop: spacing[2],
    marginBottom: spacing[6],
  },
  retry: {
    marginTop: spacing[2],
  },
});
