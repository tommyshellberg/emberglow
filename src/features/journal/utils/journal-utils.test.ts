import type { QuestRun } from '@/api/quest/types';

import { transformQuestRun } from './journal-utils';

describe('transformQuestRun', () => {
  const mockQuestRun: QuestRun = {
    _id: 'run-123',
    id: 'run-123',
    status: 'completed',
    quest: {
      id: 'quest-1',
      customId: 'custom-1',
      title: 'Test Quest',
      durationMinutes: 10,
      reward: { xp: 15 },
      mode: 'custom',
      category: 'household',
    },
    participants: [
      {
        userId: 'user-123',
        ready: true,
        phoneLocked: true,
        status: 'completed',
        rewards: {
          baseXP: 15,
          adjustedXP: 21, // 15 * 1.4 multiplier
          multiplier: 1.4,
          perksApplied: ['alchemist-household-perk'],
        },
      },
    ],
    startedAt: '2025-01-01T12:00:00Z',
    completedAt: '2025-01-01T12:10:00Z',
    createdAt: '2025-01-01T12:00:00Z',
    updatedAt: '2025-01-01T12:10:00Z',
  };

  it('should include participants with rewards in transformed quest', () => {
    const result = transformQuestRun(mockQuestRun);

    expect(result).not.toBeNull();
    expect(result?.participants).toBeDefined();
    expect(result?.participants).toHaveLength(1);
    expect(result?.participants![0]).toEqual({
      userId: 'user-123',
      ready: true,
      phoneLocked: true,
      status: 'completed',
      rewards: {
        baseXP: 15,
        adjustedXP: 21,
        multiplier: 1.4,
        perksApplied: ['alchemist-household-perk'],
      },
    });
  });

  it('should transform all basic quest run fields correctly', () => {
    const result = transformQuestRun(mockQuestRun);

    expect(result).toMatchObject({
      id: 'quest-1',
      questRunId: 'run-123',
      customId: 'custom-1',
      title: 'Test Quest',
      mode: 'custom',
      durationMinutes: 10,
      reward: { xp: 15 },
      status: 'completed',
      category: 'household',
    });
  });

  it('should handle quest runs without participants', () => {
    const questRunWithoutParticipants: QuestRun = {
      ...mockQuestRun,
      participants: [],
    };

    const result = transformQuestRun(questRunWithoutParticipants);

    expect(result).not.toBeNull();
    expect(result?.participants).toEqual([]);
  });

  it('should return null for quest runs without valid stop time', () => {
    const questRunWithoutDates: QuestRun = {
      ...mockQuestRun,
      status: 'active', // Active quests don't have stop time
      completedAt: undefined,
      actualEndTime: undefined,
      scheduledEndTime: undefined,
    };

    const result = transformQuestRun(questRunWithoutDates);

    expect(result).toBeNull();
  });

  it('should preserve participant rewards for multiple participants', () => {
    const multiParticipantQuestRun: QuestRun = {
      ...mockQuestRun,
      participants: [
        {
          userId: 'user-1',
          ready: true,
          phoneLocked: true,
          status: 'completed',
          rewards: {
            baseXP: 15,
            adjustedXP: 21,
            multiplier: 1.4,
            perksApplied: ['perk-1'],
          },
        },
        {
          userId: 'user-2',
          ready: true,
          phoneLocked: true,
          status: 'completed',
          rewards: {
            baseXP: 15,
            adjustedXP: 18,
            multiplier: 1.2,
            perksApplied: ['perk-2'],
          },
        },
      ],
    };

    const result = transformQuestRun(multiParticipantQuestRun);

    expect(result).not.toBeNull();
    expect(result?.participants).toHaveLength(2);
    expect(result?.participants![0].rewards?.adjustedXP).toBe(21);
    expect(result?.participants![1].rewards?.adjustedXP).toBe(18);
  });
});
