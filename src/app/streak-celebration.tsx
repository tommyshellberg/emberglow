import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useRouter } from 'expo-router';
import { Share as ShareIcon } from 'lucide-react-native';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Image,
  Share as RNShare,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, {
  Easing,
  interpolate,
  runOnJS,
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { Button, EyebrowLabel } from '@/components/emberglow';
import { ScreenContainer } from '@/components/ui';
import { useCharacterStore } from '@/store/character-store';
import { useQuestStore } from '@/store/quest-store';
import {
  colors,
  fontFamily,
  palette,
  radii,
  shadows,
  spacing,
  withAlpha,
} from '@/theme';

import { AnimatedStreakDay } from './AnimatedStreakDay';
import {
  EMBER_ANIMATION,
  EMBER_PARTICLES,
  LAYOUT,
} from './streak-celebration.constants';
import { generateStreakVisualization } from './streak-visualization.util';
import { useStreakAnimation } from './use-streak-animation';

type EmberParticleConfig = (typeof EMBER_PARTICLES)[number];

/** A single deterministic ember particle — replaces the old Lottie confetti. */
function EmberParticle({
  config,
  index,
}: {
  config: EmberParticleConfig;
  index: number;
}) {
  const [angleDeg, distance, size, delay, drift] = config;
  const rad = (angleDeg * Math.PI) / 180;
  const x = Math.cos(rad) * distance;
  const y = Math.sin(rad) * distance;
  const color = index % 3 === 0 ? palette.cinnabar : palette.sandy;

  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withDelay(
      delay,
      withRepeat(
        withTiming(1, {
          duration: EMBER_ANIMATION.DURATION,
          easing: Easing.out(Easing.ease),
        }),
        -1,
        false
      )
    );
  }, [delay, progress]);

  const style = useAnimatedStyle(() => {
    const opacity = interpolate(
      progress.value,
      [0, 0.15, 0.8, 1],
      [0, 0.9, 0.4, 0]
    );
    const translateY = interpolate(progress.value, [0, 1], [0, drift]);

    return { opacity, transform: [{ translateY }] };
  });

  return (
    <Animated.View
      style={[
        styles.emberParticle,
        style,
        {
          width: size,
          height: size,
          marginLeft: x - size / 2,
          marginTop: y - size / 2,
          backgroundColor: color,
        },
      ]}
    />
  );
}

export default function StreakCelebrationScreen() {
  const router = useRouter();
  const dailyQuestStreak = useCharacterStore((state) => state.dailyQuestStreak);
  const markStreakCelebrationShown = useCharacterStore(
    (state) => state.markStreakCelebrationShown
  );
  const setShouldShowStreakCelebration = useQuestStore(
    (state) => state.setShouldShowStreakCelebration
  );

  // Generate the 7-day (full week) streak visualization.
  //
  // Memoized on the streak value: this array is a dependency of
  // `playAnimations`, which in turn is the `useFocusEffect` callback dep.
  // Recreating it every render gave the focus callback a new identity each
  // render, and useFocusEffect re-runs its effect on identity change — which
  // re-fired the count-up animation in an unbounded loop (the "never loads,
  // counts 1 -> 2 -> 1" bug). A stable reference breaks that loop.
  const streakDays = useMemo(
    () => generateStreakVisualization(dailyQuestStreak),
    [dailyQuestStreak]
  );

  const {
    discOpacity,
    discScale,
    count,
    titleOpacity,
    titleTranslateY,
    weekRowOpacity,
    weekRowTranslateY,
    dayLitProgress,
    dayScale,
    buttonsOpacity,
    buttonsTranslateY,
    playAnimations,
  } = useStreakAnimation(streakDays, dailyQuestStreak);

  // The count-up number is driven off the UI thread; bridge it back to a
  // React string via useAnimatedReaction so <Text> can render it.
  const [displayCount, setDisplayCount] = useState(1);
  useAnimatedReaction(
    () => Math.round(count.value),
    (result, previous) => {
      if (result !== previous) {
        runOnJS(setDisplayCount)(result);
      }
    },
    [count]
  );

  const discContainerStyle = useAnimatedStyle(() => ({
    opacity: discOpacity.value,
    transform: [{ scale: discScale.value }],
  }));

  const discGlowStyle = useAnimatedStyle(() => ({
    shadowOpacity: shadows.glowEmber.shadowOpacity * discOpacity.value,
  }));

  const titleStyle = useAnimatedStyle(() => ({
    opacity: titleOpacity.value,
    transform: [{ translateY: titleTranslateY.value }],
  }));

  const weekRowStyle = useAnimatedStyle(() => ({
    opacity: weekRowOpacity.value,
    transform: [{ translateY: weekRowTranslateY.value }],
  }));

  const buttonsStyle = useAnimatedStyle(() => ({
    opacity: buttonsOpacity.value,
    transform: [{ translateY: buttonsTranslateY.value }],
  }));

  // Play the choreography every time the screen comes into focus.
  useFocusEffect(
    useCallback(() => {
      // Mark that the streak celebration was shown when accessing this screen.
      markStreakCelebrationShown();
      playAnimations();
    }, [playAnimations, markStreakCelebrationShown])
  );

  const handleShare = async () => {
    try {
      const shareMessage = `I'm on a ${dailyQuestStreak} day quest streak in emberglow! 🔥 Join me on this epic adventure!\n\nhttps://emberglowapp.com`;

      await RNShare.share({
        message: shareMessage,
        title: 'My emberglow Streak',
      });
    } catch (error) {
      Alert.alert('Error', 'Failed to share streak');
    }
  };

  const handleContinue = () => {
    // Clear the flag when user clicks continue.
    setShouldShowStreakCelebration(false);
    // Navigate back to the main app screen.
    router.back();
  };

  return (
    <View testID="streak-celebration-screen" style={styles.root}>
      {/* Background */}
      <View style={StyleSheet.absoluteFill}>
        <Image
          source={require('@/../assets/images/background/pending-quest-bg-alt.jpg')}
          style={styles.backgroundImage}
          resizeMode="cover"
        />
        <View style={styles.backgroundScrim} />
      </View>

      <ScreenContainer fullScreen transparent style={styles.container}>
        <EyebrowLabel>Quest streak</EyebrowLabel>

        {/* Counter */}
        <View style={styles.counterSection}>
          <View style={styles.counterOuter}>
            {EMBER_PARTICLES.map((config, index) => (
              <EmberParticle key={index} config={config} index={index} />
            ))}
            <Animated.View
              style={[styles.counterDisc, discContainerStyle, discGlowStyle]}
            >
              <LinearGradient
                colors={[
                  withAlpha(palette.cinnabar, 0.28),
                  colors.surface.raised,
                ]}
                start={{ x: 0.5, y: 0.2 }}
                end={{ x: 0.5, y: 1 }}
                style={StyleSheet.absoluteFill}
              />
              {/* `displayCount` ticks up from 0 through an animated
                  reaction, so this reads mid-count until the animation
                  settles. Presence is safe to assert; the number is not. */}
              <Text testID="streak-count" style={styles.counterNumber}>
                {displayCount}
              </Text>
            </Animated.View>
          </View>

          <Animated.View style={[styles.titleBlock, titleStyle]}>
            <Text style={styles.titleText}>day streak</Text>
            <Text style={styles.subtitleText}>You kept the fire burning.</Text>
          </Animated.View>
        </View>

        <View style={styles.footer}>
          {/* 7-Day Streak Visualization */}
          <Animated.View style={[styles.weekRow, weekRowStyle]}>
            <View style={styles.weekRowDays}>
              {streakDays.map((day, index) => (
                <AnimatedStreakDay
                  key={index}
                  day={day}
                  litProgress={dayLitProgress[index]}
                  scale={dayScale[index]}
                />
              ))}
            </View>

            <Text style={styles.reminderText}>
              Complete a quest each day to keep the fire burning.
            </Text>
          </Animated.View>

          {/* Buttons */}
          <Animated.View style={[styles.buttonsRow, buttonsStyle]}>
            {/*
              The Emberglow Button doesn't expose accessibilityLabel/Hint
              props, so a wrapping `accessible` View supplies the
              descriptive label/hint. RN/VoiceOver & TalkBack collapse an
              `accessible` subtree into a single element using the
              wrapper's label/hint/role instead of drilling into the
              child Pressable's own defaults — this doesn't affect touch
              handling or the inner testID used elsewhere.
            */}
            <View
              accessible
              accessibilityRole="button"
              accessibilityLabel={`Share your ${dailyQuestStreak} day streak`}
              accessibilityHint="Opens sharing options to share your streak progress"
            >
              <Button
                variant="outline"
                fullWidth
                onPress={handleShare}
                testID="streak-share-button"
              >
                <ShareIcon size={16} color={colors.text.primary} />
                <Text style={styles.shareLabel}>Share</Text>
              </Button>
            </View>

            <View
              accessible
              accessibilityRole="button"
              accessibilityLabel="Continue to home screen"
              accessibilityHint="Returns to the main app"
            >
              <Button
                variant="primary"
                size="lg"
                fullWidth
                label="Continue"
                onPress={handleContinue}
                testID="streak-continue-button"
              />
            </View>
          </Animated.View>
        </View>
      </ScreenContainer>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  backgroundImage: {
    width: '100%',
    height: '100%',
  },
  backgroundScrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.scrim,
  },
  container: {
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 58,
  },
  counterSection: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  counterOuter: {
    width: LAYOUT.COUNTER_CONTAINER_SIZE,
    height: LAYOUT.COUNTER_CONTAINER_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emberParticle: {
    position: 'absolute',
    left: '50%',
    top: '50%',
    borderRadius: radii.pill,
  },
  counterDisc: {
    width: LAYOUT.COUNTER_DISC_SIZE,
    height: LAYOUT.COUNTER_DISC_SIZE,
    borderRadius: LAYOUT.COUNTER_DISC_SIZE / 2,
    borderWidth: 2,
    borderColor: colors.accent.primary,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    shadowColor: shadows.glowEmber.shadowColor,
    shadowOffset: shadows.glowEmber.shadowOffset,
    shadowRadius: shadows.glowEmber.shadowRadius,
    elevation: 0,
  },
  counterNumber: {
    fontFamily: fontFamily.display,
    fontSize: 84,
    lineHeight: 84,
    color: colors.text.primary,
  },
  titleBlock: {
    alignItems: 'center',
    marginTop: spacing[5],
  },
  titleText: {
    fontFamily: fontFamily.display,
    fontSize: 36,
    color: colors.text.primary,
  },
  subtitleText: {
    fontSize: 15,
    lineHeight: 15 * 1.5,
    color: colors.text.muted,
    marginTop: spacing[2],
  },
  footer: {
    width: '100%',
  },
  weekRow: {
    width: '100%',
    backgroundColor: colors.surface.raised,
    borderWidth: 1,
    borderColor: colors.border.hairline,
    borderRadius: radii.lg,
    paddingTop: LAYOUT.WEEK_ROW_PADDING_TOP,
    paddingHorizontal: LAYOUT.WEEK_ROW_PADDING_HORIZONTAL,
    paddingBottom: LAYOUT.WEEK_ROW_PADDING_BOTTOM,
    ...shadows.card,
  },
  weekRowDays: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  reminderText: {
    marginTop: spacing[3],
    fontSize: 13.5,
    lineHeight: 13.5 * 1.5,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  buttonsRow: {
    width: '100%',
    gap: spacing[2],
    marginTop: spacing[5],
  },
  shareLabel: {
    fontFamily: fontFamily.semibold,
    fontSize: 16,
    color: colors.text.primary,
  },
});
