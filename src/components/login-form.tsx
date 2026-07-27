import { LinearGradient } from 'expo-linear-gradient';
import * as Linking from 'expo-linking';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';

import type { SocialProvider } from '@/components/login';
import { useAuth } from '@/lib/auth';
import {
  NoAccountForIdentity,
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
import { NoAccountView } from './login/no-account-view';
import { StartOverSheet } from './login/start-over-sheet';
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
  const resetOnboarding = useOnboardingStore((state) => state.resetOnboarding);
  const signOut = useAuth((state) => state.signOut);
  // Read here rather than inside `ChooserView` so that view stays a pure
  // function of its props (see its `heroName` JSDoc) — the shell is the layer
  // that already talks to stores. Selected down to the name (as
  // `onboarding/first-quest.tsx:89` and `app-introduction.tsx:133` also do)
  // rather than to `character`, so replacing the character object does not
  // re-render this whole screen for a name that did not change. Passed straight
  // through: `copy.ts` owns the missing-name fallback.
  const heroName = useCharacterStore((state) => state.character?.name);
  // Presence, selected as a boolean rather than as the `character` object, so
  // this stays a stable primitive for the same reason `heroName` is: replacing
  // the character does not re-render the screen. What it gates is the start-over
  // confirmation below — and it has to be presence in the STORE, not the entry
  // path: `use-token-refresh-error-handler.ts:36`, `navigation-gate.tsx:66` and
  // `utils/account.ts:69` all land users on plain `/login` (the `signin`
  // framing), provisional data and all.
  const hasHero = useCharacterStore((state) => Boolean(state.character));

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

  // Whether the start-over confirmation is open. State, not a ref, because the
  // sheet takes a controlled `visible` prop (see its JSDoc).
  const [isConfirmingStartOver, setIsConfirmingStartOver] = useState(false);

  // The address from a no-account failure. `null` means "not in that state" —
  // an empty STRING is a real value here (the server always sends an address,
  // but api/auth.ts falls back to '' rather than failing the sign-in over a
  // display string), so presence cannot be tested by truthiness.
  const [noAccountEmail, setNoAccountEmail] = useState<string | null>(null);

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
  // `mode` would give it two homes that have to agree.
  //
  // `resetForm` ("Change email") clears only hook state and never touches
  // `mode`, so `step` collapses back to whichever step the user was on. That is
  // only useful because the back link is inert while a send is pending (see
  // `isLoading` below): the transition out of `email` is blocked for exactly the
  // window in which `emailSent` can flip, so `mode === 'email'` is guaranteed
  // whenever that happens and the two can never disagree.
  const step: 'chooser' | 'email' | 'sent' | 'no-account' =
    noAccountEmail !== null ? 'no-account' : emailSent ? 'sent' : mode;

  const handleEmailSubmit = async (email: string) => {
    await sendMagicLink(email, (submittedEmail) => {
      onSubmit?.({ email: submittedEmail });
    });
  };

  // `error` always belongs to the step that produced it — a failed send on the
  // email step, a failed Apple/Google attempt on the chooser. Changing step
  // leaves that context behind, so clearing is part of moving, not a courtesy
  // one particular link performs. Carried forward it misattributes: the
  // chooser's generic social failure reuses the magic-link copy, so it would
  // greet the email step with "Login link failed to send" before a link exists.
  const goToMode = (next: 'chooser' | 'email') => {
    setError('');
    setMode(next);
  };

  const handleSocialSignInSuccess = (
    target: 'onboarding' | 'app',
    _outcome: SocialSignInOutcome | (string & {}),
    _provider: SocialProvider
  ) => {
    router.replace(target === 'app' ? '/(app)/' : '/onboarding');
  };

  /**
   * The server reported that the verified identity owns no account —
   * `/auth/social` no longer creates one. Names the address and hands the
   * user into onboarding instead of the generic-error path.
   */
  const handleSocialSignInError = (error: unknown) => {
    if (error instanceof NoAccountForIdentity) {
      setNoAccountEmail(error.email);
      return;
    }
    // Everything else keeps the existing generic/email-in-use mapping.
    setError(mapError(error === 'email-in-use' ? 'email-in-use' : 'generic'));
  };

  const handleBeginJourney = () => {
    setNoAccountEmail(null);
    // resetOnboarding, NOT setCurrentStep: the latter is forward-only and
    // silently discards a backward move (see f90a968). Only resetOnboarding
    // set()s the step directly, and NOT_STARTED is what runs the whole funnel.
    resetOnboarding();
    router.replace('/onboarding/welcome');
  };

  const handleTryAnotherAccount = () => {
    // Clearing this returns the user to the chooser; getGoogleCredential now
    // signs out of the SDK first, so the next attempt shows the account picker
    // rather than silently reusing the one that just failed.
    setNoAccountEmail(null);
  };

  /**
   * The link out to onboarding.
   *
   * A user with no character has no hero to lose here, so they go straight
   * through; any stray provisional keys are left alone (see emberglow#357 —
   * `provisionalEmail` is written before the provisional POST, so
   * "key on disk, `character === null`" is reachable when that POST fails and
   * `choose-character.tsx` resets the character). Signing out and clearing keys
   * for someone who only asked to see the welcome screen is the wrong default;
   * whether that state needs its own cleanup is #357's question, not this link's.
   * A user WITH a hero loses it and the quest they have finished, irreversibly,
   * so they get asked first.
   */
  const handleStartNewPress = () => {
    if (hasHero) {
      setIsConfirmingStartOver(true);
      return;
    }

    router.replace('/onboarding/welcome');
  };

  /**
   * Discards the provisional account. Reachable ONLY from the confirmation
   * sheet's primary action — every other way that sheet closes (its ghost
   * button, a swipe, the backdrop) routes to `onDismiss` and leaves all of this
   * unrun.
   */
  const discardHeroAndStartOver = () => {
    // Closed first so the sheet is gone regardless of what the navigation below
    // does to this screen, and so its own close never reports back as a
    // dismissal (see the sheet's `hasPresented` guard).
    setIsConfirmingStartOver(false);

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
              onPress={() => goToMode('chooser')}
              // Inert while a send is pending. Without this the user can leave
              // the email step mid-request and have the outcome land on a step
              // that never asked for it: a rejection renders its error in the
              // chooser's banner above Apple and Google, and a success shows the
              // sent view over `mode === 'chooser'`, so "Change email" collapses
              // to the chooser with no email input at all.
              disabled={isLoading}
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
            ) : step === 'chooser' ? (
              <ChooserView
                intent={intent}
                heroName={heroName}
                error={error}
                onContinueWithEmail={() => goToMode('email')}
                onSocialSuccess={handleSocialSignInSuccess}
                onSocialError={handleSocialSignInError}
              />
            ) : step === 'no-account' ? (
              <NoAccountView
                intent={intent}
                email={noAccountEmail ?? ''}
                onBeginJourney={handleBeginJourney}
                onTryAnotherAccount={handleTryAnotherAccount}
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

            {/* The screen's single consent point, a sibling of the step switch
                rather than a child of one branch of it.

                It was on the chooser alone until this was found: `convert` —
                the primary signup funnel — opens on the email step and can
                complete a signup without ever rendering the chooser, so "every
                user passes through the chooser first" was false and that path
                showed no terms at all.

                Written as an exclusion of `sent` by name, so the default for any
                step added later is consent-shown, and dropping it takes a
                deliberate edit here. `sent` is excluded because the
                account-creating action has already been taken by then, and
                `EmailSentView`'s footnote slot is already contended by the
                resend error, the support escalation and the spam hint. */}
            {step === 'sent' ? null : (
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
            )}
          </View>

          {/* The way back to the welcome screen — the only one, since
              `welcome.tsx:42` replaces rather than pushes, leaving no back
              stack. Whether it belongs on this framing at all is `copy.ts`'s
              call, read as a flag rather than compared against `intent` here so
              that a third intent cannot quietly inherit a default. */}
          {copy.showStartNewLink ? (
            <TouchableOpacity
              testID="start-over-link"
              onPress={handleStartNewPress}
              style={styles.startNewLink}
              accessibilityRole="button"
              accessibilityLabel={`${copy.startNewLead} ${copy.startNewAction}`}
              accessibilityHint="Goes back to the start of onboarding to create a new hero"
            >
              <Text style={styles.startNewText}>
                {copy.startNewLead}{' '}
                <Text style={styles.startNewAccent}>{copy.startNewAction}</Text>
              </Text>
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Mounted unconditionally, visibility driven by state: the sheet owns a
            `@gorhom/bottom-sheet` ref internally, and a modal that only mounts
            once it should already be open has no ref to `present()` on. Closed,
            it renders nothing. */}
        <StartOverSheet
          visible={isConfirmingStartOver}
          heroName={heroName}
          onConfirm={discardHeroAndStartOver}
          onDismiss={() => setIsConfirmingStartOver(false)}
        />
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
  startNewLink: {
    marginTop: spacing[4],
    alignItems: 'center',
  },
  startNewText: {
    fontFamily: fontFamily.regular,
    fontSize: 14.5,
    color: colors.text.muted,
  },
  startNewAccent: {
    fontFamily: fontFamily.semibold,
    color: colors.text.accent,
  },
});
