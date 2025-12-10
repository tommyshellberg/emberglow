import type { QuestParticipant } from '@/store/types';

import { getCurrentUserAdjustedXP } from './quest-utils';

describe('getCurrentUserAdjustedXP', () => {
  const baseQuest = {
    reward: { xp: 15 },
  };

  const questWithParticipants = {
    reward: { xp: 15 },
    participants: [
      {
        userId: 'user-123',
        ready: true,
        status: 'completed',
        rewards: {
          baseXP: 15,
          adjustedXP: 21, // 15 * 1.4 multiplier from alchemist perk
          multiplier: 1.4,
          perksApplied: ['alchemist-household-perk'],
        },
      },
      {
        userId: 'user-456',
        ready: true,
        status: 'completed',
        rewards: {
          baseXP: 15,
          adjustedXP: 18, // 15 * 1.2 multiplier from different perk
          multiplier: 1.2,
          perksApplied: ['bard-social-perk'],
        },
      },
    ] as QuestParticipant[],
  };

  describe('when quest has no participants', () => {
    it('should return base XP', () => {
      const result = getCurrentUserAdjustedXP(baseQuest, 'user-123');
      expect(result).toBe(15);
    });
  });

  describe('when quest has empty participants array', () => {
    it('should return base XP', () => {
      const quest = { ...baseQuest, participants: [] };
      const result = getCurrentUserAdjustedXP(quest, 'user-123');
      expect(result).toBe(15);
    });
  });

  describe('when no user ID is provided', () => {
    it('should return base XP', () => {
      const result = getCurrentUserAdjustedXP(questWithParticipants, undefined);
      expect(result).toBe(15);
    });

    it('should return base XP when empty string', () => {
      const result = getCurrentUserAdjustedXP(questWithParticipants, '');
      expect(result).toBe(15);
    });
  });

  describe('when user is found in participants', () => {
    it('should return adjusted XP for first user', () => {
      const result = getCurrentUserAdjustedXP(questWithParticipants, 'user-123');
      expect(result).toBe(21);
    });

    it('should return adjusted XP for second user', () => {
      const result = getCurrentUserAdjustedXP(questWithParticipants, 'user-456');
      expect(result).toBe(18);
    });
  });

  describe('when user is not found in participants', () => {
    it('should return base XP', () => {
      const result = getCurrentUserAdjustedXP(
        questWithParticipants,
        'user-999-not-found'
      );
      expect(result).toBe(15);
    });
  });

  describe('when participant has no rewards', () => {
    it('should return base XP', () => {
      const questWithNoRewards = {
        reward: { xp: 20 },
        participants: [
          {
            userId: 'user-123',
            ready: true,
            status: 'completed',
            // No rewards field
          },
        ] as QuestParticipant[],
      };

      const result = getCurrentUserAdjustedXP(questWithNoRewards, 'user-123');
      expect(result).toBe(20);
    });
  });

  describe('when participant has rewards but no adjustedXP', () => {
    it('should return base XP', () => {
      const questWithIncompleteRewards = {
        reward: { xp: 20 },
        participants: [
          {
            userId: 'user-123',
            ready: true,
            status: 'completed',
            rewards: {
              baseXP: 20,
              // adjustedXP is missing
              multiplier: 1.0,
              perksApplied: [],
            },
          },
        ] as any, // Using any to allow partial rewards object
      };

      const result = getCurrentUserAdjustedXP(
        questWithIncompleteRewards,
        'user-123'
      );
      expect(result).toBe(20);
    });
  });

  describe('when adjustedXP is 0', () => {
    it('should return 0 (valid adjusted XP)', () => {
      const questWithZeroXP = {
        reward: { xp: 10 },
        participants: [
          {
            userId: 'user-123',
            ready: true,
            status: 'completed',
            rewards: {
              baseXP: 10,
              adjustedXP: 0, // Edge case: 0 is a valid value
              multiplier: 0,
              perksApplied: [],
            },
          },
        ] as QuestParticipant[],
      };

      const result = getCurrentUserAdjustedXP(questWithZeroXP, 'user-123');
      expect(result).toBe(0);
    });
  });

  describe('edge cases with large multipliers', () => {
    it('should handle large adjusted XP values', () => {
      const questWithLargeMultiplier = {
        reward: { xp: 100 },
        participants: [
          {
            userId: 'user-123',
            ready: true,
            status: 'completed',
            rewards: {
              baseXP: 100,
              adjustedXP: 250, // 100 * 2.5 multiplier
              multiplier: 2.5,
              perksApplied: ['mega-perk'],
            },
          },
        ] as QuestParticipant[],
      };

      const result = getCurrentUserAdjustedXP(questWithLargeMultiplier, 'user-123');
      expect(result).toBe(250);
    });
  });

  describe('populated userId field (Mongoose .populate())', () => {
    it('should handle userId as populated user object with id field', () => {
      const questWithPopulatedUserId = {
        reward: { xp: 15 },
        participants: [
          {
            // userId is populated with full user object instead of string
            userId: {
              id: 'user-123',
              email: 'test@example.com',
              name: 'Test User',
            } as any,
            ready: true,
            status: 'completed',
            rewards: {
              baseXP: 15,
              adjustedXP: 21,
              multiplier: 1.4,
              perksApplied: ['alchemist-household-perk'],
            },
          },
        ] as any,
      };

      const result = getCurrentUserAdjustedXP(questWithPopulatedUserId, 'user-123');
      expect(result).toBe(21);
    });

    it('should handle mixed populated and string userIds', () => {
      const questWithMixedUserIds = {
        reward: { xp: 15 },
        participants: [
          {
            userId: 'user-456', // String userId
            ready: true,
            status: 'completed',
            rewards: {
              baseXP: 15,
              adjustedXP: 18,
              multiplier: 1.2,
              perksApplied: ['perk-1'],
            },
          },
          {
            userId: {
              // Populated userId
              id: 'user-123',
              email: 'test@example.com',
            } as any,
            ready: true,
            status: 'completed',
            rewards: {
              baseXP: 15,
              adjustedXP: 21,
              multiplier: 1.4,
              perksApplied: ['perk-2'],
            },
          },
        ] as any,
      };

      // Find user with string userId
      const result1 = getCurrentUserAdjustedXP(questWithMixedUserIds, 'user-456');
      expect(result1).toBe(18);

      // Find user with populated userId
      const result2 = getCurrentUserAdjustedXP(questWithMixedUserIds, 'user-123');
      expect(result2).toBe(21);
    });
  });
});
