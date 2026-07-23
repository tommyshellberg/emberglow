import axios from 'axios';
import * as AppleAuthentication from 'expo-apple-authentication';
import { usePostHog } from 'posthog-react-native';
import * as React from 'react';
import { Image, Platform, StyleSheet, Text, View } from 'react-native';
import { showMessage } from 'react-native-flash-message';

import { socialSignIn } from '@/api/auth';
import { Button } from '@/components/emberglow';
import {
  getAppleCredential,
  getGoogleCredential,
  SOCIAL_SIGNIN_OUTCOMES,
  SocialSignInCancelled,
  type SocialSignInOutcome,
} from '@/lib/auth/social';
import { colors, fontFamily, radii, spacing } from '@/theme';

export type SocialProvider = 'google' | 'apple';

export type SocialSignInButtonsProps = {
  /** Called after a successful credential exchange. `target`/`outcome` are
   * forwarded rather than just `target`, because the server's `outcome`
   * (e.g. `'created'` vs `'existing-account-login'`) is what the caller
   * needs to route brand-new users differently — `completeSignIn` always
   * resolves `'app'` today (see `src/api/auth.ts`'s JSDoc). `provider` is
   * forwarded too so a caller that fires its own funnel analytics (e.g. the
   * quest-completed-signup conversion screen's `signup_completed`) doesn't
   * have to duplicate the google/apple branch this component already ran.
   *
   * Note: the `existing-account-login` success toast ("Welcome back...")
   * is shown INSIDE this component, not the caller's — `onSuccess` fires
   * after it. All error-state UI, by contrast, is entirely the caller's
   * responsibility via `onError`. */
  onSuccess: (
    target: 'onboarding' | 'app',
    outcome: SocialSignInOutcome | (string & {}),
    provider: SocialProvider
  ) => void;
  /** `'email-in-use'` maps to the existing 409 copy already used by the
   * magic-link flow; `'generic'` covers every other failure. */
  onError: (kind: 'email-in-use' | 'generic') => void;
};

const APPLE_BUTTON_HEIGHT = 54;
const GOOGLE_LOGO_SIZE = 18;

export function SocialSignInButtons({
  onSuccess,
  onError,
}: SocialSignInButtonsProps) {
  const posthog = usePostHog();
  // Guards against a double-tap firing two concurrent sign-in attempts —
  // the server handles the resulting race safely, but there's no reason to
  // invite it (duplicate credential exchanges, doubled analytics). Checked
  // synchronously at the top of `handleSignIn` (before the first `await`),
  // so a second tap in the same event loop turn still sees it.
  const [isSigningIn, setIsSigningIn] = React.useState(false);

  const handleSignIn = React.useCallback(
    async (provider: SocialProvider) => {
      if (isSigningIn) return;
      setIsSigningIn(true);

      try {
        const credential =
          provider === 'google'
            ? await getGoogleCredential()
            : await getAppleCredential();
        const { target, outcome } = await socialSignIn(credential);

        posthog.capture('social_signin_success', { provider, outcome });

        if (outcome === SOCIAL_SIGNIN_OUTCOMES.EXISTING_ACCOUNT_LOGIN) {
          showMessage({
            message: 'Welcome back',
            description: 'You signed into your existing account.',
            type: 'success',
            duration: 3000,
          });
        }

        onSuccess(target, outcome, provider);
      } catch (error) {
        if (error instanceof SocialSignInCancelled) {
          // Cancelling is a routine dismissal, not a failure — it's folded
          // into the `social_signin_attempt` event (via `outcome`) rather
          // than promoted to a `social_signin_failure` capture.
          posthog.capture('social_signin_attempt', {
            provider,
            outcome: 'cancelled',
          });
          return;
        }

        // `socialSignIn` (src/api/auth.ts) propagates errors raw — this is
        // the catch layer. A 409 means the social account is already
        // linked to a different account (the existing magic-link 409 copy
        // covers it); everything else collapses to a generic retry
        // message.
        const isEmailInUse =
          axios.isAxiosError(error) && error.response?.status === 409;

        posthog.capture('social_signin_failure', {
          provider,
          reason: isEmailInUse ? 'email-in-use' : 'generic',
        });
        onError(isEmailInUse ? 'email-in-use' : 'generic');
      } finally {
        setIsSigningIn(false);
      }
    },
    [isSigningIn, onError, onSuccess, posthog]
  );

  return (
    <View>
      {Platform.OS === 'ios' ? (
        <View
          style={styles.appleButtonWrapper}
          // AppleAuthenticationButton has no `disabled` prop of its own
          // (it only extends View props) — dropping pointer events is the
          // only way to apply the same in-flight guard to it as the
          // Google button gets via `disabled`.
          pointerEvents={isSigningIn ? 'none' : 'auto'}
        >
          <AppleAuthentication.AppleAuthenticationButton
            testID="apple-sign-in-button"
            buttonType={
              AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN
            }
            buttonStyle={
              AppleAuthentication.AppleAuthenticationButtonStyle.WHITE
            }
            cornerRadius={radii.pill}
            style={styles.appleButton}
            onPress={() => handleSignIn('apple')}
          />
        </View>
      ) : null}

      <Button
        testID="google-sign-in-button"
        variant="outline"
        size="lg"
        fullWidth
        disabled={isSigningIn}
        onPress={() => handleSignIn('google')}
        accessibilityLabel="Continue with Google"
      >
        <Image
          source={require('@/../assets/images/google-g-logo.png')}
          style={styles.googleLogo}
        />
        <Text style={styles.googleLabel}>Continue with Google</Text>
      </Button>

      <View
        style={styles.dividerRow}
        testID="social-signin-divider"
        // Purely decorative — "or" between two buttons that are already
        // individually labeled conveys nothing extra to a screen reader.
        // Both props are required for cross-platform coverage: iOS reads
        // `accessibilityElementsHidden`, Android reads
        // `importantForAccessibility`.
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        <View style={styles.dividerLine} />
        <Text style={styles.dividerText}>or</Text>
        <View style={styles.dividerLine} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  appleButtonWrapper: {
    marginBottom: spacing[3],
  },
  appleButton: {
    height: APPLE_BUTTON_HEIGHT,
    width: '100%',
  },
  googleLogo: {
    width: GOOGLE_LOGO_SIZE,
    height: GOOGLE_LOGO_SIZE,
  },
  googleLabel: {
    fontFamily: fontFamily.semibold,
    // Matches Button's own `size="lg"` label fontSize (see button.tsx's
    // `sizeStyles.lg.fontSize`) — this Text replaces that default label,
    // so it should render at the same size the button would otherwise use.
    fontSize: 17,
    color: colors.text.primary,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    marginTop: spacing[4],
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border.hairline,
  },
  dividerText: {
    fontFamily: fontFamily.regular,
    fontSize: 13,
    color: colors.text.muted,
  },
});
