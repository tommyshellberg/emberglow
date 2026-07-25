/**
 * GuildIconSelector Component
 *
 * A 2x4 grid of guild icons for selection during guild creation/editing.
 */

import { Check } from 'lucide-react-native';
import React from 'react';
import { Pressable, StyleSheet } from 'react-native';

import { View } from '@/components/ui';
import { colors, palette, radii, shadows, spacing, withAlpha } from '@/theme';

import { GUILD_ICONS } from '../constants/guild-icons';
import type { GuildIconSelectorProps } from '../types/guild-types';
import { GuildIcon } from './guild-icon';

const TILE_SIZE = 56;
const BADGE_SIZE = 20;

export function GuildIconSelector({
  selected,
  onSelect,
}: GuildIconSelectorProps) {
  return (
    <View testID="icon-selector-grid" style={styles.grid}>
      {GUILD_ICONS.map((icon) => {
        const isSelected = selected === icon.id;

        return (
          <Pressable
            key={icon.id}
            testID={`icon-button-${icon.id}`}
            onPress={() => onSelect(icon.id)}
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel={`Select ${icon.label} icon`}
            accessibilityState={{ selected: isSelected }}
            style={[styles.tile, isSelected ? styles.tileSelected : null]}
          >
            <GuildIcon icon={icon.id} size={28} />

            {/* Selected indicator */}
            {isSelected && (
              <View
                testID={`selected-indicator-${icon.id}`}
                style={styles.badge}
              >
                <Check size={12} color={colors.text.onAccent} strokeWidth={3} />
              </View>
            )}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: spacing[3],
  },
  tile: {
    position: 'relative',
    width: TILE_SIZE,
    height: TILE_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: 'transparent',
    backgroundColor: colors.fill.subtle,
  },
  tileSelected: {
    ...shadows.glowEmber,
    borderWidth: 2,
    borderColor: withAlpha(palette.cinnabar, 0.55),
    backgroundColor: withAlpha(palette.cinnabar, 0.18),
  },
  badge: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    width: BADGE_SIZE,
    height: BADGE_SIZE,
    borderRadius: BADGE_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accent.primary,
  },
});
