import { LinearGradient } from 'expo-linear-gradient';
import * as Linking from 'expo-linking';
import { router } from 'expo-router';
import { usePostHog } from 'posthog-react-native';
import React, { useEffect, useState } from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';

import type { SocialProvider } from '@/components/login';
import { useAuth } from '@/lib/auth';
import {
  SOCIAL_SIGNIN_OUTCOMES,
  type SocialSignInOutcome,
} from '@/lib/auth/social';
import { removeItem } from '@/lib/storage';
import { useCharacterStore } from '@/store/character-store';
import { useOnboardingStore } from '@/store/onboarding-store';
import { colors, fontFamily, radii, scrims, shadows, spacing } from '@/theme';

import { ChooserView } from './login/chooser-view';
import {
  BRAND_NAME,
  EMAIL_IN_USE_ERROR_MESSAGE,
  GENERIC_SEND_ERROR_MESSAGE,
  LOGO_SIZE,
  TERMS_URL,
} from './login/constants';
import { DEFAULT_LOGIN_INTENT, LOGIN_COPY } from './login/copy';
import { EmailInputView } from './login/email-input-view';
import { EmailSentView } from './login/email-sent-view';
import { useMagicLink } from './login/hooks/use-magic-link';
import { cardMeta } from './login/text-styles';
import type { LoginFormProps } from './login/types';

export type { LoginFormProps };

// KeyboardAvoidingView config (behavior + offset) is load-bearing for
// keeping the focused input visible above the keyboard on the
// bottom-anchored card — do not change it as part of the Emberglow
// recomposition.
const KEYBOARD_OFFSET = 10;

// Card padding per the auth-screens.jsx mockup's LoginCard
// (`padding: '22px 20px'`).
const CARD_PADDING_VERTICAL = 22;
const CARD_PADDING_HORIZONTAL = 20;

/**
 * Maps `SocialSignInButtons`'s `onError` kind to the same copy the
 * magic-link flow already shows for the equivalent failure (see
 * `use-magic-link.ts`) — a 409 (or any other failure) means the same thing
 * to the user regardless of which auth path produced it.
 */
function mapError(kind: 'email-in-use' | 'generic'): string {
  return kind === 'email-in-use'
    ? EMAIL_IN_USE_ERROR_MESSAGE
    : GENERIC_SEND_ERROR_MESSAGE;
}

/**
 * Main login form component
 * Handles magic link authentication with email input and success states
 */
export const LoginForm = ({
  onSubmit,
  initialError,
  // A caller that supplies no intent is the returning-user case — the same
  // default `parseLoginIntent` gives a `/login` URL with no param.
  intent = DEFAULT_LOGIN_INTENT,
}: LoginFormProps) => {
  const copy = LOGIN_COPY[intent];
  const posthog = usePostHog();
  const resetOnboarding = useOnboardingStore((state) => state.resetOnboarding);
  const signOut = useAuth((state) => state.signOut);
  // Read here rather than inside `ChooserView` so that view stays a pure
  // function of its props (see its `heroName` JSDoc) — the shell is the layer
  // that already talks to stores. `character?.name` goes straight through:
  // `copy.ts` owns the missing-name fallback.
  const character = useCharacterStore((state) => state.character);

  // Which of the two user-chosen steps is showing. `sent` is not in here — see
  // `step` below.
  //
  // `convert` opens on the email step: the user arrived from
  // `quest-completed-signup.tsx`, which already presented Apple, Google and
  // email, so re-presenting the same three choices would be asking twice. The
  // back link is how they get to the chooser from there.
  const [mode, setMode] = useState<'chooser' | 'email'>(
    intent === 'convert' ? 'email' : 'chooser'
  );

  const {
    isLoading,
    error,
    emailSent,
    sendAttempts,
    submittedEmail,
    requestMagicLink: sendMagicLink,
    resetForm,
    setError,
  } = useMagicLink();

  // Handle initial error from URL params
  useEffect(() => {
    if (initialError) {
      setError(initialError);
    }
  }, [initialError, setError]);

  // Three rendered steps, two pieces of state. `sent` is the send's OUTCOME,
  // owned by `useMagicLink`, not a step the user navigates to — copying it into
  // `mode` would give it two homes that have to agree. Deriving it also makes
  // "Change email" (`resetForm`, which only unsets `emailSent`) land back on the
  // email step for free.
  const step: 'chooser' | 'email' | 'sent' = emailSent ? 'sent' : mode;

  const handleEmailSubmit = async (email: string) => {
    await sendMagicLink(email, (submittedEmail) => {
      onSubmit?.({ email: submittedEmail });
    });
  };

  const handleBackToChooser = () => {
    // Clearing the error is not incidental tidying: `error` at this point is
    // whatever the email step produced (a failed send, a 409 on that address).
    // Left set, it would render in the chooser's banner directly above the
    // Apple and Google buttons and read as their failure.
    setError('');
    setMode('chooser');
  };

  const handleSocialSignInSuccess = (
    target: 'onboarding' | 'app',
    outcome: SocialSignInOutcome | (string & {}),
    provider: SocialProvider
  ) => {
    // `completeSignIn` (src/api/auth.ts) always resolves target 'app' today
    // — 'onboarding' is unreachable (see its JSDoc) — so mirroring
    // verify.tsx's target-only routing would send a brand-new social
    // signup (`outcome === 'created'`: a full user created directly from
    // THIS screen, with no character — a state the app never had before
    // social sign-in) straight into the app shell. Nothing under
    // `(app)/` checks for a missing character, and the verified-user-on-
    // fresh-install sync effect in navigation-state-resolver.ts actively
    // marks onboarding COMPLETED for exactly this signed-in/no-provisional-
    // data shape — it would never send them to onboarding on its own
    // either. So `created` is routed to onboarding explicitly here; every
    // other outcome follows `target`, same as verify.tsx.
    if (outcome === SOCIAL_SIGNIN_OUTCOMES.CREATED) {
      // This is a genuinely new full account created directly from the
      // login screen (as opposed to `login`/`existing-account-login`/
      // `linked`, all of which sign the user into an account that already
      // existed) — capture before navigating, same funnel event the
      // magic-link (verify.tsx) and quest-completed-signup paths fire.
      posthog.capture('signup_completed', { method: provider });
      router.replace('/onboarding');
      return;
    }

    router.replace(target === 'app' ? '/(app)/' : '/onboarding');
  };

  const handleCreateAccount = () => {
    // Clear all auth data and provisional data
    signOut();

    // Clear provisional data
    removeItem('provisionalRefreshToken');
    removeItem('provisionalAccessToken');
    removeItem('provisionalUserId');
    removeItem('provisionalEmail');

    // Reset onboarding state to allow starting fresh
    resetOnboarding();

    // Navigate to welcome screen
    router.replace('/onboarding/welcome');
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior="padding"
      keyboardVerticalOffset={KEYBOARD_OFFSET}
    >
      <View style={styles.flex}>
        {/* Background image (unchanged asset) */}
        <Image
          source={require('@/../assets/images/background/onboarding-bg.jpg')}
          style={styles.backgroundImage}
          accessibilityLabel="Background illustration"
        />

        {/* Scrims over the background art — same pattern as pending-quest.tsx */}
        <LinearGradient
          pointerEvents="none"
          colors={scrims.top.colors}
          start={scrims.top.start}
          end={scrims.top.end}
          style={styles.scrimTop}
        />
        <LinearGradient
          pointerEvents="none"
          colors={scrims.bottom.colors}
          start={scrims.bottom.start}
          end={scrims.bottom.end}
          style={styles.scrimBottom}
        />

        {/* Logo at the top */}
        <View style={styles.logoBlock}>
          <Image
            source={require('@/../assets/images/icon.png')}
            style={{ width: LOGO_SIZE, height: LOGO_SIZE }}
            accessibilityLabel={`${BRAND_NAME} app logo`}
          />
          <Text style={styles.wordmark}>{BRAND_NAME}</Text>
        </View>

        {/* Form in bottom half */}
        <View style={styles.formArea}>
          {/* Above the card, per spec §2: inside `formArea` so it moves with
              the bottom-anchored card, outside `styles.card` so it reads as a
              way out of the card rather than an action within it. Belongs to
              the email step, so it leaves with it — on the chooser it would
              point at nothing. */}
          {step === 'email' ? (
            <TouchableOpacity
              testID="back-to-chooser-link"
              onPress={handleBackToChooser}
              style={styles.backLink}
              accessibilityRole="button"
              accessibilityLabel="Other ways to sign in"
              accessibilityHint="Returns to the Apple, Google and email options"
            >
              <Text style={styles.backLinkText}>← Other ways to sign in</Text>
            </TouchableOpacity>
          ) : null}

          {/* Form card */}
          <View style={styles.card}>
            {step === 'sent' ? (
              <EmailSentView
                email={submittedEmail}
                onSendAgain={() => sendMagicLink(submittedEmail, () => {})}
                onChangeEmail={resetForm}
                isLoading={isLoading}
                sendAttempts={sendAttempts}
                error={error}
              />
            ) : (
              <>
                {step === 'chooser' ? (
                  <ChooserView
                    intent={intent}
                    heroName={character?.name}
                    error={error}
                    onContinueWithEmail={() => setMode('email')}
                    onSocialSuccess={handleSocialSignInSuccess}
                    onSocialError={(kind) => setError(mapError(kind))}
                  />
                ) : (
                  <EmailInputView
                    onSubmit={handleEmailSubmit}
                    isLoading={isLoading}
                    error={error}
                    title={copy.emailTitle}
                    subtitle={copy.emailSubtitle}
                  />
                )}

                {/* The screen's single consent point, deliberately OUTSIDE the
                    chooser/email switch.

                    It was on the chooser alone until this was found: `convert`
                    — the primary signup funnel — opens on the email step and
                    can complete a signup without ever rendering the chooser, so
                    "every user passes through the chooser first" was false and
                    that path showed no terms at all. Placing it here makes
                    coverage a property of the shell instead of an assumption
                    about which steps a user visits.

                    Not shown on `sent`: by then the account-creating action has
                    been taken, and `EmailSentView`'s footnote slot is already
                    contended by the resend error, the support escalation and
                    the spam hint. */}
                <Text testID="legal-consent" style={styles.terms}>
                  By continuing you agree to our{' '}
                  {/* One link over both names, not two: the document hosted at
                      TERMS_URL IS the combined "Terms of Service and Privacy
                      Policy" (see the landing page's terms route — one page, no
                      separate privacy URL and no anchors to deep-link). Split
                      this in two only once the policies are hosted
                      separately. */}
                  <Text
                    style={styles.termsLink}
                    onPress={() => Linking.openURL(TERMS_URL)}
                    accessibilityRole="link"
                    accessibilityLabel="Terms and Privacy Policy"
                  >
                    Terms and Privacy Policy
                  </Text>
                  .
                </Text>
              </>
            )}
          </View>

          {/* Link to go back to welcome screen */}
          <TouchableOpacity
            onPress={handleCreateAccount}
            style={styles.createAccountLink}
            accessibilityRole="button"
            accessibilityLabel="Create a new account"
          >
            <Text style={styles.createAccountText}>
              New here?{' '}
              <Text style={styles.createAccountAccent}>Create account</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  backgroundImage: {
    ...StyleSheet.absoluteFillObject,
    // Explicit 100%/100% is required on the New Architecture (Fabric): an
    // absolutely-positioned <Image> whose size comes only from the
    // absoluteFill insets falls back to the require()'d asset's intrinsic
    // pixel size anchored top-left, ignoring resizeMode. Giving it a
    // definite frame makes the image cover the screen. Do not remove.
    width: '100%',
    height: '100%',
  },
  scrimTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '30%',
  },
  scrimBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '78%',
  },
  logoBlock: {
    marginTop: spacing[12],
    alignItems: 'center',
    gap: spacing[3],
  },
  wordmark: {
    fontFamily: fontFamily.display,
    fontSize: 26,
    color: colors.text.primary,
  },
  formArea: {
    flex: 1,
    justifyContent: 'flex-end',
    marginBottom: spacing[12],
  },
  backLink: {
    // Same gutter as the card, so the link lines up with its left edge.
    marginHorizontal: spacing[6],
    marginBottom: spacing[3],
    alignSelf: 'flex-start',
  },
  backLinkText: {
    ...cardMeta,
    // One step brighter than `cardMeta`'s muted default: this one is tappable.
    color: colors.text.secondary,
  },
  card: {
    marginHorizontal: spacing[6],
    borderRadius: radii.lg,
    backgroundColor: colors.surface.card,
    borderWidth: 1,
    borderColor: colors.border.hairline,
    paddingVertical: CARD_PADDING_VERTICAL,
    paddingHorizontal: CARD_PADDING_HORIZONTAL,
    ...shadows.card,
  },
  terms: {
    ...cardMeta,
    textAlign: 'center',
    marginTop: spacing[4],
  },
  termsLink: {
    fontFamily: fontFamily.medium,
    color: colors.text.secondary,
    textDecorationLine: 'underline',
  },
  createAccountLink: {
    marginTop: spacing[4],
    alignItems: 'center',
  },
  createAccountText: {
    fontFamily: fontFamily.regular,
    fontSize: 14.5,
    color: colors.text.muted,
  },
  createAccountAccent: {
    fontFamily: fontFamily.semibold,
    color: colors.text.accent,
  },
});
