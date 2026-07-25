import * as React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/emberglow';
import { spacing } from '@/theme';

import { LOGIN_COPY } from './copy';
import { ErrorBanner } from './error-banner';
import { SocialDivider } from './social-divider';
import type { SocialSignInButtonsProps } from './social-sign-in-buttons';
import { SocialSignInButtons } from './social-sign-in-buttons';
import { cardBody, cardTitle } from './text-styles';
import type { LoginIntent } from './types';

export type ChooserViewProps = {
  /**
   * How the user arrived, which picks the framing (see `copy.ts`). Resolved
   * against `LOGIN_COPY` here rather than by the caller because the chooser
   * subtitle is a FUNCTION of `heroName` — leaving that to callers means every
   * one of them has to know to call it, with the right argument.
   */
  intent: LoginIntent;
  /**
   * The hero the `convert` framing names. A prop rather than a
   * `useCharacterStore` read for the same reason `copy.ts` takes it as an
   * argument: this view stays a pure function of its inputs, testable without
   * store setup. `character?.name` can be passed straight through — `null`,
   * `undefined` and `''` all resolve to the copy table's generic fallback.
   */
  heroName?: string | null;
  /** Failure copy from either auth path; empty renders no banner. */
  error: string;
  /** Advance to the email/magic-link step. This view owns no navigation. */
  onContinueWithEmail: () => void;
  /** Forwarded verbatim to `SocialSignInButtons` — routing and error state
   * belong to the screen, not to the chooser. */
  onSocialSuccess: SocialSignInButtonsProps['onSuccess'];
  onSocialError: SocialSignInButtonsProps['onError'];
};

/**
 * Step one of `/login`: the social-first chooser — Apple (iOS only) and Google,
 * an "or" rule, then the email alternative.
 *
 * The legal line is NOT here, though the spec first put it here. `login-form.tsx`
 * renders it for the whole screen, because `intent=convert` opens straight on the
 * email step and would otherwise complete a signup having shown no terms at all.
 * Adding it back here would render it twice on this step.
 *
 * Deliberately has no Cinnabar action. Orange is scarce and meaningful in this
 * brand, and the one primary in the login card is spent on the email step's
 * "Send sign-in link" — so "Continue with email" is `secondary` and
 * `SocialSignInButtons`' `googlePrimary` stays off (that opt-in exists for the
 * post-quest conversion screen, where Google IS the main action).
 */
export function ChooserView({
  intent,
  heroName,
  error,
  onContinueWithEmail,
  onSocialSuccess,
  onSocialError,
}: ChooserViewProps) {
  const copy = LOGIN_COPY[intent];

  return (
    <View>
      <Text style={styles.title}>{copy.chooserTitle}</Text>
      <Text style={styles.body}>{copy.chooserSubtitle(heroName)}</Text>

      <ErrorBanner error={error} />

      <SocialSignInButtons
        onSuccess={onSocialSuccess}
        onError={onSocialError}
      />
      <SocialDivider />

      <Button
        testID="continue-with-email-button"
        variant="secondary"
        size="lg"
        fullWidth
        label="Continue with email"
        onPress={onContinueWithEmail}
        containerStyle={styles.emailButton}
        accessibilityLabel="Continue with email"
        accessibilityHint="Opens the email step, where a sign-in link is sent to your address"
      />
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
  emailButton: {
    marginTop: spacing[4],
  },
});
