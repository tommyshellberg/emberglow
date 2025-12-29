/**
 * GuildIconSelector Component
 *
 * A 2x4 grid of guild icons for selection during guild creation/editing.
 */

import React from 'react';
import { Pressable } from 'react-native';

import { Text, View } from '@/components/ui';

import { GUILD_ICONS } from '../constants/guild-icons';
import type { GuildIconSelectorProps } from '../types/guild-types';

import { GuildIcon } from './guild-icon';

export function GuildIconSelector({
  selected,
  onSelect,
}: GuildIconSelectorProps) {
  return (
    <View
      testID="icon-selector-grid"
      className="flex-row flex-wrap justify-center gap-3"
    >
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
            className={`relative h-14 w-14 items-center justify-center rounded-xl ${
              isSelected
                ? 'bg-guild-300/50 border-2 border-guild-300'
                : 'bg-guild-400/30'
            }`}
          >
            <GuildIcon icon={icon.id} size={28} />

            {/* Selected indicator */}
            {isSelected && (
              <View
                testID={`selected-indicator-${icon.id}`}
                className="absolute -bottom-1 -right-1 h-5 w-5 items-center justify-center rounded-full bg-guild-300"
              >
                <Text className="text-xs text-white">✓</Text>
              </View>
            )}
          </Pressable>
        );
      })}
    </View>
  );
}
