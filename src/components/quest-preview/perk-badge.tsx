import React from 'react';
import Animated, {
  interpolate,
  type SharedValue,
  useAnimatedStyle,
} from 'react-native-reanimated';

import { PerkIcon } from '@/components/skill-tree/perk-icon';
import { Text, View } from '@/components/ui';
import { primary } from '@/components/ui/colors';
import { getPerkName } from '@/lib/perks';

interface PerkBadgeProps {
  perkId: string;
  animationValue: SharedValue<number>;
  iconOnly?: boolean;
}

/**
 * Animated perk badge component that displays a perk icon and optionally name.
 * Animates with a spring bounce when the animation value changes.
 */
export function PerkBadge({
  perkId,
  animationValue,
  iconOnly = false,
}: PerkBadgeProps) {
  const perkName = getPerkName(perkId);

  // Container scale animation (1.0 → 1.2 → 1.0)
  const containerAnimatedStyle = useAnimatedStyle(() => {
    const scale = interpolate(animationValue.value, [0, 0.5, 1], [1, 1.2, 1]);

    return {
      transform: [{ scale }],
    };
  });

  // Icon scale animation (0.5 → 1.3 → 1.0)
  const iconAnimatedStyle = useAnimatedStyle(() => {
    const scale = interpolate(animationValue.value, [0, 0.5, 1], [0.5, 1.3, 1]);

    return {
      transform: [{ scale }],
    };
  });

  if (iconOnly) {
    return (
      <Animated.View style={iconAnimatedStyle}>
        <PerkIcon perkId={perkId} isUnlocked={true} size={28} />
      </Animated.View>
    );
  }

  return (
    <Animated.View
      className="flex-row items-center rounded-full border-2 px-3 py-2"
      style={[
        containerAnimatedStyle,
        {
          borderColor: primary[400],
          backgroundColor: `${primary[400]}33`, // 20% opacity
        },
      ]}
    >
      <Animated.View style={iconAnimatedStyle}>
        <PerkIcon perkId={perkId} isUnlocked={true} size={20} />
      </Animated.View>
      <Text className="ml-2 text-xs font-semibold text-cream-500">
        {perkName}
      </Text>
    </Animated.View>
  );
}
