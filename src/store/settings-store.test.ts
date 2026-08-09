import { getItem, setItem } from '@/lib/storage';

import { useSettingsStore } from './settings-store';

jest.mock('@/lib/storage', () => ({
  getItem: jest.fn(() => null),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

const STORAGE_KEY = 'unquest-settings';

const resetStore = () => {
  useSettingsStore.setState(useSettingsStore.getInitialState());
  jest.clearAllMocks();
  (getItem as jest.Mock).mockReturnValue(null);
};

describe('settings-store narratorVoice', () => {
  beforeEach(resetStore);

  it('defaults narratorVoice to null (never explicitly chosen)', () => {
    expect(useSettingsStore.getState().narratorVoice).toBeNull();
  });

  it('setNarratorVoice stores an explicit voice', () => {
    useSettingsStore.getState().setNarratorVoice('female');
    expect(useSettingsStore.getState().narratorVoice).toBe('female');
  });
});

describe('settings-store onboardingSoundEnabled', () => {
  beforeEach(resetStore);

  it('defaults onboardingSoundEnabled to true', () => {
    expect(useSettingsStore.getState().onboardingSoundEnabled).toBe(true);
  });

  it('setOnboardingSoundEnabled stores an explicit choice', () => {
    useSettingsStore.getState().setOnboardingSoundEnabled(false);
    expect(useSettingsStore.getState().onboardingSoundEnabled).toBe(false);
  });
});

// Every default below encodes a product decision. Pinning them exactly means
// changing one is a deliberate, visible act rather than a silent regression.
describe('settings-store notification defaults', () => {
  beforeEach(resetStore);

  it('leaves the daily reminder off until the user opts in', () => {
    // Defaulting this to true would schedule notifications for users who
    // never asked for them.
    expect(useSettingsStore.getState().dailyReminder).toEqual({
      enabled: false,
      time: null,
    });
  });

  it('ships the streak warning on, at 18:00', () => {
    // The fixed 18:00 send time is a known live problem — it fires while
    // evening questers are mid-quest (server issue #73). Whatever it becomes,
    // it must not change by accident.
    expect(useSettingsStore.getState().streakWarning).toEqual({
      enabled: true,
      time: { hour: 18, minute: 0 },
    });
  });

  it('has not yet prompted a fresh install for a reminder', () => {
    // Defaulting to true suppresses the prompt for every new user.
    expect(useSettingsStore.getState().hasBeenPromptedForReminder).toBe(false);
  });
});

describe('settings-store notification setters', () => {
  beforeEach(resetStore);

  it('setDailyReminder stores the chosen time', () => {
    const reminder = { enabled: true, time: { hour: 7, minute: 30 } };

    useSettingsStore.getState().setDailyReminder(reminder);

    expect(useSettingsStore.getState().dailyReminder).toEqual(reminder);
  });

  it('setStreakWarning stores the chosen time', () => {
    const warning = { enabled: false, time: { hour: 21, minute: 15 } };

    useSettingsStore.getState().setStreakWarning(warning);

    expect(useSettingsStore.getState().streakWarning).toEqual(warning);
  });

  it('setHasBeenPromptedForReminder records that the prompt was shown', () => {
    useSettingsStore.getState().setHasBeenPromptedForReminder(true);

    expect(useSettingsStore.getState().hasBeenPromptedForReminder).toBe(true);
  });
});

describe('settings-store persistence', () => {
  beforeEach(resetStore);

  it('writes settings under the pinned storage key', () => {
    useSettingsStore.getState().setNarratorVoice('female');

    expect(setItem).toHaveBeenCalledWith(STORAGE_KEY, expect.any(String));
    const written = JSON.parse(
      (setItem as jest.Mock).mock.calls.at(-1)![1] as string
    );
    expect(written.state.narratorVoice).toBe('female');
  });

  it('rehydrates settings written by a previous launch', () => {
    // Blanking the key orphans every existing user's settings on upgrade.
    (getItem as jest.Mock).mockImplementation((name: string) =>
      name === STORAGE_KEY
        ? JSON.stringify({
            state: {
              narratorVoice: 'female',
              streakWarning: { enabled: false, time: { hour: 9, minute: 0 } },
            },
            version: 0,
          })
        : null
    );

    let store: typeof useSettingsStore;
    jest.isolateModules(() => {
      store = require('./settings-store')
        .useSettingsStore as typeof useSettingsStore;
    });

    expect(getItem).toHaveBeenCalledWith(STORAGE_KEY);
    expect(store!.getState().narratorVoice).toBe('female');
    // A non-default value, so a mutant that discards the stored blob and
    // falls back to the initial state is visible here.
    expect(store!.getState().streakWarning).toEqual({
      enabled: false,
      time: { hour: 9, minute: 0 },
    });
  });
});
