import { Lock } from 'lucide-react-native';
import React from 'react';

import { colors, Text, View } from '@/components/ui';

// The footer sits over the campfire glow, whose warmth varies as it flickers.
// A soft dark shadow keeps both lines legible against that moving light.
const TEXT_SHADOW = {
  textShadowColor: 'rgba(0,0,0,0.55)',
  textShadowOffset: { width: 0, height: 1 },
  textShadowRadius: 4,
} as const;

/**
 * Two differentiated hint lines beneath the journey bar: a brighter,
 * semibold positive affordance (line 1) and a dimmer warning (line 2).
 * Static copy — the screen never branches this on a pass/fail decision.
 */
export function PresenceFooter() {
  return (
    <View style={{ alignItems: 'center' }}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <Lock size={12} color={colors.lightBrown[300]} />
        <Text
          style={{
            marginLeft: 5,
            fontSize: 12.5,
            fontWeight: '600',
            color: colors.cream[300],
            ...TEXT_SHADOW,
          }}
        >
          Lock your phone anytime — the quest continues
        </Text>
      </View>
      <Text
        style={{
          marginTop: 5,
          fontSize: 11,
          // Warm cream at reduced opacity keeps this line quieter than the
          // one above while staying legible over the ember glow — the cool
          // slate it used before all but vanished against the warm light.
          color: 'rgba(232,220,199,0.72)',
          letterSpacing: 0.3,
          ...TEXT_SHADOW,
        }}
      >
        Leaving the app will end the quest early
      </Text>
    </View>
  );
}
