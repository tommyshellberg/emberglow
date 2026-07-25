import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { usePostHog } from 'posthog-react-native';
import React, { useEffect } from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';

import type { SocialProvider } from '@/components/login';
import { useAuth } from '@/lib/auth';
import {
  SOCIAL_SIGNIN_OUTCOMES,
  type SocialSignInOutcome,
} from '@/lib/auth/social';
import { removeItem } from '@/lib/storage';
import { useOnboardingStore } from '@/store/onboarding-store';
import { colors, fontFamily, radii, scrims, shadows, spacing } from '@/theme';

import {
  BRAND_NAME,
  EMAIL_IN_USE_ERROR_MESSAGE,
  GENERIC_SEND_ERROR_MESSAGE,
  LOGO_SIZE,
} from './login/constants';
import { EmailInputView } from './login/email-input-view';
import { EmailSentView } from './login/email-sent-view';
import { useMagicLink } from './login/hooks/use-magic-link';
import { SocialDivider } from './login/social-divider';
import { SocialSignInButtons } from './login/social-sign-in-buttons';
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
export const LoginForm = ({ onSubmit, initialError }: LoginFormProps) => {
  const posthog = usePostHog();
  const resetOnboarding = useOnboardingStore((state) => state.resetOnboarding);
  const signOut = useAuth((state) => state.signOut);

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

  const handleEmailSubmit = async (email: string) => {
    await sendMagicLink(email, (submittedEmail) => {
      onSubmit?.({ email: submittedEmail });
    });
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
          {/* Form card */}
          <View style={styles.card}>
            {emailSent ? (
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
                <SocialSignInButtons
                  onSuccess={handleSocialSignInSuccess}
                  onError={(kind) => setError(mapError(kind))}
                />
                <SocialDivider />
                <EmailInputView
                  onSubmit={handleEmailSubmit}
                  isLoading={isLoading}
                  error={error}
                />
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
