import axios from 'axios';
import * as AppleAuthentication from 'expo-apple-authentication';
import { usePostHog } from 'posthog-react-native';
import * as React from 'react';
import {
  ActivityIndicator,
  Image,
  Platform,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { showMessage } from 'react-native-flash-message';

import { socialSignIn } from '@/api/auth';
import { Button } from '@/components/emberglow';
import {
  ExistingAccountConfirmationRequired,
  type ExistingAccountSummary,
  getAppleCredential,
  getGoogleCredential,
  NoAccountForIdentity,
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
   * magic-link flow; `'generic'` covers every other failure. A
   * `NoAccountForIdentity` instance is passed through raw instead of
   * collapsed to a kind string — unlike the other two, the caller needs the
   * carried `email` to render the no-account step, not just a copy lookup. */
  onError: (kind: 'email-in-use' | 'generic' | NoAccountForIdentity) => void;
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

const SIGNING_IN_LABEL = 'Signing you in…';

/**
 * The in-flight face of a social button: the provider's mark and its label are
 * both replaced, so the motion and the words say the same thing.
 *
 * Shared by the Google button and the Apple slot rather than written twice —
 * the two are the only places it appears, and a second copy is the one that
 * would keep saying "Continue with…" after the copy here changed.
 *
 * The window this covers is almost entirely the server round trip
 * (`socialSignIn`). Everything before it happens under the provider's own
 * full-screen sheet, where nobody can see this.
 */
function SigningInContent({ color }: { color: string }) {
  return (
    <>
      <ActivityIndicator testID="social-sign-in-spinner" color={color} />
      <Text style={[styles.buttonLabel, { color }]}>{SIGNING_IN_LABEL}</Text>
    </>
  );
}

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
  // Which provider's attempt is running, not merely whether one is — the two
  // buttons need different states from it: the one being used shows progress,
  // the other is simply unavailable. A boolean here is what left the Apple
  // button with no in-flight face of its own at all.
  //
  // Still the double-tap guard it always was: two concurrent attempts are a
  // race the server survives but nothing asks for (duplicate credential
  // exchanges, doubled analytics). Read synchronously at the top of
  // `handleSignIn`, before the first `await`.
  const [signingInProvider, setSigningInProvider] =
    React.useState<SocialProvider | null>(null);
  const isSigningIn = signingInProvider !== null;
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
      const { code, status } = describeFailure(error);

      // Every error that reaches here is the raw object `socialSignIn`
      // re-threw: its contract translates exactly one failure (the collision),
      // and that one is intercepted above. This log is the only place a real
      // fault is ever observed — every failure below collapses into one of two
      // retry messages, so without it a misconfigured OAuth client
      // (`DEVELOPER_ERROR`), an unreachable API host, and a server with no
      // client ID (501) are indistinguishable to whoever holds the phone.
      console.error(`[SocialSignIn] ${provider} sign-in failed`, error);

      // A 409 that got this far is the social account already being linked to a
      // different account, which the magic-link flow's existing copy covers.
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
      setSigningInProvider(provider);

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

        // Distinguished from every other failure the same way the collision
        // above is: the server told us something specific, and collapsing it
        // to 'generic' would lose the address the no-account screen names.
        // Deliberately has no `reportFailure` call — nothing here is a fault
        // to log, and firing `social_signin_failure` for it would flag an
        // expected, server-driven branch as an error.
        if (error instanceof NoAccountForIdentity) {
          posthog.capture('social_signin_no_account', { provider });
          onError(error);
          return;
        }

        reportFailure(error, provider);
      } finally {
        if (!awaitingConfirmation) setSigningInProvider(null);
      }
    },
    [isSigningIn, finishSignIn, reportFailure, posthog, onError]
  );

  const handleConfirmExistingAccount = React.useCallback(async () => {
    // Also the narrowing TypeScript needs — but load-bearing at runtime too:
    // the sheet stays mounted and pressable through its whole close animation
    // (@gorhom unmounts only after it, BottomSheetModal.tsx:287), and this
    // handler clears `pendingCollision` before the replay it starts has
    // returned. So this is what swallows a second press during the slide-out.
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
      setSigningInProvider(null);
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
    setSigningInProvider(null);
  }, [pendingCollision, posthog]);

  return (
    <View>
      {Platform.OS === 'ios' ? (
        // The native button cannot show progress — it renders its own label and
        // has no `disabled` (it only extends View props) — so the in-flight
        // face is a matching Emberglow button standing in its place for the
        // round trip. `size="lg"` is 54pt tall, the same as APPLE_BUTTON_HEIGHT,
        // so nothing below it moves during the swap.
        signingInProvider === 'apple' ? (
          <Button
            testID="apple-sign-in-progress"
            variant="outline"
            size="lg"
            fullWidth
            busy
            containerStyle={styles.appleButtonWrapper}
            accessibilityLabel={SIGNING_IN_LABEL}
          >
            <SigningInContent color={colors.text.primary} />
          </Button>
        ) : (
          <View
            testID="apple-sign-in-wrapper"
            style={[
              styles.appleButtonWrapper,
              // Google is mid-flight: dropping pointer events alone left this
              // button looking fully available while silently eating taps —
              // the dim is what tells you it is the other one that is working.
              isSigningIn && styles.unavailable,
            ]}
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
        )
      ) : null}

      <Button
        testID="google-sign-in-button"
        variant={googlePrimary ? 'primary' : 'outline'}
        glow={googlePrimary}
        size="lg"
        fullWidth
        // Split deliberately: `busy` blocks presses without the 40% dim, so the
        // spinner reads as working, while Apple's attempt leaves this button
        // genuinely unavailable and dimmed.
        busy={signingInProvider === 'google'}
        disabled={signingInProvider === 'apple'}
        onPress={() => handleSignIn('google')}
        accessibilityLabel={
          signingInProvider === 'google'
            ? SIGNING_IN_LABEL
            : 'Continue with Google'
        }
      >
        {signingInProvider === 'google' ? (
          <SigningInContent
            color={googlePrimary ? colors.text.onAccent : colors.text.primary}
          />
        ) : (
          <>
            <Image
              source={require('@/../assets/images/google-g-logo.png')}
              style={styles.googleLogo}
            />
            <Text
              style={[
                styles.buttonLabel,
                // Children bypass Button's per-variant label color, so the label
                // must track the variant itself: near-white onAccent on Cinnabar.
                googlePrimary && { color: colors.text.onAccent },
              ]}
            >
              Continue with Google
            </Text>
          </>
        )}
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
  /** Matches Button's own `disabled` dim (button.tsx's `styles.disabled`), so
   * the native Apple button greys out the same amount the Google one does. */
  unavailable: {
    opacity: 0.4,
  },
  googleLogo: {
    width: GOOGLE_LOGO_SIZE,
    height: GOOGLE_LOGO_SIZE,
  },
  buttonLabel: {
    fontFamily: fontFamily.semibold,
    // Matches Button's own `size="lg"` label fontSize (see button.tsx's
    // `sizeStyles.lg.fontSize`) — this Text replaces that default label,
    // so it should render at the same size the button would otherwise use.
    fontSize: 17,
    color: colors.text.primary,
  },
});
