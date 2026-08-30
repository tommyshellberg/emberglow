import { getQuestDuration, calculateRewardFromDuration } from '../quest-utils';

describe('Quest Utilities', () => {
  describe('getQuestDuration', () => {
    test('returns 0 for invalid quest numbers', () => {
      expect(getQuestDuration(0)).toBe(0);
      expect(getQuestDuration(-1)).toBe(0);
      expect(getQuestDuration(61)).toBe(0);
    });

    test('calculates quest durations for levels 1-5', () => {
      expect(getQuestDuration(1)).toBe(3); // 2 + 1 = 3
      expect(getQuestDuration(2)).toBe(4); // 2 + 2 = 4
      expect(getQuestDuration(3)).toBe(5); // 2 + 3 = 5
      expect(getQuestDuration(4)).toBe(6); // 2 + 4 = 6
    });

    test('calculates quest durations for levels 6-56', () => {
      // Test beginning of range
      expect(getQuestDuration(6)).toBe(8); // start value
      expect(getQuestDuration(7)).toBe(10); // 8 + (7-6)*1.64 ≈ 9.64, rounds to 10

      // Test middle of range
      expect(getQuestDuration(30)).toBe(47); // 8 + (30-6)*1.64 ≈ 47.36, rounds to 47

      // Test end of range
      expect(getQuestDuration(55)).toBe(88); // 8 + (55-6)*1.64 ≈ 88.44, rounds to 88
      expect(getQuestDuration(56)).toBe(90); // end value
    });

    test('calculates quest durations for plateau levels 57-59', () => {
      expect(getQuestDuration(57)).toBe(90);
      expect(getQuestDuration(58)).toBe(90);
      expect(getQuestDuration(59)).toBe(90);
    });

    test('calculates quest duration for final level 60', () => {
      expect(getQuestDuration(60)).toBe(120);
    });

    test('follows expected progression pattern', () => {
      // Verify that durations increase monotonically
      let prevDuration = 0;
      for (let i = 1; i <= 60; i++) {
        const currentDuration = getQuestDuration(i);
        expect(currentDuration).toBeGreaterThanOrEqual(prevDuration);
        prevDuration = currentDuration;
      }
    });
  });

  describe('calculateRewardFromDuration', () => {
    test('calculates reward correctly', () => {
      expect(calculateRewardFromDuration(10)).toBe(30);
      expect(calculateRewardFromDuration(30)).toBe(90);
      expect(calculateRewardFromDuration(60)).toBe(180);
    });

    test('handles zero and negative durations', () => {
      expect(calculateRewardFromDuration(0)).toBe(0);
      expect(calculateRewardFromDuration(-5)).toBe(-15); // May want to handle negatives differently
    });
  });
});

import {
  calculateHoldoutXP,
  clampHoldoutMinutes,
  HOLDOUT_CAP_MINUTES,
  HOLDOUT_MIN_MINUTES,
} from '../quest-utils';

describe('holdout curve', () => {
  it('exposes the spec constants', () => {
    expect(HOLDOUT_MIN_MINUTES).toBe(10);
    expect(HOLDOUT_CAP_MINUTES).toBe(240);
  });

  it('pays 3 XP/min through minute 60, then 1 XP/min through 240', () => {
    expect(calculateHoldoutXP(10)).toBe(30);
    expect(calculateHoldoutXP(60)).toBe(180);
    expect(calculateHoldoutXP(61)).toBe(181);
    expect(calculateHoldoutXP(90)).toBe(210);
    expect(calculateHoldoutXP(240)).toBe(360);
  });

  it('caps at 240 minutes and floors fractions', () => {
    expect(calculateHoldoutXP(1000)).toBe(360);
    expect(calculateHoldoutXP(10.9)).toBe(30);
    expect(clampHoldoutMinutes(90.7)).toBe(90);
    expect(clampHoldoutMinutes(500)).toBe(240);
  });
});
