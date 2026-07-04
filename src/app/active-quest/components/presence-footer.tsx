import { Lock } from 'lucide-react-native';
import React from 'react';

import { Text, View } from '@/components/ui';

/**
 * Two differentiated hint lines beneath the journey bar: a brighter,
 * semibold positive affordance (line 1) and a dimmer warning (line 2).
 * Static copy — the screen never branches this on a pass/fail decision.
 */
export function PresenceFooter() {
  return (
    <View style={{ alignItems: 'center' }}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <Lock size={11} color="#e8d9bd" />
        <Text
          style={{
            marginLeft: 4,
            fontSize: 11.5,
            fontWeight: '600',
            color: '#e8d9bd',
          }}
        >
          Lock your phone anytime — the quest continues
        </Text>
      </View>
      <Text
        style={{
          marginTop: 5,
          fontSize: 9.5,
          color: '#7d7289',
          letterSpacing: 0.3,
        }}
      >
        Leaving the app will end the quest early
      </Text>
    </View>
  );
}
