import React, { useEffect } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import { Pressable, StyleSheet, Text, View } from 'react-native';
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
  shadows,
} from '@/theme';

const TRACK_WIDTH = 48;
const TRACK_HEIGHT = 28;
const THUMB_SIZE = 22;
const THUMB_INSET = 3;
/** Distance the thumb travels from off (0) to on. */
const THUMB_TRAVEL = TRACK_WIDTH - THUMB_SIZE - THUMB_INSET * 2;

export type SwitchProps = {
  checked?: boolean;
  onChange?: (checked: boolean) => void;
  label?: string;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

/** Custom ember-glow toggle — track + thumb, lights up on when checked. */
export function Switch({
  checked = false,
  onChange,
  label,
  disabled = false,
  style,
  testID,
}: SwitchProps) {
  const translateX = useSharedValue(checked ? THUMB_TRAVEL : 0);

  useEffect(() => {
    translateX.value = withTiming(checked ? THUMB_TRAVEL : 0, {
      duration: durations.base,
      easing: Easing.bezier(...easing.emberOut),
    });
  }, [checked, translateX]);

  const thumbStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const handlePress = () => {
    if (disabled) return;
    onChange?.(!checked);
  };

  return (
    <Pressable
      onPress={handlePress}
      disabled={disabled}
      accessibilityRole="switch"
      accessibilityState={{ checked, disabled }}
      testID={testID}
      style={[styles.row, disabled && styles.disabled, style]}
    >
      <View style={[styles.track, checked ? styles.trackOn : styles.trackOff]}>
        <Animated.View style={[styles.thumb, thumbStyle]} />
      </View>
      {label ? (
        <Text
          testID={testID ? `${testID}-label` : undefined}
          style={styles.label}
        >
          {label}
        </Text>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  disabled: {
    opacity: 0.4,
  },
  track: {
    width: TRACK_WIDTH,
    height: TRACK_HEIGHT,
    borderRadius: radii.pill,
    borderWidth: 1,
    justifyContent: 'center',
  },
  trackOff: {
    backgroundColor: colors.track,
    borderColor: colors.border.subtle,
  },
  trackOn: {
    backgroundColor: colors.accent.primary,
    borderColor: 'transparent',
    ...shadows.glowEmber,
  },
  thumb: {
    position: 'absolute',
    left: THUMB_INSET,
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: THUMB_SIZE / 2,
    backgroundColor: palette.bone,
  },
  label: {
    fontFamily: fontFamily.regular,
    fontSize: 15,
    color: colors.text.primary,
  },
});
