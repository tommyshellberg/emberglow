import { useSettingsStore } from './settings-store';

describe('settings-store narratorVoice', () => {
  beforeEach(() => {
    useSettingsStore.setState({ narratorVoice: null });
  });

  it('defaults narratorVoice to null (never explicitly chosen)', () => {
    expect(useSettingsStore.getState().narratorVoice).toBeNull();
  });

  it('setNarratorVoice stores an explicit voice', () => {
    useSettingsStore.getState().setNarratorVoice('female');
    expect(useSettingsStore.getState().narratorVoice).toBe('female');
  });
});
