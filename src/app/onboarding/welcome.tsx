import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/emberglow';
import { FocusAwareStatusBar } from '@/components/ui';
import { OnboardingStep, useOnboardingStore } from '@/store/onboarding-store';
import { colors, fontFamily, scrims, spacing } from '@/theme';

// 92×92 logo per the design source's WelcomeScreen (onboarding-screens.jsx:76).
const LOGO_SIZE = 92;

// Container padding matches the design source's WelcomeScreen
// (onboarding-screens.jsx:74) — not on the 4pt spacing scale, kept literal
// per the "pixel-perfect beats scale purity" convention (Phase 2 ground
// rule 2), same precedent as login-form.tsx's CARD_PADDING_* constants.
const CONTENT_PADDING_TOP = 36;
const CONTENT_PADDING_HORIZONTAL = 28;
const CONTENT_PADDING_BOTTOM = 36;

// Gap between the tagline and subtitle, per onboarding-screens.jsx:79.
const SUBTITLE_MARGIN_TOP = 14;

// The design spec caps line length in `ch` units (average glyph advance),
// which has no RN equivalent — these are eyeballed pixel widths that
// reproduce the mockup's poster-style line breaks.
const TAGLINE_MAX_WIDTH = 264; // ~11ch @ Erstoria 40
const SUBTITLE_MAX_WIDTH = 248; // ~26ch @ Source Sans 3 17

export default function WelcomeScreen() {
  const router = useRouter();
  const { setCurrentStep } = useOnboardingStore();

  const handleGetStarted = () => {
    // Update the onboarding step to SELECTING_CHARACTER which will trigger navigation
    setCurrentStep(OnboardingStep.SELECTING_CHARACTER);
  };

  const handleLogin = () => {
    // Navigate to the login screen
    router.replace('/login');
  };

  return (
    <View style={styles.flex}>
      <FocusAwareStatusBar />

      {/* Full-bleed background art — decorative, intentionally excluded
          from the accessibility tree (unlike login-form.tsx's labeled
          equivalent). */}
      <Image
        accessible={false}
        source={require('@/../assets/images/background/onboarding-bg.jpg')}
        style={styles.backgroundImage}
        resizeMode="cover"
      />

      {/* Scrims over the background art — same pattern as login-form.tsx */}
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

      <View style={styles.content}>
        <View style={styles.spacerLogo} />

        <Image
          source={require('@/../assets/images/icon.png')}
          style={styles.logo}
          resizeMode="contain"
          accessibilityLabel="emberglow app logo"
        />

        <View style={styles.spacerTagline} />

        {/* The logo is the brand mark — no eyebrow, no "emberglow" text
            title. The tagline is the headline. */}
        <Text style={styles.tagline}>Level up by logging off</Text>
        <Text style={styles.subtitle}>
          Turn phone breaks into epic adventures.
        </Text>

        <View style={styles.spacerCta} />

        <Button
          testID="get-started-button"
          label="Begin new journey"
          variant="primary"
          size="lg"
          fullWidth
          onPress={handleGetStarted}
        />
        <Button
          label="Have an account? Log in"
          variant="ghost"
          fullWidth
          onPress={handleLogin}
          accessibilityLabel="Log in to existing account"
          containerStyle={styles.loginButtonContainer}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  backgroundImage: {
    ...StyleSheet.absoluteFillObject,
    // Explicit 100%/100% is required on the New Architecture (Fabric): an
    // absolutely-positioned <Image> whose size comes only from the
    // absoluteFill insets falls back to the require()'d asset's intrinsic
    // pixel size (1632×2912) anchored top-left, ignoring resizeMode. Giving
    // it a definite frame makes resizeMode="cover" apply. Do not remove.
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
    height: '62%',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    paddingTop: CONTENT_PADDING_TOP,
    paddingHorizontal: CONTENT_PADDING_HORIZONTAL,
    paddingBottom: CONTENT_PADDING_BOTTOM,
  },
  spacerLogo: {
    flex: 1.2,
  },
  spacerTagline: {
    flex: 1,
  },
  spacerCta: {
    flex: 1,
  },
  logo: {
    width: LOGO_SIZE,
    height: LOGO_SIZE,
  },
  tagline: {
    fontFamily: fontFamily.display,
    fontSize: 40,
    // Repo convention for Erstoria display text: fontSize * 1.15, not the
    // documented leading.display (1.12) — see pending-quest.tsx.
    lineHeight: 40 * 1.15,
    color: colors.text.primary,
    textAlign: 'center',
    maxWidth: TAGLINE_MAX_WIDTH,
  },
  subtitle: {
    fontFamily: fontFamily.regular,
    fontSize: 17,
    lineHeight: 17 * 1.5,
    color: colors.text.secondary,
    textAlign: 'center',
    maxWidth: SUBTITLE_MAX_WIDTH,
    marginTop: SUBTITLE_MARGIN_TOP,
  },
  loginButtonContainer: {
    marginTop: spacing[2], // 8px gap between CTAs
  },
});
