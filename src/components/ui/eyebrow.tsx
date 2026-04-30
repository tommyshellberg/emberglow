import * as React from 'react';

import colors from './colors';
import { Text } from './text';

type EyebrowProps = {
  text?: string;
  children?: React.ReactNode;
  className?: string;
  accessibilityLabel?: string;
};

export function Eyebrow({
  text,
  children,
  className = '',
  accessibilityLabel,
}: EyebrowProps) {
  const content =
    typeof (text ?? children) === 'string'
      ? (text ?? (children as string)).toUpperCase()
      : (text ?? children);

  return (
    <Text
      className={`text-xs font-bold uppercase ${className}`}
      style={{ color: colors.brown, letterSpacing: 4 }}
      accessibilityLabel={accessibilityLabel}
    >
      {content}
    </Text>
  );
}
