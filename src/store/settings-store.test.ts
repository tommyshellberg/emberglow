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
              onboardingSoundEnabled: false,
            },
            version: 1,
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
    expect(store!.getState().onboardingSoundEnabled).toBe(false);
  });

  it('drops the legacy streakWarning key when rehydrating a v0 blob', async () => {
    // Non-default values on purpose: a migrate that discards the blob and
    // falls back to fresh defaults would pass a test built from defaults.
    (getItem as jest.Mock).mockImplementation((name: string) =>
      name === STORAGE_KEY
        ? JSON.stringify({
            state: {
              dailyReminder: { enabled: true, time: { hour: 9, minute: 0 } },
              streakWarning: { enabled: false, time: { hour: 20, minute: 0 } },
              nudges: { enabled: false },
            },
            version: 0,
          })
        : null
    );

    await useSettingsStore.persist.rehydrate();

    const state = useSettingsStore.getState() as Record<string, unknown>;
    expect(state.streakWarning).toBeUndefined();
    expect(state.nudges).toEqual({ enabled: false });
    expect(state.dailyReminder).toEqual({
      enabled: true,
      time: { hour: 9, minute: 0 },
    });

    // A migrated rehydrate writes the state back at the bumped version.
    const written = JSON.parse(
      (setItem as jest.Mock).mock.calls.at(-1)![1] as string
    );
    expect(written.version).toBe(1);
  });

  // zustand's persist middleware only calls migrate() when the stored
  // version differs from the current version, so version 1 never reaches it
  // through a normal rehydrate. Calling the migrate function directly is the
  // only way to prove the `< 1` boundary (not `<= 1`): at exactly version 1,
  // a persisted streakWarning key (however it got there) must survive.
  it('migrate leaves an already-v1 blob alone (boundary is < 1, not <= 1)', () => {
    const migrate = useSettingsStore.persist.getOptions().migrate!;

    const migrated = migrate(
      { streakWarning: { enabled: true, time: { hour: 7, minute: 30 } } },
      1
    ) as Record<string, unknown>;

    expect(migrated.streakWarning).toEqual({
      enabled: true,
      time: { hour: 7, minute: 30 },
    });
  });

  // A blob persisted before the `version` option existed has no version
  // field at all, so `version` is `undefined` at migrate time. `undefined < 1`
  // is `false`, so a naive `version < 1` guard treats that blob as already
  // migrated and leaves the legacy streakWarning key in place.
  it('migrate drops streakWarning from a blob with no version field', () => {
    const migrate = useSettingsStore.persist.getOptions().migrate!;

    const migrated = migrate(
      { streakWarning: { enabled: false, time: { hour: 20, minute: 0 } } },
      undefined as unknown as number
    ) as Record<string, unknown>;

    expect(migrated.streakWarning).toBeUndefined();
  });
});
