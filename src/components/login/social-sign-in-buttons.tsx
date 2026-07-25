import axios from 'axios';
import * as AppleAuthentication from 'expo-apple-authentication';
import { usePostHog } from 'posthog-react-native';
import * as React from 'react';
import { Image, Platform, StyleSheet, Text, View } from 'react-native';
import { showMessage } from 'react-native-flash-message';

import { socialSignIn } from '@/api/auth';
import { Button } from '@/components/emberglow';
import {
  ExistingAccountConfirmationRequired,
  type ExistingAccountSummary,
  getAppleCredential,
  getGoogleCredential,
  SOCIAL_SIGNIN_OUTCOMES,
  SocialSignInCancelled,
  type SocialSignInOutcome,
} from '@/lib/auth/social';
import { colors, fontFamily, radii, spacing } from '@/theme';

import { ExistingAccountSheet } from './existing-account-sheet';

export type SocialProvider = 'google' | 'apple';

/** A credential exactly as the native wrapper produced it. Held in state across
 * the confirmation sheet so a confirmed collision can be re-posted verbatim —
 * including Apple's raw `nonce`, which the server needs to verify the token and
 * which a second `getAppleCredential()` would regenerate. */
type SocialCredential =
  | Awaited<ReturnType<typeof getGoogleCredential>>
  | Awaited<ReturnType<typeof getAppleCredential>>;

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
  // The attempt parked on the confirmation sheet: the credential the user
  // already produced, so confirming replays it instead of sending them back
  // through the provider's UI, plus the summary the sheet renders.
  const [pendingCollision, setPendingCollision] = React.useState<{
    credential: SocialCredential;
    provider: SocialProvider;
    account: ExistingAccountSummary;
  } | null>(null);

  /**
   * Everything that follows a successful credential exchange, in one place:
   * the first attempt and the confirmed replay both land here, so the toast,
   * the success event and `onSuccess` can't drift apart or fire twice.
   */
  const finishSignIn = React.useCallback(
    (
      { target, outcome }: Awaited<ReturnType<typeof socialSignIn>>,
      provider: SocialProvider
    ) => {
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
    },
    [onSuccess, posthog]
  );

  /**
   * The failure tail, shared by the first attempt and the confirmed replay for
   * the same reason as `finishSignIn`: a replay that grew its own copy would be
   * the one that stops logging, or reports a different `reason`.
   *
   * Deliberately has NO `ExistingAccountConfirmationRequired` branch. That is
   * intercepted before this runs, and a replay that somehow collided again must
   * not re-open the sheet — the user has already answered, and asking the same
   * question again is a loop.
   */
  const reportFailure = React.useCallback(
    (error: unknown, provider: SocialProvider) => {
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
    },
    [onError, posthog]
  );

  const handleSignIn = React.useCallback(
    async (provider: SocialProvider) => {
      if (isSigningIn) return;
      setIsSigningIn(true);

      // Hoisted out of the `try` so the collision branch below can hand it to
      // the sheet — that branch is the whole reason it lives here.
      let credential: SocialCredential | undefined;
      // Set when the attempt parks on the sheet rather than ending: the
      // `finally` must not re-enable the buttons then. They sit behind the
      // sheet, and the attempt resumes (or ends) in the confirm/dismiss
      // handlers, which own the reset for that path.
      let awaitingConfirmation = false;

      try {
        credential =
          provider === 'google'
            ? await getGoogleCredential()
            : await getAppleCredential();

        finishSignIn(await socialSignIn(credential), provider);
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

        // MUST come before `reportFailure`. This error carries no `response`
        // and no `status`, so `describeFailure` reduces it to `{}` — the
        // collision would reach the generic retry copy AND fire a
        // `social_signin_failure` event for a path where nothing failed. It is
        // also why nothing is logged here: this is an expected branch, and
        // `reportFailure`'s console line is for things that are actually wrong.
        //
        // `credential` is necessarily set (only `socialSignIn` throws this),
        // but the guard is what lets TypeScript prove it — and if it somehow
        // weren't, falling through to the generic copy is the right answer.
        if (
          error instanceof ExistingAccountConfirmationRequired &&
          credential
        ) {
          posthog.capture('social_signin_existing_account_prompt', {
            provider,
          });
          setPendingCollision({ credential, provider, account: error.account });
          awaitingConfirmation = true;
          return;
        }

        reportFailure(error, provider);
      } finally {
        if (!awaitingConfirmation) setIsSigningIn(false);
      }
    },
    [isSigningIn, finishSignIn, reportFailure, posthog]
  );

  const handleConfirmExistingAccount = React.useCallback(async () => {
    // Also the narrowing TypeScript needs: `pendingCollision` is only non-null
    // while the sheet is up, which is the only time this can be pressed.
    if (!pendingCollision) return;
    const { credential, provider } = pendingCollision;

    posthog.capture('social_signin_existing_account_confirmed', { provider });
    // Closed before the re-post, not after: the sheet has no in-flight state of
    // its own, so leaving it up would show an unresponsive confirm button for
    // the length of a network round trip.
    setPendingCollision(null);

    try {
      finishSignIn(await socialSignIn(credential, true), provider);
    } catch (error) {
      reportFailure(error, provider);
    } finally {
      // The parked attempt is over either way. Without this the buttons stay
      // disabled for the rest of the screen's life — which matters most on the
      // failure path, where retrying is exactly what the user is told to do.
      setIsSigningIn(false);
    }
  }, [finishSignIn, pendingCollision, posthog, reportFailure]);

  const handleDismissExistingAccount = React.useCallback(() => {
    // Same narrowing as above. The sheet already suppresses the `onDismiss` it
    // fires for its own programmatic closes, so this is the user backing out.
    if (!pendingCollision) return;

    posthog.capture('social_signin_existing_account_dismissed', {
      provider: pendingCollision.provider,
    });
    setPendingCollision(null);
    setIsSigningIn(false);
  }, [pendingCollision, posthog]);

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
              // CONTINUE, not SIGN_IN: this button can create an account, and
              // Apple's HIG reserves "Sign in with Apple" for pure sign-in.
              // The label is OS-localized — we don't control the string.
              AppleAuthentication.AppleAuthenticationButtonType.CONTINUE
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

      {/* Mounted unconditionally, visibility driven by state: the sheet owns a
          `@gorhom/bottom-sheet` ref internally, and a modal that only mounts
          once it should already be open has no ref to `present()` on.
          `account` must never be `undefined` — the sheet reads it on every
          render — and `{}` is a shape it already handles by rendering no
          summary card at all. */}
      <ExistingAccountSheet
        visible={pendingCollision !== null}
        account={pendingCollision?.account ?? {}}
        onConfirm={handleConfirmExistingAccount}
        onDismiss={handleDismissExistingAccount}
      />
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
