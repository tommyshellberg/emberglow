/**
 * Perk metadata including display name, icon, and XP multiplier value
 */
interface PerkMetadata {
  name: string;
  icon: string;
  value: number; // XP multiplier (e.g., 0.2 = 20% bonus)
}

/**
 * Maps perk IDs to their metadata
 */
export const PERK_DATA: Record<string, PerkMetadata> = {
  // Universal perks (values match server /unquest-server/src/data/perks.js)
  quick_break: { name: 'Quick Break', icon: 'zap', value: 0.35 },
  morning_ritual: { name: 'Morning Ritual', icon: 'sunrise', value: 0.3 },
  endurance_focus: { name: 'Endurance Focus', icon: 'dumbbell', value: 0.5 },
  thoughtful_adventurer: { name: 'Thoughtful Adventurer', icon: 'brain', value: 0.25 },
  first_timer: { name: 'First Timer', icon: 'star', value: 0.5 },
  weekend_warrior: { name: 'Weekend Warrior', icon: 'sword', value: 0.4 },
  weekday_grind: { name: 'Weekday Grind', icon: 'calendar', value: 0.25 },
  quick_start: { name: 'Quick Start', icon: 'zap', value: 0.0 }, // Duration perk, no XP bonus
  streak_master: { name: 'Streak Master', icon: 'flame', value: 0.5 },
  streak_god: { name: 'Streak God', icon: 'flame', value: 1.0 },

  // Aliases (same icon, different unlock paths)
  quest_mastery_quick: { name: 'Quick Start', icon: 'zap', value: 0.0 },
  quest_mastery_endurance: { name: 'Endurance Focus', icon: 'dumbbell', value: 0.5 },

  // Alchemist perks
  alchemist_alchemical_precision: { name: 'Alchemical Precision', icon: 'flask-conical', value: 0.75 },
  alchemist_crafting_prowess: { name: 'Crafting Prowess', icon: 'hammer', value: 0.4 },
  alchemist_philosophers_focus: { name: "Philosopher's Focus", icon: 'clock', value: 1.0 },

  // Knight perks
  knight_warriors_might: { name: "Warrior's Might", icon: 'sword', value: 0.4 },
  knight_champions_endurance: { name: "Champion's Endurance", icon: 'medal', value: 0.6 },
  knight_tactical_discipline: { name: 'Tactical Discipline', icon: 'target', value: 0.6 },

  // Bard perks
  bard_charismatic_flair: { name: 'Charismatic Flair', icon: 'sparkles', value: 0.4 },
  bard_master_performer: { name: 'Master Performer', icon: 'mic', value: 0.75 },
  bard_inspiring_presence: { name: 'Inspiring Presence', icon: 'users', value: 0.5 },

  // Wizard perks
  wizard_scholars_mind: { name: "Scholar's Mind", icon: 'book', value: 0.4 },
  wizard_arcane_focus: { name: 'Arcane Focus', icon: 'wand', value: 0.75 },
  fire_path: { name: 'Fire Path', icon: 'flame', value: 0.5 },
  water_path: { name: 'Water Path', icon: 'droplet', value: 0.5 },

  // Scout perks
  scout_lone_wanderer: { name: 'Lone Wanderer', icon: 'compass', value: 0.4 },
  scout_survivalist: { name: 'Survivalist', icon: 'tent', value: 0.6 },
  scout_master_tracker: { name: 'Master Tracker', icon: 'binoculars', value: 0.75 },

  // Druid perks
  druid_natures_touch: { name: "Nature's Touch", icon: 'leaf', value: 0.4 },
  druid_vitality: { name: 'Vitality', icon: 'heart-pulse', value: 1.0 },
  druid_harmony: { name: 'Harmony', icon: 'yin-yang', value: 0.6 },
};

/**
 * Maps perk IDs to their display names
 * @deprecated Use PERK_DATA instead for full metadata
 */
export const PERK_NAMES: Record<string, string> = Object.fromEntries(
  Object.entries(PERK_DATA).map(([id, data]) => [id, data.name])
);

/**
 * Gets the display name for a perk ID
 * @param perkId - The perk identifier
 * @returns The display name, or the perkId formatted if not found
 */
export function getPerkName(perkId: string): string {
  if (PERK_DATA[perkId]) {
    return PERK_DATA[perkId].name;
  }

  // Fallback: format the ID into a readable name
  return perkId
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Gets the icon name for a perk ID
 * @param perkId - The perk identifier
 * @returns The icon name, or 'circle' as fallback
 */
export function getPerkIcon(perkId: string): string {
  return PERK_DATA[perkId]?.icon ?? 'circle';
}

/**
 * Represents a perk with its calculated bonus XP for display
 */
export interface PerkWithBonus {
  id: string;
  name: string;
  bonusXP: number;
  icon: string;
}

/**
 * Calculates the bonus XP for each perk applied to a quest.
 * Uses proportional distribution based on perk values to split the total bonus.
 *
 * @param baseXP - The base XP before any bonuses
 * @param adjustedXP - The final XP after all perk bonuses
 * @param perksApplied - Array of perk IDs that were applied
 * @returns Array of perks with their calculated bonus XP
 *
 * @example
 * ```typescript
 * const perks = calculatePerkBonuses(45, 68, ['quick_break', 'endurance_focus']);
 * // Returns:
 * // [
 * //   { id: 'quick_break', name: 'Quick Break', bonusXP: 9, icon: 'zap' },
 * //   { id: 'endurance_focus', name: 'Endurance Focus', bonusXP: 14, icon: 'dumbbell' }
 * // ]
 * ```
 */
export function calculatePerkBonuses(
  baseXP: number,
  adjustedXP: number,
  perksApplied: string[]
): PerkWithBonus[] {
  const totalBonusXP = adjustedXP - baseXP;

  // If no bonus or no perks, return empty array
  if (totalBonusXP <= 0 || perksApplied.length === 0) {
    return [];
  }

  // Calculate each perk's contribution based on its value
  const perksWithValues = perksApplied
    .map((perkId) => ({
      id: perkId,
      name: getPerkName(perkId),
      icon: getPerkIcon(perkId),
      value: PERK_DATA[perkId]?.value ?? 0.1, // Default 10% if unknown
    }))
    .filter((perk) => perk.value > 0); // Filter out duration-only perks (value = 0)

  // Calculate total value for proportional distribution
  const totalValue = perksWithValues.reduce((sum, perk) => sum + perk.value, 0);

  // Distribute bonus XP proportionally
  let remainingBonus = totalBonusXP;
  const result: PerkWithBonus[] = perksWithValues.map((perk, index) => {
    const isLast = index === perksWithValues.length - 1;
    // Last perk gets the remainder to avoid rounding issues
    const bonusXP = isLast
      ? remainingBonus
      : Math.floor((perk.value / totalValue) * totalBonusXP);
    remainingBonus -= bonusXP;

    return {
      id: perk.id,
      name: perk.name,
      bonusXP,
      icon: perk.icon,
    };
  });

  return result;
}
