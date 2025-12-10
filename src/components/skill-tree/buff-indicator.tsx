import { Flame, Shield, Sparkles, Zap } from 'lucide-react-native';
import React from 'react';
import { View } from 'react-native';
import Animated, { FadeIn, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from 'react-native-reanimated';

import { Text } from '@/components/ui';

interface BuffIndicatorProps {
  name: string;
  active: boolean;
  icon?: 'flame' | 'shield' | 'sparkles' | 'zap';
  expiresAt?: Date;
  charges?: number;
  size?: 'sm' | 'default';
  testID?: string;
}

const iconMap = {
  flame: Flame,
  shield: Shield,
  sparkles: Sparkles,
  zap: Zap,
};

export function BuffIndicator({
  name,
  active,
  icon,
  expiresAt,
  charges,
  size = 'default',
  testID,
}: BuffIndicatorProps) {
  // Animation for active buffs
  const glowOpacity = useSharedValue(0.6);

  React.useEffect(() => {
    if (active) {
      glowOpacity.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 1000 }),
          withTiming(0.6, { duration: 1000 })
        ),
        -1,
        true
      );
    } else {
      glowOpacity.value = 0;
    }
  }, [active, glowOpacity]);

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
  }));

  const formatTime = (date: Date): string => {
    const now = new Date();
    const diff = date.getTime() - now.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 0) {
      return `${hours}h`;
    }
    return `${minutes}m`;
  };

  const sanitizeTestId = (text: string): string => {
    return text.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  };

  const Icon = icon ? iconMap[icon] : null;
  const iconSize = size === 'sm' ? 14 : 16;

  return (
    <Animated.View
      entering={FadeIn.duration(300)}
      testID={testID || `buff-indicator-${sanitizeTestId(name)}`}
      className={`
        relative flex-row items-center rounded-full border-2
        ${size === 'sm' ? 'px-2 py-1' : 'px-3 py-1.5'}
        ${
          active
            ? 'border-primary-400 bg-primary-400/20'
            : 'border-neutral-400/30 bg-neutral-400/10 opacity-40'
        }
      `}
    >
      {/* Glow effect for active buffs */}
      {active && (
        <Animated.View
          style={[
            glowStyle,
            {
              position: 'absolute',
              inset: -2,
              backgroundColor: '#E55838',
              borderRadius: 9999,
              opacity: 0.2,
            },
          ]}
        />
      )}

      {/* Icon */}
      {Icon && (
        <View testID={`buff-icon-${icon}`} className="mr-1.5">
          <Icon
            size={iconSize}
            color={active ? '#E55838' : '#8FA5B2'}
            strokeWidth={2.5}
          />
        </View>
      )}

      {/* Name */}
      <Text
        className={`
          text-xs font-semibold
          ${active ? 'text-cream-500' : 'text-neutral-200'}
          ${size === 'sm' ? 'text-[10px]' : ''}
        `}
      >
        {name}
      </Text>

      {/* Charges */}
      {charges !== undefined && (
        <View
          testID="buff-charges"
          className={`
            ml-1.5 flex size-4 items-center justify-center rounded-full
            ${active ? 'bg-secondary-300' : 'bg-neutral-400/30'}
          `}
        >
          <Text
            className={`
              text-[10px] font-bold
              ${active ? 'text-background' : 'text-neutral-200'}
            `}
          >
            {charges}
          </Text>
        </View>
      )}

      {/* Expiration Time */}
      {expiresAt && active && (
        <View className="ml-1.5">
          <Text className="text-[10px] font-medium text-primary-400">
            {formatTime(expiresAt)}
          </Text>
        </View>
      )}
    </Animated.View>
  );
}
