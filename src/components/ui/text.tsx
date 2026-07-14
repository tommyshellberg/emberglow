import React from 'react';
import type { TextProps, TextStyle } from 'react-native';
import { I18nManager, StyleSheet, Text as NNText } from 'react-native';
import { twMerge } from 'tailwind-merge';

import type { TxKeyPath } from '@/lib/i18n';
import { translate } from '@/lib/i18n';

interface Props extends TextProps {
  className?: string;
  tx?: TxKeyPath;
  /** Contrast-safe color presets. Defaults to the primary (white) text color. */
  variant?: 'default' | 'secondary';
}

const VARIANT_CLASSES: Record<NonNullable<Props['variant']>, string> = {
  default: '',
  secondary: 'text-neutral-200',
};

export const Text = ({
  className = '',
  style,
  tx,
  variant = 'default',
  children,
  ...props
}: Props) => {
  const textStyle = React.useMemo(
    () =>
      twMerge(
        'text-base font-inter-regular text-white',
        VARIANT_CLASSES[variant],
        className
      ),
    [className, variant]
  );

  const nStyle = React.useMemo(
    () =>
      StyleSheet.flatten([
        {
          writingDirection: I18nManager.isRTL ? 'rtl' : 'ltr',
        },
        style,
      ]) as TextStyle,
    [style]
  );
  return (
    <NNText className={textStyle} style={nStyle} {...props}>
      {tx ? translate(tx) : children}
    </NNText>
  );
};
