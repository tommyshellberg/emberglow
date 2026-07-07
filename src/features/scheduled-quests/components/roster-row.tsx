import { UserX } from 'lucide-react-native';
import React from 'react';

import { Text, TouchableOpacity, View } from '@/components/ui';
import colors from '@/components/ui/colors';

import {
  participantCharacter,
  participantDisplayName,
} from '../lib/participants';
import { type ScheduledParticipant, type ScheduledQuestStatus } from '../types';

interface Props {
  participant: ScheduledParticipant;
  isCreator: boolean;
  runStatus: ScheduledQuestStatus;
  onKick?: () => void;
}

const statusLabel = (
  participant: ScheduledParticipant,
  runStatus: ScheduledQuestStatus
): string => {
  if (participant.status === 'failed') return 'Failed';
  if (participant.status === 'no_show') return 'No-show';
  if (participant.status === 'completed') return 'Completed';
  if (runStatus === 'active')
    return participant.phoneLocked ? 'Locked in' : 'Not locked in';
  return 'Registered';
};

export function RosterRow({
  participant,
  isCreator,
  runStatus,
  onKick,
}: Props) {
  const character = participantCharacter(participant);

  return (
    <View className="mb-2 flex-row items-center justify-between rounded-lg bg-neutral-800/40 px-3 py-2">
      <View className="flex-1">
        <Text className="text-base font-semibold">
          {participantDisplayName(participant)}
          {isCreator ? '  ·  Host' : ''}
        </Text>
        {character ? (
          <Text className="text-sm text-neutral-200">
            {`Lv. ${character.level} ${character.type}`}
          </Text>
        ) : null}
      </View>
      <Text className="mr-2 text-sm text-neutral-200">
        {statusLabel(participant, runStatus)}
      </Text>
      {onKick ? (
        <TouchableOpacity testID="kick-button" onPress={onKick} className="p-1">
          <UserX size={18} color={colors.red[300]} />
        </TouchableOpacity>
      ) : null}
    </View>
  );
}
