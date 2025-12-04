import { FlashList } from '@shopify/flash-list';
import {
  BookOpen,
  Brain,
  Calendar,
  Circle,
  Dumbbell,
  Flame,
  FlaskConical,
  Hammer,
  Shield,
  Star,
  Sunrise,
  Sword,
  Zap,
} from 'lucide-react-native';
import React, { useState } from 'react';
import { Pressable } from 'react-native';
import Animated, {
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

import { Text, View } from '@/components/ui';
import colors from '@/components/ui/colors';

// Card dimensions - 80px square for a balanced flip effect
const CARD_SIZE = 80;
const ICON_SIZE = 40;

interface PerkApplied {
  id: string;
  name: string;
  bonusXP: number;
  icon: string;
}

interface CompactRewardBreakdownProps {
  baseXP: number;
  adjustedXP: number;
  perksApplied: PerkApplied[];
}

const PERK_ICONS: Record<string, React.ComponentType<any>> = {
  zap: Zap,
  dumbbell: Dumbbell,
  shield: Shield,
  flame: Flame,
  star: Star,
  sunrise: Sunrise,
  calendar: Calendar,
  sword: Sword,
  brain: Brain,
  'flask-conical': FlaskConical,
  hammer: Hammer,
  'book-open': BookOpen,
  circle: Circle,
};

function FlippablePerkBadge({ perk }: { perk: PerkApplied }) {
  const IconComponent = PERK_ICONS[perk.icon] || Circle;
  const [isFlipped, setIsFlipped] = useState(false);
  const rotation = useSharedValue(0);

  const handlePress = () => {
    const newFlipped = !isFlipped;
    setIsFlipped(newFlipped);
    rotation.value = withSpring(newFlipped ? 180 : 0, {
      damping: 15,
      stiffness: 100,
    });
  };

  // Front face (icon + XP) - visible when rotation is 0-90
  const frontAnimatedStyle = useAnimatedStyle(() => {
    const rotateY = interpolate(rotation.value, [0, 180], [0, 180]);
    return {
      transform: [{ perspective: 1000 }, { rotateY: `${rotateY}deg` }],
      backfaceVisibility: 'hidden' as const,
    };
  });

  // Back face (perk name) - visible when rotation is 90-180
  const backAnimatedStyle = useAnimatedStyle(() => {
    const rotateY = interpolate(rotation.value, [0, 180], [180, 360]);
    return {
      transform: [{ perspective: 1000 }, { rotateY: `${rotateY}deg` }],
      backfaceVisibility: 'hidden' as const,
    };
  });

  const cardStyle = {
    width: CARD_SIZE,
    height: CARD_SIZE,
  };

  return (
    <Pressable
      onPress={handlePress}
      accessibilityLabel={`${perk.name}: +${perk.bonusXP} XP. Tap to flip`}
      accessibilityRole="button"
      accessibilityHint="Tap to reveal perk name"
      testID={`perk-badge-${perk.id}`}
      style={{ marginRight: 8 }}
    >
      <View style={cardStyle}>
        {/* Front face - Icon + XP */}
        <Animated.View
          style={[cardStyle, frontAnimatedStyle, { position: 'absolute' }]}
          className="items-center justify-center rounded-xl border border-primary-400/50 bg-background/30"
        >
          <IconComponent size={ICON_SIZE} color={colors.cinnamon} />
          <Text
            className="mt-1 text-sm font-bold"
            style={{ color: colors.cinnamon }}
          >
            +{perk.bonusXP}
          </Text>
        </Animated.View>

        {/* Back face - Perk name */}
        <Animated.View
          style={[cardStyle, backAnimatedStyle, { position: 'absolute' }]}
          className="items-center justify-center rounded-xl border border-primary-400/50 bg-background/30 p-2"
        >
          <Text
            className="text-center text-xs font-semibold"
            style={{ color: colors.cinnamon }}
            numberOfLines={3}
          >
            {perk.name}
          </Text>
        </Animated.View>
      </View>
    </Pressable>
  );
}

export function CompactRewardBreakdown({
  adjustedXP,
  perksApplied,
}: CompactRewardBreakdownProps) {
  return (
    <View
      className="w-full rounded-2xl border border-primary-300/50 bg-cardBackground/50 p-3"
      accessibilityLabel="Reward breakdown"
    >
      {/* Header */}
      <Text className="mb-2 text-center text-sm font-semibold uppercase tracking-wide">
        Perks used on this quest
      </Text>

      {/* Horizontal scrollable perk badges using FlashList */}
      {perksApplied.length > 0 && (
        <View className="mb-3" style={{ height: CARD_SIZE + 8 }}>
          <FlashList
            data={perksApplied}
            horizontal
            showsHorizontalScrollIndicator={false}
            estimatedItemSize={CARD_SIZE + 8}
            renderItem={({ item }) => <FlippablePerkBadge perk={item} />}
            keyExtractor={(item) => item.id}
          />
        </View>
      )}

      {/* Total XP Row */}
      <View className="flex-row justify-between">
        <Text className="text-sm font-bold text-cream-500">Total XP</Text>
        <Text className="text-sm font-bold text-cream-500">{adjustedXP}</Text>
      </View>
    </View>
  );
}
