import { router } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/emberglow';
import { FocusAwareStatusBar } from '@/components/ui';
import { useOnboardingStore } from '@/store/onboarding-store';
import { colors, fontFamily, spacing } from '@/theme';

/**
 * Reached when a signed-in account has no hero on the server.
 *
 * With `/auth/social` no longer creating accounts this should be unreachable
 * for anyone who signed up through the app — the remaining producer is the
 * admin `POST /users` endpoint, which takes only an email and a role. It exists
 * as a DESTINATION rather than a correction because the defect it replaces was
 * a silent one: routing to `/` on auth status and bouncing once `serverUser`
 * landed left the user teleported with no explanation.
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
    <View style={styles.container}>
      <FocusAwareStatusBar />
      <Text style={styles.title}>This account doesn't have a hero yet</Text>
      <Text style={styles.body}>
        Let's create one — it only takes a moment.
      </Text>
      <Button
        testID="no-hero-choose-button"
        label="Choose your hero"
        variant="primary"
        size="lg"
        fullWidth
        onPress={handleChooseHero}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing[6],
    backgroundColor: colors.surface.app,
  },
  title: {
    fontFamily: fontFamily.display,
    fontSize: 28,
    lineHeight: 28 * 1.15,
    color: colors.text.primary,
    textAlign: 'center',
  },
  body: {
    fontFamily: fontFamily.regular,
    fontSize: 17,
    lineHeight: 17 * 1.5,
    color: colors.text.secondary,
    textAlign: 'center',
    marginTop: spacing[3],
    marginBottom: spacing[8],
  },
});
