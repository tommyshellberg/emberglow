import axios from 'axios';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { FlameKindling } from 'lucide-react-native';
import { usePostHog } from 'posthog-react-native';
import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { verifyMagicLinkAndSignIn } from '@/api/auth';
import { ProgressRing } from '@/components/emberglow';
import { signOut } from '@/lib/auth';
import { colors, fontFamily, tints } from '@/theme';

/**
 * Copy contract with the login screen: these strings travel to /login via
 * the `error` URL param and are rendered verbatim by its error banner
 * (Task 19's banner owns no copy of its own) — this file owns the words.
 */
const ERROR_EXPIRED =
  "That link has expired. It's okay — enter your email and we'll send a fresh one.";
const ERROR_EMAIL_IN_USE =
  'This email is already tied to another account. Please sign in with a different email.';
const ERROR_NO_TOKEN = "That link didn't work. Please request a fresh one.";

/**
 * Deliberate pause before the failed-verification redirect so the error
 * state is actually readable (previously `router.replace` fired in the
 * same tick, making the error JSX dead code).
 */
const REDIRECT_DELAY_MS = 2800;

// Indeterminate ember ring — brand rule is "no spinners", so a partial
// ProgressRing arc is rotated continuously by a local wrapper instead of
// adding an indeterminate mode to the shared component.
const RING_SIZE = 96;
const RING_PROGRESS = 0.3;
const SPIN_DURATION_MS = 1200;

// Error-state disc per the auth-screens.jsx mockup's VerifyFrame.
const ERROR_DISC_SIZE = 88;
const ERROR_ICON_SIZE = 34;
const TITLE_FONT_SIZE = 26;
const ERROR_BODY_FONT_SIZE = 15;
// Mockup constrains the error body to `28ch` — approximated in points.
const ERROR_BODY_MAX_WIDTH = 240;

export default function VerifyMagicLinkScreen() {
  const router = useRouter();
  const posthog = usePostHog();
  const params = useLocalSearchParams();
  const token = params.token as string;
  const [error, setError] = useState<string | null>(null);
  const redirectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Continuous rotation for the indeterminate ring (~1200ms per turn).
  const spin = useSharedValue(0);
  useEffect(() => {
    spin.value = withRepeat(
      withTiming(360, { duration: SPIN_DURATION_MS, easing: Easing.linear }),
      -1,
      false
    );
    return () => cancelAnimation(spin);
  }, [spin]);
  const spinStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${spin.value}deg` }],
  }));

  // Clear a pending redirect on unmount only. This lives in its own
  // mount-only effect: the verify effect below re-runs whenever `params`
  // changes identity (useLocalSearchParams may recreate it per render),
  // and clearing the timer in *its* cleanup would cancel the scheduled
  // redirect on every such re-run.
  useEffect(() => {
    return () => {
      if (redirectTimer.current !== null) {
        clearTimeout(redirectTimer.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!token) {
      router.replace({
        pathname: '/login',
        params: { error: ERROR_NO_TOKEN },
      });
      return;
    }

    async function verifyToken() {
      try {
        // Call the comprehensive verification function
        const navigationTarget = await verifyMagicLinkAndSignIn(token);

        // The magic link is the final signup step — this closes the
        // onboarding funnel (magic_link_sent_success → signup_completed).
        // `method` distinguishes this from the social sign-in paths (login
        // screen + quest-completed-signup), which capture the same event
        // with `method: 'google' | 'apple'`.
        posthog.capture('signup_completed', { method: 'magic_link' });

        // Navigate based on the returned target
        if (navigationTarget === 'app') {
          router.replace('/(app)/');
        } else {
          router.replace('/onboarding');
        }
      } catch (verificationError) {
        // Explicitly sign out to clear any stale auth state
        signOut();

        // 409 means the email is already in use by another account — a
        // distinct, actionable failure that must not collapse into the
        // generic expired-link message.
        const errorMessage =
          axios.isAxiosError(verificationError) &&
          verificationError.response?.status === 409
            ? ERROR_EMAIL_IN_USE
            : ERROR_EXPIRED;

        setError(errorMessage);

        // Schedule at most one redirect, even if this effect re-runs while
        // the pause is pending (see the `params` identity note above).
        if (redirectTimer.current === null) {
          redirectTimer.current = setTimeout(() => {
            router.replace({
              pathname: '/login',
              params: { error: errorMessage },
            });
          }, REDIRECT_DELAY_MS);
        }
      }
    }

    verifyToken();
    // `params` stays in the deps despite being unread in the body now:
    // removing it would change when verification re-runs (a behavior change
    // beyond this presentation pass); the ref guard above absorbs the churn.
  }, [token, router, params, posthog]);

  if (error) {
    return (
      <View style={styles.container}>
        <View style={styles.errorDisc}>
          <FlameKindling size={ERROR_ICON_SIZE} color={tints.aegean60} />
        </View>
        <View style={styles.textBlock}>
          <Text style={styles.title}>This link has gone cold</Text>
          <Text style={styles.errorBody}>{error}</Text>
          <Text style={styles.redirectNote}>Redirecting to login…</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Animated.View style={spinStyle}>
        <ProgressRing progress={RING_PROGRESS} size={RING_SIZE} />
      </Animated.View>
      <View style={styles.textBlock}>
        <Text style={styles.title}>Verifying your login</Text>
        <Text style={styles.verifyingBody}>Stoking the fire — one moment.</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // Mockup VerifyFrame: centered column, gap 22, padding 40, app surface.
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 22,
    padding: 40,
    backgroundColor: colors.surface.app,
  },
  textBlock: {
    alignItems: 'center',
  },
  title: {
    fontFamily: fontFamily.display,
    fontSize: TITLE_FONT_SIZE,
    // Repo convention for Erstoria display text: fontSize * 1.15 (see
    // pending-quest.tsx).
    lineHeight: TITLE_FONT_SIZE * 1.15,
    color: colors.text.primary,
    textAlign: 'center',
  },
  verifyingBody: {
    fontFamily: fontFamily.regular,
    fontSize: 14.5,
    color: colors.text.muted,
    textAlign: 'center',
    marginTop: 8,
  },
  errorDisc: {
    width: ERROR_DISC_SIZE,
    height: ERROR_DISC_SIZE,
    borderRadius: ERROR_DISC_SIZE / 2,
    backgroundColor: colors.surface.raised,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorBody: {
    fontFamily: fontFamily.regular,
    fontSize: ERROR_BODY_FONT_SIZE,
    lineHeight: ERROR_BODY_FONT_SIZE * 1.55,
    color: colors.text.secondary,
    textAlign: 'center',
    maxWidth: ERROR_BODY_MAX_WIDTH,
    marginTop: 10,
  },
  redirectNote: {
    fontFamily: fontFamily.regular,
    fontSize: 13.5,
    color: colors.text.muted,
    textAlign: 'center',
    marginTop: 16,
  },
});
