import { LinearGradient } from 'expo-linear-gradient';
import * as React from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import {
  colors,
  durations,
  easing,
  fontFamily,
  palette,
  radii,
  tracking,
} from '@/theme';

export type XPBarProps = {
  /** @default 1 */
  level?: number;
  /** @default 0 */
  xp?: number;
  /** @default 100 */
  xpNext?: number;
  style?: StyleProp<ViewStyle>;
};

const FONT_SIZE = 13;
const TRACK_HEIGHT = 8;
const TRACK_BORDER_WIDTH = 1;
// Content box of the track once its 1pt border is subtracted from each side.
const FILL_HEIGHT = TRACK_HEIGHT - TRACK_BORDER_WIDTH * 2;

/** Clamped 0–1 XP fraction — testable independent of animation/rendering. */
export function xpBarProgress(xp: number, xpNext: number): number {
  if (xpNext <= 0) return 0;
  return Math.max(0, Math.min(1, xp / xpNext));
}

/** Hero level + XP progress; Cinnabar to Sandy ember gradient fill. */
export function XPBar({ level = 1, xp = 0, xpNext = 100, style }: XPBarProps) {
  const pct = xpBarProgress(xp, xpNext);
  const widthPct = useSharedValue(pct * 100);

  React.useEffect(() => {
    widthPct.value = withTiming(pct * 100, {
      duration: durations.slow,
      easing: Easing.bezier(...easing.emberOut),
    });
  }, [pct, widthPct]);

  const animatedFillStyle = useAnimatedStyle(() => ({
    width: `${widthPct.value}%`,
  }));

  return (
    <View style={style}>
      <View style={styles.header}>
        <Text style={styles.level}>Level {level}</Text>
        <Text style={styles.xp}>
          {xp} / {xpNext} XP
        </Text>
      </View>
      <View style={styles.track}>
        {pct > 0 && (
          <Animated.View
            testID="xp-bar-fill"
            style={[styles.fillGlow, animatedFillStyle]}
          >
            <LinearGradient
              colors={[palette.cinnabar, palette.sandy]}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              style={styles.fillGradient}
            />
          </Animated.View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 6,
  },
  level: {
    fontFamily: fontFamily.semibold,
    fontSize: FONT_SIZE,
    letterSpacing: FONT_SIZE * tracking.wide,
    textTransform: 'uppercase',
    color: colors.text.secondary,
  },
  xp: {
    fontFamily: fontFamily.semibold,
    fontSize: FONT_SIZE,
    color: colors.text.accent,
  },
  track: {
    height: TRACK_HEIGHT,
    borderRadius: radii.pill,
    backgroundColor: colors.track,
    borderWidth: TRACK_BORDER_WIDTH,
    borderColor: colors.border.hairline,
  },
  fillGlow: {
    height: FILL_HEIGHT,
    borderRadius: radii.pill,
    shadowColor: palette.sandy,
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 12,
    shadowOpacity: 0.5,
    elevation: 0,
  },
  fillGradient: {
    flex: 1,
    borderRadius: radii.pill,
  },
});
