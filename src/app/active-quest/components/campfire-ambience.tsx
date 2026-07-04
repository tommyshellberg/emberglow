import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect } from 'react';
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { View } from '@/components/ui';

interface EmberSpec {
  left: `${number}%`;
  delay: number;
}

const EMBERS: EmberSpec[] = [
  { left: '46%', delay: 0 },
  { left: '54%', delay: 1100 },
  { left: '50%', delay: 2200 },
  { left: '42%', delay: 1700 },
];

function Ember({ left, delay }: EmberSpec) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withDelay(
      delay,
      withRepeat(
        withTiming(1, { duration: 3200, easing: Easing.linear }),
        -1,
        false
      )
    );
  }, [delay, progress]);

  const style = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 0.2, 0.9, 1], [0, 0.9, 0.9, 0]),
    transform: [{ translateY: interpolate(progress.value, [0, 1], [0, -110]) }],
  }));

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          bottom: 80,
          left,
          width: 4,
          height: 4,
          borderRadius: 2,
          backgroundColor: '#ffb35c',
        },
        style,
      ]}
    />
  );
}

/**
 * Decorative full-bleed campfire background for the active-quest screen: a
 * warm glow, a blurred flame core, and a few drifting embers. Pure
 * gradients/blur/reanimated — no emoji. Renders absolutely positioned
 * behind the screen's content and never intercepts touches.
 */
export function CampfireAmbience() {
  const flicker = useSharedValue(1);

  useEffect(() => {
    flicker.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.85, {
          duration: 1200,
          easing: Easing.inOut(Easing.ease),
        })
      ),
      -1,
      true
    );
  }, [flicker]);

  const glowStyle = useAnimatedStyle(() => ({ opacity: flicker.value }));

  return (
    <View
      testID="campfire-ambience"
      pointerEvents="none"
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        overflow: 'hidden',
      }}
    >
      <Animated.View
        style={[
          {
            position: 'absolute',
            bottom: -70,
            alignSelf: 'center',
            width: 320,
            height: 260,
            borderRadius: 160,
            overflow: 'hidden',
          },
          glowStyle,
        ]}
      >
        <LinearGradient
          colors={[
            'rgba(255,150,60,0.55)',
            'rgba(255,90,40,0.2)',
            'rgba(255,90,40,0)',
          ]}
          style={{ flex: 1 }}
        />
      </Animated.View>

      <BlurView
        intensity={16}
        style={{
          position: 'absolute',
          bottom: 42,
          alignSelf: 'center',
          width: 20,
          height: 30,
          borderRadius: 12,
          overflow: 'hidden',
        }}
      >
        <LinearGradient
          colors={['#ffe9b8', '#ffb35c', '#ff6a2b']}
          style={{ flex: 1 }}
        />
      </BlurView>

      {EMBERS.map((ember) => (
        <Ember key={`${ember.left}-${ember.delay}`} {...ember} />
      ))}
    </View>
  );
}
