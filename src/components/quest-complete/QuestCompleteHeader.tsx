import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft } from 'lucide-react-native';
import React, { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { EyebrowLabel } from '@/components/emberglow';
import { Image } from '@/components/ui';
import { getQuestModeLabel } from '@/lib/utils/quest-utils';
import {
  colors,
  easing,
  fontFamily,
  palette,
  radii,
  scrims,
  spacing,
  withAlpha,
} from '@/theme';

import { ANIMATION_TIMING } from './constants';
import type { QuestCompleteHeaderProps } from './types';
import { getQuestImage } from './utils';

const EMBER_OUT = Easing.bezier(...easing.emberOut);
/** Rise distance for the fade+translateY entrance, matching FailedQuest's convergence. */
const RISE_DISTANCE = 16;

/** Mockup spec: quest-flow.jsx:121 art header height. */
const ART_HEADER_HEIGHT = 300;
const BACK_BUTTON_SIZE = 44;

/**
 * Art header for the Quest Complete / Quest Details screen
 * (quest-flow.jsx:119-132): quest artwork as cover, a scrim over the top 40%
 * for the floating back disc's legibility, and a bottom 75% gradient
 * dissolving into `richBlack` so the art fades into the flat canvas below.
 * Replaces both the old full-screen forest BackgroundImage and the circular
 * quest-image medallion.
 */
export function QuestCompleteHeader({
  quest,
  fromJournal = false,
  onBack,
  disableAnimations = false,
}: QuestCompleteHeaderProps) {
  const insets = useSafeAreaInsets();
  const textOpacity = useSharedValue(0);

  const textStyle = useAnimatedStyle(() => ({
    opacity: textOpacity.value,
    transform: [{ translateY: RISE_DISTANCE * (1 - textOpacity.value) }],
  }));

  useEffect(() => {
    if (!disableAnimations) {
      textOpacity.value = withDelay(
        ANIMATION_TIMING.HEADER_DELAY,
        withTiming(1, {
          duration: ANIMATION_TIMING.HEADER_DURATION,
          easing: EMBER_OUT,
        })
      );
    } else {
      textOpacity.value = 1;
    }
  }, [textOpacity, disableAnimations]);

  const modeLabel = getQuestModeLabel(quest.mode).toUpperCase();
  // Mockup: `{quest.kind}{fromJournal ? '' : ' · complete'}` (quest-flow.jsx:129).
  const eyebrowText = fromJournal ? modeLabel : `${modeLabel} · COMPLETE`;

  return (
    <View
      style={styles.container}
      testID="quest-complete-header"
      accessibilityLabel="Quest artwork"
    >
      <Image
        source={getQuestImage(quest)}
        style={StyleSheet.absoluteFillObject}
        contentFit="cover"
        testID="quest-art-image"
      />

      {/* Scrim over the top 40% — legibility for the floating back disc. */}
      <LinearGradient
        colors={scrims.top.colors}
        start={scrims.top.start}
        end={scrims.top.end}
        style={styles.scrimTop}
      />

      {/* Bottom 75% gradient dissolving the art into the flat canvas
          (quest-flow.jsx:124: 4% / 55% / 100% stops, richBlack -> transparent). */}
      <LinearGradient
        colors={[
          palette.richBlack,
          withAlpha(palette.richBlack, 0.55),
          withAlpha(palette.richBlack, 0),
        ]}
        locations={[0.04, 0.55, 1]}
        start={{ x: 0.5, y: 1 }}
        end={{ x: 0.5, y: 0 }}
        style={styles.scrimBottom}
      />

      <Pressable
        testID="quest-detail-back-button"
        onPress={onBack}
        accessibilityRole="button"
        accessibilityLabel="Go back"
        style={[
          styles.backButton,
          { top: insets.top + spacing[2], left: spacing[3] },
        ]}
      >
        <BlurView
          intensity={30}
          tint="dark"
          style={StyleSheet.absoluteFillObject}
        />
        <ArrowLeft size={20} color={colors.text.primary} />
      </Pressable>

      <Animated.View
        style={[styles.textBlock, textStyle]}
        accessibilityRole="header"
      >
        <EyebrowLabel tone="warm">{eyebrowText}</EyebrowLabel>
        <Text style={styles.title}>{quest.title}</Text>
      </Animated.View>
    </View>
  );
}

const TITLE_SIZE = 32;

const styles = StyleSheet.create({
  container: {
    width: '100%',
    height: ART_HEADER_HEIGHT,
    overflow: 'hidden',
  },
  scrimTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '40%',
  },
  scrimBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '75%',
  },
  backButton: {
    position: 'absolute',
    width: BACK_BUTTON_SIZE,
    height: BACK_BUTTON_SIZE,
    borderRadius: radii.pill,
    backgroundColor: withAlpha(palette.richBlack, 0.5),
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  textBlock: {
    position: 'absolute',
    left: spacing[5],
    right: spacing[5],
    bottom: spacing[4],
  },
  title: {
    fontFamily: fontFamily.display,
    fontWeight: 'normal',
    fontSize: TITLE_SIZE,
    lineHeight: TITLE_SIZE * 1.15,
    color: colors.text.primary,
    marginTop: spacing[2],
  },
});
