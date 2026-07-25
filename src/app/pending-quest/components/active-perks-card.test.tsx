import React from 'react';

import { render } from '@/lib/test-utils';
import { useSkillTreeStore } from '@/store/skill-tree-store';

import { ActivePerksCard } from './active-perks-card';

// Mock PerkIcon — same pattern as compact-reward-breakdown.test.tsx and
// perk-card.test.tsx — to avoid SVG/image loading issues in tests.
jest.mock('@/components/skill-tree/perk-icon', () => ({
  PerkIcon: ({ perkId }: { perkId: string }) => {
    const { View, Text } = require('react-native');
    return (
      <View testID={`perk-icon-${perkId}`}>
        <Text>{perkId}</Text>
      </View>
    );
  },
}));

const baseParticipant = {
  userId: 'test-user-id',
  baseXP: 20,
  adjustedXP: 28,
  multiplier: 1.4,
  perksApplied: ['quick_break', 'endurance_focus'],
};

describe('ActivePerksCard', () => {
  beforeEach(() => {
    useSkillTreeStore.setState({ skillTreeData: null });
  });

  it('renders the "Active perks" card header', () => {
    const { getByText } = render(<ActivePerksCard />);

    expect(getByText('Active perks')).toBeTruthy();
  });

  describe('Empty state', () => {
    it('shows the empty-state line when there is no participant', () => {
      const { getByText } = render(<ActivePerksCard />);

      expect(
        getByText('No active perks yet. Unlock perks in the skill tree.')
      ).toBeTruthy();
    });

    it('shows the empty-state line when the participant applied no perks', () => {
      const { getByText } = render(
        <ActivePerksCard
          participant={{ ...baseParticipant, perksApplied: [] }}
        />
      );

      expect(
        getByText('No active perks yet. Unlock perks in the skill tree.')
      ).toBeTruthy();
    });
  });

  describe('Perk rows', () => {
    it('renders one row per applied perk with its display name and icon', () => {
      const { getByText, getByTestId } = render(
        <ActivePerksCard participant={baseParticipant} />
      );

      expect(getByText('Quick Break')).toBeTruthy();
      expect(getByTestId('perk-icon-quick_break')).toBeTruthy();
      expect(getByText('Endurance Focus')).toBeTruthy();
      expect(getByTestId('perk-icon-endurance_focus')).toBeTruthy();
    });

    it('does not render the empty-state line when perks are applied', () => {
      const { queryByText } = render(
        <ActivePerksCard participant={baseParticipant} />
      );

      expect(
        queryByText('No active perks yet. Unlock perks in the skill tree.')
      ).toBeNull();
    });

    it('uses the skill-tree perk description as the effect line when available', () => {
      useSkillTreeStore.setState({
        skillTreeData: {
          currentLevel: 5,
          characterType: 'knight',
          unlockedNodes: [],
          canRespec: false,
          respecsUsed: 0,
          lastRespecAt: null,
          availablePerks: [
            {
              id: 'quick_break',
              name: 'Quick Break',
              description: 'Take breaks without breaking your streak.',
              levelRequired: 1,
              category: 'universal',
              isUnlocked: true,
              isChoice: false,
            },
          ],
        },
      });

      const { getByText } = render(
        <ActivePerksCard
          participant={{ ...baseParticipant, perksApplied: ['quick_break'] }}
        />
      );

      expect(
        getByText('Take breaks without breaking your streak.')
      ).toBeTruthy();
    });

    it('falls back to the calculated per-quest XP bonus when no description is available', () => {
      // calculatePerkBonuses(20, 28, ['quick_break', 'endurance_focus']):
      // totalBonusXP = 8, values 0.1 / 0.15 of totalValue 0.25 ->
      // quick_break floor((0.1/0.25)*8) = 3, endurance_focus (last) gets
      // the 5 XP remainder.
      const { getByText } = render(
        <ActivePerksCard participant={baseParticipant} />
      );

      expect(getByText('+3 XP on this quest')).toBeTruthy();
      expect(getByText('+5 XP on this quest')).toBeTruthy();
    });

    it('falls back to the perk value percentage when there is no description or XP bonus', () => {
      const { getByText } = render(
        <ActivePerksCard
          participant={{
            ...baseParticipant,
            adjustedXP: baseParticipant.baseXP, // no bonus to split
            perksApplied: ['quick_break'],
          }}
        />
      );

      // PERK_DATA.quick_break.value === 0.1
      expect(getByText('+10% XP')).toBeTruthy();
    });

    it('separates rows with a hairline border, omitted on the last row', () => {
      const { getByTestId } = render(
        <ActivePerksCard participant={baseParticipant} />
      );

      expect(getByTestId('active-perk-row-quick_break')).toHaveStyle({
        borderBottomWidth: 1,
      });
      expect(getByTestId('active-perk-row-endurance_focus')).not.toHaveStyle({
        borderBottomWidth: 1,
      });
    });
  });
});
