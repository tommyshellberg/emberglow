import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import type { QuestRewardPreviewParticipant } from '@/api/quest-runs/types';
import { PerkIcon } from '@/components/skill-tree/perk-icon';
import { calculatePerkBonuses, getPerkName, PERK_DATA } from '@/lib/perks';
import { useSkillTreeStore } from '@/store/skill-tree-store';
import { colors, fontFamily, radii, shadows, spacing, text } from '@/theme';

const CARD_PADDING = 18;
const ICON_SIZE = 24;
const NAME_FONT_SIZE = 15;
const EFFECT_FONT_SIZE = 13.5;
const HEADER_LABEL = 'Active perks';
const EMPTY_STATE_COPY = 'No active perks yet. Unlock perks in the skill tree.';

export type ActivePerksCardProps = {
  /** The signed-in user's slice of the quest reward preview, if loaded. */
  participant?: QuestRewardPreviewParticipant;
};

/**
 * Resolves the one-line effect description for a perk row, in priority
 * order: the skill tree's own perk copy (richest, hand-written), the
 * per-quest XP bonus this preview calculated for the perk, then the perk's
 * static XP-multiplier value as a last resort (e.g. before a reward preview
 * has loaded any bonus split to calculate from).
 */
function resolveEffectLine(
  perkId: string,
  bonusXP: number | undefined,
  description: string | undefined
): string {
  if (description) {
    return description;
  }

  if (bonusXP && bonusXP > 0) {
    return `+${bonusXP} XP on this quest`;
  }

  const value = PERK_DATA[perkId]?.value ?? 0;
  return `+${Math.round(value * 100)}% XP`;
}

/**
 * Restores the "active perks" information the Emberglow pending-quest
 * redesign regressed — a list card of the perks applied to this quest's
 * reward preview, each with its icon, name, and a one-line effect.
 */
export function ActivePerksCard({ participant }: ActivePerksCardProps) {
  const getPerkById = useSkillTreeStore((state) => state.getPerkById);
  const perksApplied = participant?.perksApplied ?? [];
  const bonuses = participant
    ? calculatePerkBonuses(
        participant.baseXP,
        participant.adjustedXP,
        perksApplied
      )
    : [];

  return (
    <View style={styles.card}>
      <Text style={styles.header}>{HEADER_LABEL}</Text>
      {perksApplied.length === 0 ? (
        <Text style={styles.emptyText}>{EMPTY_STATE_COPY}</Text>
      ) : (
        perksApplied.map((perkId, index) => {
          const isLast = index === perksApplied.length - 1;
          const effectLine = resolveEffectLine(
            perkId,
            bonuses.find((bonus) => bonus.id === perkId)?.bonusXP,
            getPerkById(perkId)?.description
          );

          return (
            <View
              key={perkId}
              testID={`active-perk-row-${perkId}`}
              style={[styles.row, !isLast && styles.rowDivider]}
            >
              <PerkIcon perkId={perkId} isUnlocked size={ICON_SIZE} />
              <View style={styles.rowText}>
                <Text style={styles.perkName}>{getPerkName(perkId)}</Text>
                <Text style={styles.effectLine} numberOfLines={2}>
                  {effectLine}
                </Text>
              </View>
            </View>
          );
        })
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface.card,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border.hairline,
    padding: CARD_PADDING,
    ...shadows.card,
  },
  header: {
    ...text.eyebrow,
    color: colors.text.muted,
    marginBottom: spacing[3],
  },
  emptyText: {
    fontFamily: fontFamily.regular,
    fontSize: EFFECT_FONT_SIZE,
    lineHeight: EFFECT_FONT_SIZE * 1.5,
    color: colors.text.muted,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: spacing[3],
  },
  rowDivider: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border.hairline,
  },
  rowText: {
    flex: 1,
    gap: 2,
  },
  perkName: {
    fontFamily: fontFamily.semibold,
    fontSize: NAME_FONT_SIZE,
    color: colors.text.primary,
  },
  effectLine: {
    fontFamily: fontFamily.regular,
    fontSize: EFFECT_FONT_SIZE,
    color: colors.text.secondary,
  },
});
