/**
 * ScopeToggle Component
 *
 * Toggle between Friends and Global leaderboards.
 * Fully accessible with proper roles, labels, and states.
 *
 * No Emberglow segmented-control primitive exists yet, so this stays a
 * bespoke `Pressable` pair, retinted from `@/theme`.
 */

import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import {
  A11Y,
  STRINGS,
} from '@/features/leaderboard/constants/leaderboard-constants';
import type { ScopeToggleProps } from '@/features/leaderboard/types/leaderboard-types';
import { colors, fontFamily, radii, spacing } from '@/theme';

export function ScopeToggle({ scope, onScopeChange }: ScopeToggleProps) {
  return (
    <View style={styles.container}>
      {/* Friends Toggle */}
      <Pressable
        testID="leaderboard-scope-friends"
        onPress={() => onScopeChange('friends')}
        style={[styles.option, scope === 'friends' && styles.optionSelected]}
        accessible
        accessibilityRole={A11Y.roleButton}
        accessibilityLabel={A11Y.labelScopeToggleFriends}
        accessibilityHint={A11Y.hintScopeToggle}
        accessibilityState={{ selected: scope === 'friends' }}
      >
        <Text
          style={[styles.label, scope === 'friends' && styles.labelSelected]}
        >
          {STRINGS.scopeFriends}
        </Text>
      </Pressable>

      {/* Global Toggle */}
      <Pressable
        testID="leaderboard-scope-global"
        onPress={() => onScopeChange('global')}
        style={[styles.option, scope === 'global' && styles.optionSelected]}
        accessible
        accessibilityRole={A11Y.roleButton}
        accessibilityLabel={A11Y.labelScopeToggleGlobal}
        accessibilityHint={A11Y.hintScopeToggle}
        accessibilityState={{ selected: scope === 'global' }}
      >
        <Text
          style={[styles.label, scope === 'global' && styles.labelSelected]}
        >
          {STRINGS.scopeGlobal}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    marginBottom: spacing[4],
    padding: spacing[1],
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    backgroundColor: colors.surface.inset,
  },
  option: {
    flex: 1,
    paddingVertical: spacing[2],
    borderRadius: radii.pill,
  },
  optionSelected: {
    backgroundColor: colors.accent.primary,
  },
  label: {
    textAlign: 'center',
    fontFamily: fontFamily.semibold,
    fontSize: 15,
    color: colors.text.secondary,
  },
  labelSelected: {
    color: colors.text.onAccent,
  },
});
