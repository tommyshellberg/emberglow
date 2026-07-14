import * as React from 'react';
import type {
  NativeSyntheticEvent,
  StyleProp,
  TextInputFocusEventData,
  TextInputProps,
  ViewStyle,
} from 'react-native';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import { colors, fontFamily, palette, radii, withAlpha } from '@/theme';

export type InputProps = Omit<TextInputProps, 'style'> & {
  label?: string;
  hint?: string;
  containerStyle?: StyleProp<ViewStyle>;
};

/** 3pt approximation of the web `0 0 0 3px sandy@0.15` focus ring. */
const FOCUS_RING_WIDTH = 3;

/** Dark inset text field with a warm Sandy focus glow. */
export function Input({
  label,
  hint,
  containerStyle,
  multiline,
  onFocus,
  onBlur,
  ...rest
}: InputProps) {
  const [focused, setFocused] = React.useState(false);

  // onFocus/onBlur are destructured out (not left in `...rest`) so a
  // caller-supplied handler can never clobber the internal focus-ring
  // tracking below — see the sibling `ui/input.tsx`, where spreading
  // `{...inputProps}` after its own onFocus/onBlur lets a caller's handler
  // silently override them, permanently breaking the focus ring.
  const handleFocus = (
    event: NativeSyntheticEvent<TextInputFocusEventData>
  ) => {
    setFocused(true);
    onFocus?.(event);
  };

  const handleBlur = (event: NativeSyntheticEvent<TextInputFocusEventData>) => {
    setFocused(false);
    onBlur?.(event);
  };

  return (
    <View style={containerStyle}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View
        style={[styles.ring, focused ? styles.ringFocused : styles.ringBlurred]}
      >
        <TextInput
          {...rest}
          multiline={multiline}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholderTextColor={colors.text.muted}
          style={[
            styles.field,
            focused ? styles.fieldFocused : styles.fieldBlurred,
            multiline ? styles.multiline : null,
          ]}
        />
      </View>
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  label: {
    fontFamily: fontFamily.medium,
    fontSize: 14,
    color: colors.text.secondary,
    marginBottom: 6,
  },
  // Padding stays constant whether focused or blurred so the glow doesn't
  // shift layout when it appears — only the background color changes.
  ring: {
    padding: FOCUS_RING_WIDTH,
    borderRadius: radii.md + FOCUS_RING_WIDTH,
  },
  ringFocused: {
    backgroundColor: withAlpha(palette.sandy, 0.15),
  },
  ringBlurred: {
    backgroundColor: 'transparent',
  },
  field: {
    backgroundColor: colors.surface.inset,
    borderWidth: 1,
    borderRadius: radii.md,
    paddingVertical: 13,
    paddingHorizontal: 16,
    fontSize: 16,
    fontFamily: fontFamily.regular,
    color: colors.text.primary,
  },
  fieldFocused: {
    borderColor: withAlpha(palette.sandy, 0.55),
  },
  fieldBlurred: {
    borderColor: colors.border.subtle,
  },
  multiline: {
    minHeight: 96,
    textAlignVertical: 'top',
  },
  hint: {
    fontFamily: fontFamily.regular,
    fontSize: 12,
    color: colors.text.muted,
    marginTop: 6,
  },
});
