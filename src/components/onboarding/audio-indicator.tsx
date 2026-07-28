import { Feather } from '@expo/vector-icons';
import * as React from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { IconButton } from '@/components/emberglow';
import { useSettingsStore } from '@/store/settings-store';
import { durations, palette, spacing, withAlpha } from '@/theme';

const BUTTON_SIZE = 40;
// Ring sits 5pt outside the button on every side, so it reads as a halo
// rather than an outline hugging the icon.
const PULSE_INSET = -5;
const PULSE_MIN_OPACITY = 0.35;
const PULSE_MAX_SCALE = 1.15;

/**
 * Always-present onboarding control. Shows the user's mute PREFERENCE
 * (`onboardingSoundEnabled`, Task 7) and doubles as its toggle; `isPlaying`
 * (Task 8's `useOnboardingMusic().isPlaying`) only drives a pulse ring
 * around the button, never the icon.
 *
 * Icon is preference-driven rather than isPlaying-driven (Tommy, task-9
 * brief resolution #1): a mute button whose icon flickers during a
 * transient buffer or pause reads as broken, even though the underlying
 * player briefly isn't playing. `isPlaying` still needs a real, observable
 * effect of its own or it's a dead prop (resolution #3) — the pulse ring
 * is that effect.
 *
 * Truthfulness constraint: iOS never exposes the silent-switch position, so
 * a user with a silenced phone still sees this indicator as "playing" while
 * hearing nothing — that's accepted, not a bug. The accessibility label
 * therefore names the toggle action / preference state ("Mute onboarding
 * sound" / "Unmute onboarding sound"), never a claim that sound is audible.
 */
export function AudioIndicator({ isPlaying }: { isPlaying: boolean }) {
  const insets = useSafeAreaInsets();
  const onboardingSoundEnabled = useSettingsStore(
    (s) => s.onboardingSoundEnabled
  );
  const setOnboardingSoundEnabled = useSettingsStore(
    (s) => s.setOnboardingSoundEnabled
  );

  const pulse = useSharedValue(0);

  React.useEffect(() => {
    if (isPlaying) {
      pulse.value = withRepeat(
        withTiming(1, { duration: durations.slow }),
        -1,
        true
      );
    } else {
      pulse.value = 0;
    }
  }, [isPlaying, pulse]);

  const pulseStyle = useAnimatedStyle(() => ({
    opacity: PULSE_MIN_OPACITY + pulse.value * (1 - PULSE_MIN_OPACITY),
    transform: [{ scale: 1 + pulse.value * (PULSE_MAX_SCALE - 1) }],
  }));

  return (
    <View
      style={[
        styles.wrapper,
        { top: insets.top + spacing[3], right: insets.right + spacing[4] },
      ]}
    >
      <View style={styles.buttonSlot}>
        {isPlaying && (
          <Animated.View
            testID="audio-indicator-pulse"
            pointerEvents="none"
            style={[styles.pulseRing, pulseStyle]}
          />
        )}
        <IconButton
          testID="audio-indicator"
          size={BUTTON_SIZE}
          label={
            onboardingSoundEnabled
              ? 'Mute onboarding sound'
              : 'Unmute onboarding sound'
          }
          onPress={() => setOnboardingSoundEnabled(!onboardingSoundEnabled)}
        >
          <Feather
            testID={
              onboardingSoundEnabled
                ? 'audio-indicator-playing'
                : 'audio-indicator-muted'
            }
            name={onboardingSoundEnabled ? 'volume-2' : 'volume-x'}
          />
        </IconButton>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    zIndex: 10,
  },
  buttonSlot: {
    width: BUTTON_SIZE,
    height: BUTTON_SIZE,
  },
  pulseRing: {
    position: 'absolute',
    top: PULSE_INSET,
    right: PULSE_INSET,
    bottom: PULSE_INSET,
    left: PULSE_INSET,
    borderRadius: (BUTTON_SIZE - PULSE_INSET * 2) / 2,
    borderWidth: 1.5,
    borderColor: withAlpha(palette.sandy, 0.6),
  },
});
