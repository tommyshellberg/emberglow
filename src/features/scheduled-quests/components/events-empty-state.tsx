import { CalendarSearch, Ticket } from 'lucide-react-native';
import React from 'react';

import { Text, TouchableOpacity, View } from '@/components/ui';
import colors from '@/components/ui/colors';

interface Props {
  variant: 'discover' | 'mine';
  onActionPress: () => void;
}

const CONTENT = {
  discover: {
    Icon: CalendarSearch,
    title: 'No events found',
    subtitle:
      'Nothing on the calendar yet. Start one and invite others to join.',
    actionLabel: 'Create event',
  },
  mine: {
    Icon: Ticket,
    title: "You're not signed up for anything",
    subtitle: 'Browse public events and join one, or host your own.',
    actionLabel: 'Discover events',
  },
} as const;

export function EventsEmptyState({ variant, onActionPress }: Props) {
  const { Icon, title, subtitle, actionLabel } = CONTENT[variant];

  return (
    <View className="items-center px-6 py-16">
      <View
        testID="events-empty-state-icon"
        className="mb-4 size-16 items-center justify-center rounded-full bg-primary-400/20"
      >
        <Icon size={28} color={colors.primary[400]} />
      </View>
      <Text className="mb-2 text-center text-xl font-bold">{title}</Text>
      <Text variant="secondary" className="mb-6 text-center">
        {subtitle}
      </Text>
      <TouchableOpacity
        testID="events-empty-state-action"
        onPress={onActionPress}
        accessibilityRole="button"
        accessibilityLabel={actionLabel}
        className="rounded-full bg-primary-400 px-6 py-3"
      >
        <Text className="font-semibold text-white">{actionLabel}</Text>
      </TouchableOpacity>
    </View>
  );
}
