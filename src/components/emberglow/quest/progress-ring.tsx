import * as React from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedProps,
  withTiming,
} from 'react-native-reanimated';
import { Circle, Svg } from 'react-native-svg';

import { durations, easing, palette, withAlpha } from '@/theme';

export type ProgressRingProps = {
  /** 0–1, clamped. @default 0 */
  progress?: number;
  /** @default 240 */
  size?: number;
  /** @default 5 */
  strokeWidth?: number;
  /** Countdown content, centered over the ring. */
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
};

const GLOW_STROKE_WIDTH_DELTA = 7;
const GLOW_OPACITY = 0.28;
const TRACK_OPACITY = 0.4;

/** Pure geometry for the ring — testable independent of animation/rendering. */
export function ringGeometry(
  size: number,
  strokeWidth: number,
  progress: number
): { r: number; circumference: number; dashOffset: number } {
  const r = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * r;
  const safeProgress = Number.isFinite(progress) ? progress : 0;
  const clamped = Math.max(0, Math.min(1, safeProgress));
  const dashOffset = circumference * (1 - clamped);

  return { r, circumference, dashOffset };
}

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

/** The focus-timer ember ring — thin Cinnabar arc with a warm glow; center slot for the countdown. */
export function ProgressRing({
  progress = 0,
  size = 240,
  strokeWidth = 5,
  children,
  style,
}: ProgressRingProps) {
  const { r, circumference, dashOffset } = ringGeometry(
    size,
    strokeWidth,
    progress
  );
  // The halo is wider than the arc's own strokeWidth, so its outer edge
  // would clip against an svg canvas sized to exactly `size` (SVG's root
  // element defaults to overflow:hidden). Grow the canvas to fit the halo
  // and let it overflow the (unchanged) size×size container, the same way
  // a CSS drop-shadow bleeds past its element's box.
  const svgSize = size + GLOW_STROKE_WIDTH_DELTA;
  const center = svgSize / 2;
  // Arc starts at 12 o'clock instead of svg's default 3 o'clock.
  const rotation = `rotate(-90 ${center} ${center})`;

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: withTiming(dashOffset, {
      duration: durations.slow,
      easing: Easing.bezier(...easing.emberOut),
    }),
  }));

  return (
    <View style={[styles.container, { width: size, height: size }, style]}>
      <Svg width={svgSize} height={svgSize}>
        <Circle
          cx={center}
          cy={center}
          r={r}
          fill="none"
          stroke={withAlpha(palette.aegean, TRACK_OPACITY)}
          strokeWidth={strokeWidth}
        />
        {/* Halo — RN svg has no drop-shadow, so the glow is a wider, dimmer
            copy of the arc rendered underneath it. */}
        <AnimatedCircle
          cx={center}
          cy={center}
          r={r}
          fill="none"
          stroke={withAlpha(palette.cinnabar, GLOW_OPACITY)}
          strokeWidth={strokeWidth + GLOW_STROKE_WIDTH_DELTA}
          strokeLinecap="round"
          strokeDasharray={circumference}
          animatedProps={animatedProps}
          transform={rotation}
        />
        <AnimatedCircle
          cx={center}
          cy={center}
          r={r}
          fill="none"
          stroke={palette.cinnabar}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          animatedProps={animatedProps}
          transform={rotation}
        />
      </Svg>
      <View style={styles.children}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  children: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
