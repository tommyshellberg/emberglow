import { LinearGradient } from 'expo-linear-gradient';
import * as Notifications from 'expo-notifications';
import { Lock, Map, Scroll } from 'lucide-react-native';
import { usePostHog } from 'posthog-react-native';
import React, { useEffect, useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

import { Button, EyebrowLabel } from '@/components/emberglow';
import { EmberProgress } from '@/components/onboarding/ember-progress';
import { FocusAwareStatusBar } from '@/components/ui';
import {
  requestNotificationPermissions,
  setupNotifications,
} from '@/lib/services/notifications';
import { useCharacterStore } from '@/store/character-store';
import { OnboardingStep, useOnboardingStore } from '@/store/onboarding-store';
import {
  colors,
  easing,
  fontFamily,
  palette,
  radii,
  shadows,
  spacing,
  withAlpha,
} from '@/theme';

// Local steps just for this screen's flow — maps onto progress steps 3 (Intro)
// and 4 (Notifications) of the 5-step onboarding funnel (see ember-progress.tsx).
enum IntroStep {
  WELCOME = 'welcome',
  NOTIFICATIONS = 'notifications',
}

// --- Entrance animation ---------------------------------------------------
// Converged onto the phase's established fade+rise convention — same
// stagger/duration/rise/easing as the Journal entrance spec
// (`journal-components.tsx`'s `riseIn`, ported from
// `prototypes/journal-entrance/journal-entrance.jsx`) — rather than
// reproducing this screen's original `FadeIn`/`FadeInDown` chain, whose
// delays ran out to 2800ms. Literal (not durations.{fast,base,slow}) per
// that same precedent.
const ENTRANCE_STAGGER_MS = 70;
const ENTRANCE_DURATION_MS = 420;
const ENTRANCE_RISE_PX = 14;
const EMBER_ENTRANCE_EASE = Easing.bezier(...easing.emberOut);
// Fixed CTA entrance slot shared by both steps: one past the longest step's
// content indices (intro ends at 5; notifications at 3), so the CTA always
// enters last — at the cost of a small extra beat on the notifications step.
const CTA_ENTRANCE_INDEX = 6;

function enterValue(value: number) {
  'worklet';
  return withTiming(value, {
    duration: ENTRANCE_DURATION_MS,
    easing: EMBER_ENTRANCE_EASE,
  });
}

/** Custom Reanimated entering builder — fade + rise, staggered top-down. */
function riseIn(index: number) {
  return () => {
    'worklet';
    const delay = index * ENTRANCE_STAGGER_MS;
    return {
      initialValues: {
        opacity: 0,
        transform: [{ translateY: ENTRANCE_RISE_PX }],
      },
      animations: {
        opacity: withDelay(delay, enterValue(1)),
        transform: [{ translateY: withDelay(delay, enterValue(0)) }],
      },
    };
  };
}

// --- Intro step's feature rows ---------------------------------------------

type FeatureRowConfig = {
  Icon: typeof Lock;
  title: string;
  body: string;
};

const FEATURE_ROWS: FeatureRowConfig[] = [
  {
    Icon: Lock,
    title: 'Lock your phone',
    body: 'A quest begins the moment you step away.',
  },
  {
    Icon: Map,
    title: 'Your hero adventures',
    body: 'While you live your life, the story unfolds without you watching.',
  },
  {
    Icon: Scroll,
    title: 'Return for the tale',
    body: 'Come back to XP, loot, and the next chapter — earned, not scrolled.',
  },
];

// Static mock values — the lock-screen Live Activity card is illustrative,
// not wired to real quest state (unlike xp-bar.tsx's identical gradient).
const MOCK_QUEST_TITLE = 'Collecting firewood';
const MOCK_ELAPSED_TIME = '12:34';
const MOCK_PROGRESS_FILL = '68%';
const MOCK_XP_ON_RETURN = 72;

const TITLE_FONT_SIZE = 32;
// The design spec caps caption line length in `ch` units (average glyph
// advance), which has no RN equivalent — eyeballed against welcome.tsx's
// same conversion (~9.5px/ch @ Source Sans 3 17 there; ~8px/ch here at 14.5).
const CAPTION_MAX_WIDTH = 240; // ~30ch @ Source Sans 3 14.5

export default function AppIntroductionScreen() {
  // Use local state for UI steps within this screen
  const [introStep, setIntroStep] = useState<IntroStep>(IntroStep.WELCOME);

  // Use global state for tracking overall onboarding progress
  const setCurrentStep = useOnboardingStore((state) => state.setCurrentStep);

  const [permissionsGranted, setPermissionsGranted] = useState(false);
  const posthog = usePostHog();

  const heroName =
    useCharacterStore((state) => state.character?.name) ?? 'Your hero';

  useEffect(() => {
    posthog.capture('onboarding_open_app_introduction_screen');
  }, [posthog]);

  // Check if permissions are already granted
  useEffect(() => {
    const checkPermissions = async () => {
      const { status } = await Notifications.getPermissionsAsync();
      setPermissionsGranted(status === 'granted');
    };

    checkPermissions();
  }, []);

  // Request notification permissions
  const requestPermissions = async () => {
    try {
      setupNotifications();
      const granted = await requestNotificationPermissions();
      setPermissionsGranted(granted);
      if (granted) {
        posthog.capture('onboarding_request_notification_permissions_success');
      } else {
        posthog.capture('onboarding_request_notification_permissions_denied');
      }
    } catch (error) {
      posthog.capture('onboarding_request_notification_permissions_error');
      console.error('Error requesting permissions:', error);
      setPermissionsGranted(false);
    }

    setCurrentStep(OnboardingStep.STARTING_FIRST_QUEST);
    posthog.capture('onboarding_request_notification_permissions_completed');
  };

  // Handle button press based on current step
  const handleButtonPress = () => {
    switch (introStep) {
      case IntroStep.WELCOME:
        setIntroStep(IntroStep.NOTIFICATIONS);
        setCurrentStep(OnboardingStep.REQUESTING_NOTIFICATIONS);
        break;
      case IntroStep.NOTIFICATIONS:
        requestPermissions();
        break;
    }
  };

  // Skip notifications and continue
  const handleSkipNotifications = () => {
    setCurrentStep(OnboardingStep.STARTING_FIRST_QUEST);
  };

  // Render content based on current step
  const renderContent = () => {
    switch (introStep) {
      case IntroStep.WELCOME:
        return (
          <View key="intro" style={styles.stepContent}>
            <Animated.View entering={riseIn(0)}>
              <EyebrowLabel>How it works</EyebrowLabel>
            </Animated.View>
            <Animated.View entering={riseIn(1)}>
              <Text style={styles.title}>Quests reward stepping away</Text>
            </Animated.View>
            <Animated.View entering={riseIn(2)}>
              <Text style={styles.body}>
                Not timers. Not blockers. An adventure that only moves when you
                do.
              </Text>
            </Animated.View>
            <View style={styles.rowsContainer}>
              {FEATURE_ROWS.map((row, i) => (
                <Animated.View
                  key={row.title}
                  entering={riseIn(3 + i)}
                  style={styles.featureRow}
                >
                  <View style={styles.featureIconTile}>
                    <row.Icon size={19} color={palette.sandy} />
                  </View>
                  <View style={styles.featureText}>
                    <Text style={styles.featureTitle}>{row.title}</Text>
                    <Text style={styles.featureBody}>{row.body}</Text>
                  </View>
                </Animated.View>
              ))}
            </View>
          </View>
        );

      case IntroStep.NOTIFICATIONS:
        return (
          <View key="notifications" style={styles.stepContent}>
            <Animated.View entering={riseIn(0)}>
              <EyebrowLabel>One thing first</EyebrowLabel>
            </Animated.View>
            <Animated.View entering={riseIn(1)}>
              <Text style={styles.title}>
                Watch the quest without waking your phone
              </Text>
            </Animated.View>

            <View style={styles.mockSection}>
              <Animated.View entering={riseIn(2)} style={styles.mockCard}>
                <View style={styles.mockCardRow}>
                  <Image
                    source={require('@/../assets/images/icon.png')}
                    style={styles.mockCardLogo}
                    resizeMode="contain"
                  />
                  <View style={styles.mockCardText}>
                    <Text style={styles.mockCardTitle}>{MOCK_QUEST_TITLE}</Text>
                    <Text style={styles.mockCardSubtitle}>
                      {heroName} is on a quest · {MOCK_XP_ON_RETURN} XP on
                      return
                    </Text>
                  </View>
                  <Text style={styles.mockCardTime}>{MOCK_ELAPSED_TIME}</Text>
                </View>
                <View style={styles.mockCardTrack}>
                  <LinearGradient
                    colors={[palette.cinnabar, palette.sandy]}
                    start={{ x: 0, y: 0.5 }}
                    end={{ x: 1, y: 0.5 }}
                    style={styles.mockCardFill}
                  />
                </View>
              </Animated.View>
              <Animated.Text entering={riseIn(3)} style={styles.caption}>
                Progress lives on your lock screen. Checking on your hero never
                means unlocking your phone.
              </Animated.Text>
            </View>
          </View>
        );

      default:
        return null;
    }
  };

  return (
    <View style={styles.screen}>
      <FocusAwareStatusBar />

      <View style={styles.progressRow}>
        <EmberProgress current={introStep === IntroStep.WELCOME ? 3 : 4} />
      </View>

      <View style={styles.stepArea}>{renderContent()}</View>

      <Animated.View
        key={`cta-${introStep}`}
        entering={riseIn(CTA_ENTRANCE_INDEX)}
        style={styles.ctaArea}
      >
        {introStep === IntroStep.NOTIFICATIONS ? (
          <>
            <Button
              variant="primary"
              size="lg"
              fullWidth
              label="Allow notifications"
              onPress={handleButtonPress}
              accessibilityLabel="Allow notifications"
            />
            <Button
              variant="ghost"
              fullWidth
              label="Not now"
              onPress={handleSkipNotifications}
              accessibilityLabel="Skip enabling notifications"
              containerStyle={styles.notNowButton}
            />
          </>
        ) : (
          <Button
            variant="primary"
            size="lg"
            fullWidth
            label="Continue"
            onPress={handleButtonPress}
            accessibilityLabel="Continue"
          />
        )}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.surface.app,
    paddingHorizontal: spacing[6], // 24 — OStep chrome's '54px 24px 36px'
    paddingTop: 54,
    paddingBottom: 36,
  },
  progressRow: {
    marginBottom: spacing[3],
  },
  stepArea: {
    flex: 1,
    marginTop: spacing[4],
  },
  stepContent: {
    flex: 1,
  },
  title: {
    fontFamily: fontFamily.display,
    fontSize: TITLE_FONT_SIZE,
    // Repo convention for Erstoria display text: fontSize * 1.15, not the
    // documented --leading-display (1.12) — see e.g. pending-quest.tsx.
    lineHeight: TITLE_FONT_SIZE * 1.15,
    color: colors.text.primary,
    marginTop: 10,
  },
  body: {
    fontFamily: fontFamily.regular,
    fontSize: 16,
    lineHeight: 16 * 1.5,
    color: colors.text.muted,
    marginTop: 10,
  },
  rowsContainer: {
    gap: 12,
    marginTop: 30,
  },
  featureRow: {
    flexDirection: 'row',
    gap: 16,
    alignItems: 'flex-start',
    backgroundColor: colors.surface.raised,
    borderWidth: 1,
    borderColor: colors.border.hairline,
    borderRadius: radii.lg,
    paddingVertical: 16,
    paddingHorizontal: 18,
  },
  featureIconTile: {
    width: 42,
    height: 42,
    borderRadius: 21,
    flexShrink: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: withAlpha(palette.cinnabar, 0.14),
    borderWidth: 1,
    borderColor: withAlpha(palette.cinnabar, 0.4),
  },
  featureText: {
    flex: 1,
  },
  featureTitle: {
    fontFamily: fontFamily.semibold,
    fontSize: 16,
    color: colors.text.primary,
  },
  featureBody: {
    fontFamily: fontFamily.regular,
    fontSize: 14.5,
    lineHeight: 14.5 * 1.5,
    color: colors.text.secondary,
    marginTop: 3,
  },
  mockSection: {
    flex: 1,
    justifyContent: 'center',
  },
  mockCard: {
    // Literal — between radii.lg (16) and radii.xl (24), matching the
    // prototype's lock-screen Live Activity mock exactly.
    borderRadius: 20,
    // Prototype: rgba(22,32,52,0.85) — palette.midnight (#162034) decodes to
    // exactly (22,32,52), so this is the same color via theme tokens.
    backgroundColor: withAlpha(palette.midnight, 0.85),
    borderWidth: 1,
    borderColor: colors.border.hairline,
    padding: 16,
    ...shadows.card,
  },
  mockCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
  },
  mockCardLogo: {
    width: 34,
    height: 34,
  },
  mockCardText: {
    flex: 1,
  },
  mockCardTitle: {
    fontFamily: fontFamily.semibold,
    fontSize: 14.5,
    color: colors.text.primary,
  },
  mockCardSubtitle: {
    fontFamily: fontFamily.regular,
    fontSize: 12.5,
    color: colors.text.muted,
    marginTop: 1,
  },
  mockCardTime: {
    fontFamily: fontFamily.bold,
    fontSize: 15,
    color: palette.sandy,
    fontVariant: ['tabular-nums'],
  },
  mockCardTrack: {
    height: 5,
    borderRadius: radii.pill,
    backgroundColor: colors.track,
    marginTop: 12,
    overflow: 'hidden',
  },
  mockCardFill: {
    height: '100%',
    width: MOCK_PROGRESS_FILL,
    borderRadius: radii.pill,
  },
  caption: {
    fontFamily: fontFamily.regular,
    fontSize: 14.5,
    lineHeight: 14.5 * 1.5,
    color: colors.text.secondary,
    textAlign: 'center',
    marginTop: 18,
    alignSelf: 'center',
    maxWidth: CAPTION_MAX_WIDTH,
  },
  ctaArea: {
    marginTop: spacing[4],
  },
  notNowButton: {
    marginTop: 6,
  },
});
