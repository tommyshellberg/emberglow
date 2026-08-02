import { useSettingsStore } from './settings-store';

describe('settings-store narratorVoice', () => {
  beforeEach(() => {
    useSettingsStore.setState(useSettingsStore.getInitialState());
  });

  it('defaults narratorVoice to null (never explicitly chosen)', () => {
    expect(useSettingsStore.getState().narratorVoice).toBeNull();
  });

  it('setNarratorVoice stores an explicit voice', () => {
    useSettingsStore.getState().setNarratorVoice('female');
    expect(useSettingsStore.getState().narratorVoice).toBe('female');
  });
});

describe('settings-store onboardingSoundEnabled', () => {
  beforeEach(() => {
    useSettingsStore.setState(useSettingsStore.getInitialState());
  });

  it('defaults onboardingSoundEnabled to true', () => {
    expect(useSettingsStore.getState().onboardingSoundEnabled).toBe(true);
  });

  it('setOnboardingSoundEnabled stores an explicit choice', () => {
    useSettingsStore.getState().setOnboardingSoundEnabled(false);
    expect(useSettingsStore.getState().onboardingSoundEnabled).toBe(false);
  });
});

describe('settings-store reminder prompt tracking', () => {
  beforeEach(() => {
    useSettingsStore.setState({ reminderPromptedAt: null });
  });

  it('defaults reminderPromptedAt to null', () => {
    expect(useSettingsStore.getState().reminderPromptedAt).toBeNull();
  });

  it('setReminderPromptedAt stores the timestamp', () => {
    useSettingsStore.getState().setReminderPromptedAt(1754000000000);
    expect(useSettingsStore.getState().reminderPromptedAt).toBe(1754000000000);
  });
});
