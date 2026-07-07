import { type ScheduledParticipant } from '../types';

export const participantUserId = (
  p: ScheduledParticipant | undefined
): string | undefined => {
  if (!p) return undefined;
  return typeof p.userId === 'string' ? p.userId : p.userId?.id;
};

export const participantDisplayName = (p: ScheduledParticipant): string => {
  if (typeof p.userId !== 'string' && p.userId?.character?.name)
    return p.userId.character.name;
  return 'Adventurer';
};
