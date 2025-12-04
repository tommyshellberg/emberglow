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
import React from 'react';

import { Text, View } from '@/components/ui';
import { primary } from '@/components/ui/colors';

interface PerkApplied {
  id: string;
  name: string;
  bonusXP: number;
  icon: string;
}

interface RewardBreakdownCardProps {
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

function PerkIcon({ icon, perkId }: { icon: string; perkId: string }) {
  const IconComponent = PERK_ICONS[icon];
  if (!IconComponent) {
    return null;
  }
  return (
    <View testID={`perk-icon-${perkId}`}>
      <IconComponent size={20} color={primary[400]} />
    </View>
  );
}

export function RewardBreakdownCard({
  baseXP,
  adjustedXP,
  perksApplied,
}: RewardBreakdownCardProps) {
  return (
    <View
      className="rounded-2xl border border-neutral-800 bg-neutral-900/30 p-4"
      accessibilityLabel="Reward breakdown"
    >
      {/* Header */}
      <Text className="mb-3 text-sm font-semibold text-neutral-400">
        Reward Breakdown
      </Text>

      {/* Base XP Row */}
      <View className="flex-row justify-between py-1">
        <Text className="text-sm text-cream-500">Base XP</Text>
        <Text className="text-sm text-cream-500">{baseXP}</Text>
      </View>

      {/* Perk Rows */}
      {perksApplied.map((perk) => (
        <View key={perk.id} className="flex-row items-center justify-between py-1">
          <Text className="text-sm text-cream-500">{perk.name}</Text>
          <View className="flex-row items-center gap-2">
            <Text
              className="text-sm font-semibold"
              style={{ color: primary[400] }}
            >
              +{perk.bonusXP}
            </Text>
            <PerkIcon icon={perk.icon} perkId={perk.id} />
          </View>
        </View>
      ))}

      {/* Divider */}
      <View className="my-2 border-t border-neutral-800" />

      {/* Total Row */}
      <View className="flex-row justify-between py-1">
        <Text className="text-base font-bold text-cream-500">Total XP</Text>
        <Text className="text-base font-bold text-cream-500">{adjustedXP}</Text>
      </View>
    </View>
  );
}
