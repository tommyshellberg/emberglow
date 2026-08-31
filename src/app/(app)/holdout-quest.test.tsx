import { fireEvent } from '@testing-library/react-native';

import { render, screen, waitFor } from '@/lib/test-utils';
import { useQuestStore } from '@/store/quest-store';

import HoldoutQuestScreen from './holdout-quest';

// mock QuestTimer so no background service starts
jest.mock('@/lib/services/quest-timer', () => ({
  __esModule: true,
  default: { prepareQuest: jest.fn().mockResolvedValue(undefined) },
}));

describe('HoldoutQuestScreen', () => {
  it('prepares a holdout quest with the 10-minute minimum and zero upfront XP', async () => {
    render(<HoldoutQuestScreen />);
    fireEvent.press(screen.getByText('Start Holding Out'));

    await waitFor(() => {
      const pending = useQuestStore.getState().pendingQuest;
      expect(pending).toMatchObject({
        mode: 'holdout',
        durationMinutes: 10,
        reward: { xp: 0 },
        title: 'Hold Out',
      });
      expect(pending?.category).toBeTruthy();
    });
  });
});
