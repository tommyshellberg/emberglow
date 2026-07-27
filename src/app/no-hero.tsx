import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';

import { Button, EyebrowLabel } from '@/components/emberglow';
import { FocusAwareStatusBar } from '@/components/ui';
import { useOnboardingStore } from '@/store/onboarding-store';
import { colors, fontFamily, scrims, spacing } from '@/theme';

// Same welcome.tsx-derived literals: pixel-perfect beats scale purity.
const CONTENT_PADDING_HORIZONTAL = 28;
const CONTENT_PADDING_BOTTOM = 36;
const TITLE_MAX_WIDTH = 300; // keeps the Erstoria title to two poster lines
const BODY_MAX_WIDTH = 264;

/**
 * Reached when a signed-in account has no hero on the server.
 *
 * With `/auth/social` no longer creating accounts this should be unreachable
 * for anyone who signed up through the app — the remaining producer is the
 * admin `POST /users` endpoint, which takes only an email and a role. It exists
 * as a DESTINATION rather than a correction because the defect it replaces was
 * a silent one: routing to `/` on auth status and bouncing once `serverUser`
 * landed left the user teleported with no explanation.
 *
 * Visually it borrows welcome.tsx wholesale (same background art, scrims, and
 * header stack) because its button drops the user into that exact flow — the
 * two screens should read as one journey, not a detour.
 */
export default function NoHeroScreen() {
  const resetOnboarding = useOnboardingStore((state) => state.resetOnboarding);

  const handleChooseHero = () => {
    // resetOnboarding, not setCurrentStep: the latter is forward-only and
    // silently discards a backward move (f90a968).
    resetOnboarding();
    router.replace('/onboarding/welcome');
  };

  return (
    <View style={styles.flex}>
      <FocusAwareStatusBar />

      {/* Full-bleed background art — decorative, excluded from the
          accessibility tree, same as welcome.tsx. */}
      <Image
        source={require('@/../assets/images/background/onboarding-bg.jpg')}
        style={styles.backgroundImage}
        resizeMode="cover"
      />
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
        {/* Bias the text below the art's sun/castle focal point (~50% down),
            mirroring welcome.tsx's spacer ratios. */}
        <View style={styles.spacerTop} />

        <EyebrowLabel>New journey awaits</EyebrowLabel>
        <Text style={styles.title}>This account doesn't have a hero yet</Text>
        <Text style={styles.body}>
          Let's create one — it only takes a moment.
        </Text>

        <View style={styles.spacerCta} />

        <Button
          testID="no-hero-choose-button"
          label="Choose your hero"
          variant="primary"
          size="lg"
          fullWidth
          onPress={handleChooseHero}
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
    // Fabric: an absolutely-positioned <Image> sized only by absoluteFill
    // insets renders at the asset's intrinsic pixel size — the definite
    // frame is what makes resizeMode="cover" apply. Do not remove.
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
    height: '58%',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: CONTENT_PADDING_HORIZONTAL,
    paddingBottom: CONTENT_PADDING_BOTTOM,
  },
  spacerTop: {
    flex: 5,
  },
  spacerCta: {
    flex: 2,
  },
  title: {
    fontFamily: fontFamily.display,
    fontSize: 32,
    // Repo convention for Erstoria: fontSize * 1.15, not leading.display.
    lineHeight: 32 * 1.15,
    color: colors.text.primary,
    textAlign: 'center',
    maxWidth: TITLE_MAX_WIDTH,
    marginTop: spacing[3],
  },
  body: {
    fontFamily: fontFamily.regular,
    fontSize: 17,
    lineHeight: 17 * 1.5,
    color: colors.text.secondary,
    textAlign: 'center',
    maxWidth: BODY_MAX_WIDTH,
    marginTop: spacing[3],
  },
});
