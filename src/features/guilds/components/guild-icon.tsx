/**
 * GuildIcon Component
 *
 * Renders a guild icon from SVG with optional background circle.
 * Similar pattern to PerkIcon component.
 */

import React from 'react';
import { View } from 'react-native';

import { Image } from '@/components/ui';
import colors from '@/components/ui/colors';

import { getGuildIconSource } from '../constants/guild-icons';
import type { GuildIcon as GuildIconType } from '../types/guild-types';

interface GuildIconProps {
  icon: GuildIconType;
  size?: number;
  /**
   * Color to tint the icon. Defaults to undefined (no tint, shows original SVG colors).
   */
  tintColor?: string;
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
  tintColor,
  showBackground = false,
  backgroundColor = colors.guild[400] + '30', // 30% opacity
}: GuildIconProps) {
  const iconSource = getGuildIconSource(icon);

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
        <Image
          source={iconSource}
          style={{
            width: size,
            height: size,
          }}
          contentFit="contain"
          tintColor={tintColor}
        />
      </View>
    );
  }

  return (
    <Image
      source={iconSource}
      style={{
        width: size,
        height: size,
      }}
      contentFit="contain"
      tintColor={tintColor}
    />
  );
}
