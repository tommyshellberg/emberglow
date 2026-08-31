import { fireEvent } from '@testing-library/react-native';

import { HOLDOUT_MIN_MINUTES } from '@/app/utils/quest-utils';
import { render, screen, waitFor } from '@/lib/test-utils';
import { useQuestStore } from '@/store/quest-store';

import HoldoutQuestScreen from './holdout-quest';

// mock QuestTimer so no background service starts
jest.mock('@/lib/services/quest-timer', () => ({
  __esModule: true,
  default: { prepareQuest: jest.fn().mockResolvedValue(undefined) },
}));

describe('HoldoutQuestScreen', () => {
  it('prepares a holdout quest at the configured minimum and zero upfront XP', async () => {
    render(<HoldoutQuestScreen />);
    fireEvent.press(screen.getByText('Start Holding Out'));

    await waitFor(() => {
      const pending = useQuestStore.getState().pendingQuest;
      expect(pending).toMatchObject({
        mode: 'holdout',
        // __DEV__ is true under jest, so this is the 2-minute dev minimum.
        durationMinutes: HOLDOUT_MIN_MINUTES,
        reward: { xp: 0 },
        title: 'Hold Out',
      });
      expect(pending?.category).toBeTruthy();
    });
  });

  it('explains the reward curve on the rate meter', () => {
    render(<HoldoutQuestScreen />);

    expect(screen.getByTestId('holdout-rate-meter')).toBeOnTheScreen();
    expect(screen.getByText('3 XP/min · first hour')).toBeOnTheScreen();
    expect(screen.getByText('then 1 XP/min · up to 4 h')).toBeOnTheScreen();
    expect(screen.getByText('360 XP max')).toBeOnTheScreen();
  });

  it('states the unlock rule with the configured minimum', () => {
    render(<HoldoutQuestScreen />);

    // __DEV__ minimum is 2; production copy reads "10 minutes".
    expect(
      screen.getByText(
        `Unlock after ${HOLDOUT_MIN_MINUTES} minutes to collect your reward.`
      )
    ).toBeOnTheScreen();
    expect(
      screen.getByText('Any earlier and the quest fails.')
    ).toBeOnTheScreen();
  });
});
