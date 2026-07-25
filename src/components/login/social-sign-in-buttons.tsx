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
  /** Promotes the Google button to the screen's single primary (ember)
   * action — solid Cinnabar with a warm glow instead of the default
   * `outline`. Off by default because the login screen's magic-link submit
   * already owns the one-primary-per-screen slot there (brand rule: orange is
   * scarce and meaningful); the quest-completed-signup conversion screen, where
   * Google IS the main action, opts in. */
  googlePrimary?: boolean;
};

const APPLE_BUTTON_HEIGHT = 54;
const GOOGLE_LOGO_SIZE = 18;

/**
 * Reduces a sign-in failure to the two bounded identifiers that are safe to
 * retain in analytics: the native SDK's `code` (e.g. Google's
 * `'DEVELOPER_ERROR'`, Apple's `'ERR_REQUEST_CANCELED'`) and the HTTP status
 * of a server rejection.
 *
 * Deliberately omits `error.message`. Axios embeds the request URL — and for
 * some failures the response body — in its message, and PostHog events are
 * retained and queryable indefinitely, so a free-text message is an unbounded
 * channel for user data to leak into analytics. The full error still reaches
 * the local console (see the caller), which is where the rich detail belongs:
 * ephemeral, developer-only, never transmitted.
 */
function describeFailure(error: unknown): { code?: string; status?: number } {
  const description: { code?: string; status?: number } = {};

  const code = (error as { code?: unknown } | null)?.code;
  if (typeof code === 'string' || typeof code === 'number') {
    description.code = String(code);
  }

  if (axios.isAxiosError(error) && error.response) {
    description.status = error.response.status;
  }

  return description;
}

export function SocialSignInButtons({
  onSuccess,
  onError,
  googlePrimary = false,
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
        const { code, status } = describeFailure(error);

        // This is the ONLY place the error is ever observed. `socialSignIn`
        // documents that it catches nothing, and every failure below
        // collapses into one of two retry messages — so without this log a
        // misconfigured OAuth client (`DEVELOPER_ERROR`), an unreachable API
        // host, and a server that hasn't been given its client ID (501) are
        // indistinguishable to whoever is holding the phone.
        console.error(`[SocialSignIn] ${provider} sign-in failed`, error);

        const isEmailInUse = status === 409;

        posthog.capture('social_signin_failure', {
          provider,
          reason: isEmailInUse ? 'email-in-use' : 'generic',
          ...(code === undefined ? {} : { code }),
          ...(status === undefined ? {} : { status }),
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
        variant={googlePrimary ? 'primary' : 'outline'}
        glow={googlePrimary}
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
        <Text
          style={[
            styles.googleLabel,
            // Children bypass Button's per-variant label color, so the label
            // must track the variant itself: near-white onAccent on Cinnabar.
            googlePrimary && { color: colors.text.onAccent },
          ]}
        >
          Continue with Google
        </Text>
      </Button>
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
});
