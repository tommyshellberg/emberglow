/**
 * GuildIcon Component
 *
 * Renders a guild's line-art Lucide icon with an optional circular
 * background, tinted to the Emberglow accent by default.
 */

import React from 'react';
import { View } from 'react-native';

import { colors, palette, withAlpha } from '@/theme';

import { getGuildIconComponent } from '../constants/guild-icons';
import type { GuildIcon as GuildIconType } from '../types/guild-types';

interface GuildIconProps {
  icon: GuildIconType;
  size?: number;
  /**
   * Icon stroke color. Defaults to the Emberglow accent (Sandy).
   */
  color?: string;
  /**
   * Whether to show a circular background behind the icon.
   */
  showBackground?: boolean;
  /**
   * Background color when showBackground is true.
   */
  backgroundColor?: string;
}

export function GuildIcon({
  icon,
  size = 24,
  color = colors.text.accent,
  showBackground = false,
  backgroundColor = withAlpha(palette.sandy, 0.12),
}: GuildIconProps) {
  const IconComponent = getGuildIconComponent(icon);
  const glyph = <IconComponent size={size} color={color} strokeWidth={1.75} />;

  if (showBackground) {
    const circleSize = size + 24; // 12px padding on each side
    return (
      <View
        style={{
          width: circleSize,
          height: circleSize,
          borderRadius: circleSize / 2,
          backgroundColor,
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        {glyph}
      </View>
    );
  }

  return glyph;
}
