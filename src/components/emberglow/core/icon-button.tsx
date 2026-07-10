import * as React from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import { Pressable, StyleSheet } from 'react-native';

import { colors, palette, radii, withAlpha } from '@/theme';

/** Default size in points — also the minimum recommended touch target. */
const DEFAULT_SIZE = 44;

/** Icon renders at roughly half the button's diameter unless the child already sets its own size. */
const ICON_SIZE_RATIO = 0.5;

type IconElement = React.ReactElement<{ color?: string; size?: number }>;

export type IconButtonProps = {
  /** Required — becomes the accessibilityLabel since there's no visible text. */
  label: string;
  /** @default 44 */
  size?: number;
  active?: boolean;
  disabled?: boolean;
  onPress?: () => void;
  /** A single lucide-react-native icon element. */
  children: IconElement;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

/** Round icon-only button (44pt minimum hit target). Active state gets a warm Sandy tint. */
export function IconButton({
  label,
  size = DEFAULT_SIZE,
  active = false,
  disabled = false,
  onPress,
  children,
  style,
  testID,
}: IconButtonProps) {
  const iconColor = active ? colors.text.accent : colors.text.secondary;

  const icon = React.isValidElement(children)
    ? React.cloneElement(children, {
        color: iconColor,
        size: children.props.size ?? Math.round(size * ICON_SIZE_RATIO),
      })
    : children;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: active, disabled }}
      disabled={disabled}
      onPress={onPress}
      testID={testID}
      style={({ pressed }) => [
        styles.base,
        {
          width: size,
          height: size,
          borderRadius: radii.pill,
          borderColor: active
            ? withAlpha(palette.sandy, 0.5)
            : colors.border.hairline,
          backgroundColor: active
            ? withAlpha(palette.sandy, 0.12)
            : pressed
              ? colors.fill.faint
              : 'transparent',
          opacity: disabled ? 0.4 : 1,
        },
        style,
      ]}
    >
      {icon}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
});
