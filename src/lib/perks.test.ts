import {
  calculatePerkBonuses,
  getPerkIcon,
  getPerkName,
  PERK_DATA,
} from './perks';
import { PERK_ICON_MAP } from '@/components/skill-tree/perk-icon';

describe('perks utilities', () => {
  describe('getPerkName', () => {
    it('returns correct name for known perk', () => {
      expect(getPerkName('quick_break')).toBe('Quick Break');
      expect(getPerkName('endurance_focus')).toBe('Endurance Focus');
    });

    it('formats unknown perk ID into readable name', () => {
      expect(getPerkName('unknown_perk_test')).toBe('Unknown Perk Test');
    });
  });

  describe('getPerkIcon', () => {
    it('returns correct icon for known perk', () => {
      expect(getPerkIcon('quick_break')).toBe('zap');
      expect(getPerkIcon('endurance_focus')).toBe('dumbbell');
    });

    it('returns circle as fallback for unknown perk', () => {
      expect(getPerkIcon('unknown_perk')).toBe('circle');
    });
  });

  describe('calculatePerkBonuses', () => {
    test('calculatePerkBonuses splits XP proportionally using server-aligned values', () => {
      // baseXP=100, +Quick Break (0.10) + Endurance Focus (0.15) = total 0.25 bonus = 125
      const result = calculatePerkBonuses(100, 125, [
        'quick_break',
        'endurance_focus',
      ]);
      // 0.10 / 0.25 * 25 = 10 → quick_break: 10
      // remainder for endurance_focus: 15
      expect(result).toEqual([
        { id: 'quick_break', name: 'Quick Break', bonusXP: 10, icon: 'zap' },
        {
          id: 'endurance_focus',
          name: 'Endurance Focus',
          bonusXP: 15,
          icon: 'dumbbell',
        },
      ]);
    });

    test('proportional split discriminates server-aligned values from the prior inflated table', () => {
      // Three perks whose *integer* split diverges between old and new value tables.
      // baseXP=100, adjustedXP=160 (total bonus 60).
      // New values: quick_break=0.10, endurance_focus=0.15, streak_master=0.35
      //   ratios sum to 0.60. Splits: floor(0.10/0.60*60)=10, floor(0.15/0.60*60)=15, remainder=35.
      // Old values would have been: 0.35, 0.50, 0.50 — sum 1.35.
      //   Splits: floor(0.35/1.35*60)=15, floor(0.50/1.35*60)=22, remainder=23.
      // [10, 15, 35] vs [15, 22, 23] — different. This test fails on the old table.
      const result = calculatePerkBonuses(100, 160, [
        'quick_break',
        'endurance_focus',
        'streak_master',
      ]);
      expect(result).toEqual([
        { id: 'quick_break', name: 'Quick Break', bonusXP: 10, icon: 'zap' },
        {
          id: 'endurance_focus',
          name: 'Endurance Focus',
          bonusXP: 15,
          icon: 'dumbbell',
        },
        {
          id: 'streak_master',
          name: 'Streak Master',
          bonusXP: 35,
          icon: 'flame',
        },
      ]);
    });

    it('returns empty array when no bonus XP', () => {
      const result = calculatePerkBonuses(100, 100, ['quick_break']);
      expect(result).toEqual([]);
    });

    it('returns empty array when no perks applied', () => {
      const result = calculatePerkBonuses(100, 150, []);
      expect(result).toEqual([]);
    });

    it('filters out duration-only perks with value 0', () => {
      // quick_start has value 0 (duration perk), should be filtered
      const result = calculatePerkBonuses(100, 130, [
        'quick_start',
        'endurance_focus',
      ]);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('endurance_focus');
      expect(result[0].bonusXP).toBe(30);
    });

    it('handles single perk correctly', () => {
      const result = calculatePerkBonuses(100, 120, ['quick_break']);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        id: 'quick_break',
        name: 'Quick Break',
        bonusXP: 20,
        icon: 'zap',
      });
    });

    it('handles unknown perks with default 10% value', () => {
      const result = calculatePerkBonuses(100, 110, ['unknown_perk']);

      expect(result).toHaveLength(1);
      expect(result[0].bonusXP).toBe(10);
      expect(result[0].name).toBe('Unknown Perk');
      expect(result[0].icon).toBe('circle');
    });

    it('ensures sum of bonuses equals total bonus XP', () => {
      // Test with multiple perks to verify rounding doesn't lose XP
      const result = calculatePerkBonuses(45, 92, [
        'quick_break',
        'endurance_focus',
        'streak_master',
      ]);

      const totalBonus = result.reduce((sum, p) => sum + p.bonusXP, 0);
      expect(totalBonus).toBe(47); // 92 - 45
    });
  });

  describe('PERK_DATA', () => {
    it('has all expected perks defined', () => {
      const expectedPerks = [
        'streak_master',
        'quick_break',
        'endurance_focus',
        'morning_ritual',
      ];

      expectedPerks.forEach((perkId) => {
        expect(PERK_DATA[perkId]).toBeDefined();
        expect(PERK_DATA[perkId].name).toBeTruthy();
        expect(PERK_DATA[perkId].icon).toBeTruthy();
        expect(typeof PERK_DATA[perkId].value).toBe('number');
      });
    });
  });

  describe('PERK_ICON_MAP', () => {
    it('has an icon for every perk in PERK_DATA', () => {
      const perksWithoutIcons = Object.keys(PERK_DATA).filter(
        (perkId) => !PERK_ICON_MAP[perkId]
      );

      expect(perksWithoutIcons).toEqual([]);
    });

    it('does not have orphaned entries (icons without corresponding PERK_DATA)', () => {
      const orphanedIcons = Object.keys(PERK_ICON_MAP).filter(
        (perkId) => !PERK_DATA[perkId]
      );

      expect(orphanedIcons).toEqual([]);
    });
  });
});
