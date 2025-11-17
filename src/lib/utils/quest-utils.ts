import type { QuestParticipant } from '@/store/types';

/**
 * Represents a quest with reward and optional participants
 * This is a minimal interface that works with both Quest and TransformedQuest types
 */
interface QuestWithReward {
  reward: {
    xp: number;
  };
  participants?: QuestParticipant[];
}

/**
 * Gets the adjusted XP for the current user from a quest
 *
 * This function handles the logic of looking up the current user's participant
 * data and returning their adjusted XP from perk bonuses. If no adjusted XP
 * is available (e.g., old quests before perks, or no participant data),
 * it falls back to the base quest XP.
 *
 * @param quest - A quest object with reward and optional participants
 * @param currentUserId - The ID of the current user
 * @returns The adjusted XP if available, otherwise the base quest XP
 *
 * @example
 * ```typescript
 * const quest = {
 *   reward: { xp: 15 },
 *   participants: [
 *     { userId: 'user-123', rewards: { adjustedXP: 21 } }
 *   ]
 * };
 *
 * const xp = getCurrentUserAdjustedXP(quest, 'user-123');
 * // Returns: 21 (adjusted XP with perk bonus)
 *
 * const xp2 = getCurrentUserAdjustedXP(quest, 'user-456');
 * // Returns: 15 (base XP, user not found in participants)
 * ```
 */
export function getCurrentUserAdjustedXP(
  quest: QuestWithReward,
  currentUserId?: string
): number {
  // Early return if no participants data
  console.log(
    '[getCurrentUserAdjustedXP] Quest participants:',
    quest.participants
  );
  console.log('[getCurrentUserAdjustedXP] Quest reward:', quest.reward);
  console.log('[getCurrentUserAdjustedXP] Current user ID:', currentUserId);
  if (!quest.participants || quest.participants.length === 0) {
    return quest.reward.xp;
  }

  // Early return if no current user ID
  if (!currentUserId) {
    return quest.reward.xp;
  }

  // Find the current user in the participants array
  // Note: userId can be either a string or a populated user object with an 'id' field
  const currentParticipant = quest.participants.find((p) => {
    const participantUserId =
      typeof p.userId === 'string' ? p.userId : (p.userId as any)?.id;
    return participantUserId === currentUserId;
  });

  console.log('[getCurrentUserAdjustedXP] Found participant:', currentParticipant);

  // Return adjusted XP if available, otherwise fall back to base XP
  if (currentParticipant?.rewards?.adjustedXP !== undefined) {
    return currentParticipant.rewards.adjustedXP;
  }

  return quest.reward.xp;
}
