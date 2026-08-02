import {
  type AnnouncementContext,
  getAnnouncementToShow,
  parseLegacyAnnouncementFlags,
  useAnnouncementStore,
} from './announcement-store';

const baseCtx: AnnouncementContext = {
  hasCompletedFirstBranch: false,
  isRegistered: false,
  completedQuestCount: 0,
  availablePerksCount: 0,
  dailyReminderEnabled: true,
  hasBeenPromptedForReminder: false,
  reminderPromptedAt: null,
};

const baseSeen = {
  hasSeenBranchingAnnouncement: false,
  hasSeenSkillTreeAnnouncement: false,
  hasSeenGuildsAnnouncement: false,
  hasSeenNarratorVoiceAnnouncement: false,
  hasSeenDailyReminderPrompt: true,
  lastAnnouncementShownAt: null,
};

// narratorVoice has no engagement precondition, so tests that isolate OTHER
// branches' gating must mark it seen or it wins by default.
const narratorSeen = {
  ...baseSeen,
  hasSeenNarratorVoiceAnnouncement: true,
};

describe('parseLegacyAnnouncementFlags', () => {
  it('returns all-false when the legacy blob is absent', () => {
    expect(parseLegacyAnnouncementFlags(null)).toEqual({
      hasSeenBranchingAnnouncement: false,
      hasSeenSkillTreeAnnouncement: false,
      hasSeenGuildsAnnouncement: false,
    });
  });

  it('reads flags from a double-encoded persist envelope (the real MMKV shape)', () => {
    // `@/lib/storage`.getItem JSON.parses the MMKV value once; because the
    // persist envelope is itself stored as a JSON string, what reaches this
    // helper is still a JSON string.
    const envelopeString = JSON.stringify({
      state: {
        hasSeenBranchingAnnouncement: true,
        hasSeenGuildsAnnouncement: true,
      },
      version: 0,
    });

    expect(parseLegacyAnnouncementFlags(envelopeString)).toEqual({
      hasSeenBranchingAnnouncement: true,
      hasSeenSkillTreeAnnouncement: false,
      hasSeenGuildsAnnouncement: true,
    });
  });

  it('reads flags from an already-parsed envelope object', () => {
    expect(
      parseLegacyAnnouncementFlags({
        state: { hasSeenSkillTreeAnnouncement: true },
        version: 0,
      })
    ).toEqual({
      hasSeenBranchingAnnouncement: false,
      hasSeenSkillTreeAnnouncement: true,
      hasSeenGuildsAnnouncement: false,
    });
  });

  it('returns all-false for malformed input rather than throwing', () => {
    expect(parseLegacyAnnouncementFlags('not json{')).toEqual({
      hasSeenBranchingAnnouncement: false,
      hasSeenSkillTreeAnnouncement: false,
      hasSeenGuildsAnnouncement: false,
    });
  });
});

describe('useAnnouncementStore', () => {
  beforeEach(() => {
    useAnnouncementStore.setState({ ...baseSeen });
  });

  it('defaults all seen flags to false with no shown timestamp', () => {
    const state = useAnnouncementStore.getState();
    expect(state.hasSeenBranchingAnnouncement).toBe(false);
    expect(state.hasSeenSkillTreeAnnouncement).toBe(false);
    expect(state.hasSeenGuildsAnnouncement).toBe(false);
    expect(state.hasSeenNarratorVoiceAnnouncement).toBe(false);
    expect(state.lastAnnouncementShownAt).toBeNull();
  });

  it('setHasSeenBranchingAnnouncement flips only the branching flag', () => {
    useAnnouncementStore.getState().setHasSeenBranchingAnnouncement(true);
    const state = useAnnouncementStore.getState();
    expect(state.hasSeenBranchingAnnouncement).toBe(true);
    expect(state.hasSeenSkillTreeAnnouncement).toBe(false);
    expect(state.hasSeenGuildsAnnouncement).toBe(false);
  });

  it('setHasSeenSkillTreeAnnouncement flips only the skill-tree flag', () => {
    useAnnouncementStore.getState().setHasSeenSkillTreeAnnouncement(true);
    expect(useAnnouncementStore.getState().hasSeenSkillTreeAnnouncement).toBe(
      true
    );
  });

  it('setHasSeenGuildsAnnouncement flips only the guilds flag', () => {
    useAnnouncementStore.getState().setHasSeenGuildsAnnouncement(true);
    expect(useAnnouncementStore.getState().hasSeenGuildsAnnouncement).toBe(
      true
    );
  });

  it('setHasSeenNarratorVoiceAnnouncement flips only the narrator flag', () => {
    useAnnouncementStore.getState().setHasSeenNarratorVoiceAnnouncement(true);
    const state = useAnnouncementStore.getState();
    expect(state.hasSeenNarratorVoiceAnnouncement).toBe(true);
    expect(state.hasSeenBranchingAnnouncement).toBe(false);
    expect(state.hasSeenGuildsAnnouncement).toBe(false);
  });

  it('markAnnouncementShown stamps a numeric timestamp', () => {
    expect(useAnnouncementStore.getState().lastAnnouncementShownAt).toBeNull();
    useAnnouncementStore.getState().markAnnouncementShown();
    expect(typeof useAnnouncementStore.getState().lastAnnouncementShownAt).toBe(
      'number'
    );
  });

  it('exposes getAnnouncementToShow as a context-driven store method', () => {
    useAnnouncementStore.setState({ ...baseSeen });
    expect(
      useAnnouncementStore.getState().getAnnouncementToShow({
        ...baseCtx,
        hasCompletedFirstBranch: true,
      })
    ).toBe('branching');
  });
});

describe('getAnnouncementToShow (pure selector)', () => {
  // Local-time construction keeps toDateString() comparisons timezone-stable.
  const TODAY = new Date(2026, 6, 13, 9, 0, 0).getTime();
  const EARLIER_TODAY = new Date(2026, 6, 13, 1, 0, 0).getTime();
  const YESTERDAY = new Date(2026, 6, 12, 23, 0, 0).getTime();

  const allEligibleCtx: AnnouncementContext = {
    hasCompletedFirstBranch: true,
    isRegistered: true,
    completedQuestCount: 5,
    availablePerksCount: 3,
    dailyReminderEnabled: true,
    hasBeenPromptedForReminder: false,
    reminderPromptedAt: null,
  };

  it('returns null when nothing is eligible and narratorVoice was already seen', () => {
    expect(getAnnouncementToShow(narratorSeen, baseCtx, TODAY)).toBeNull();
  });

  it('returns branching when it is unseen and its precondition is met', () => {
    expect(
      getAnnouncementToShow(
        baseSeen,
        { ...baseCtx, hasCompletedFirstBranch: true },
        TODAY
      )
    ).toBe('branching');
  });

  it('gates skillTree behind registration', () => {
    expect(
      getAnnouncementToShow(
        narratorSeen,
        { ...baseCtx, availablePerksCount: 2 },
        TODAY
      )
    ).toBeNull();
    expect(
      getAnnouncementToShow(
        baseSeen,
        { ...baseCtx, isRegistered: true, availablePerksCount: 2 },
        TODAY
      )
    ).toBe('skillTree');
  });

  it('gates guilds behind registration and >= 3 completed quests', () => {
    expect(
      getAnnouncementToShow(
        narratorSeen,
        { ...baseCtx, isRegistered: true, completedQuestCount: 2 },
        TODAY
      )
    ).toBeNull();
    expect(
      getAnnouncementToShow(
        baseSeen,
        { ...baseCtx, isRegistered: true, completedQuestCount: 3 },
        TODAY
      )
    ).toBe('guilds');
  });

  it('prefers branching > skillTree > guilds when several are eligible', () => {
    expect(getAnnouncementToShow(baseSeen, allEligibleCtx, TODAY)).toBe(
      'branching'
    );
    expect(
      getAnnouncementToShow(
        { ...baseSeen, hasSeenBranchingAnnouncement: true },
        allEligibleCtx,
        TODAY
      )
    ).toBe('skillTree');
    expect(
      getAnnouncementToShow(
        {
          ...baseSeen,
          hasSeenBranchingAnnouncement: true,
          hasSeenSkillTreeAnnouncement: true,
        },
        allEligibleCtx,
        TODAY
      )
    ).toBe('guilds');
  });

  it('never returns an announcement the user has already seen', () => {
    expect(
      getAnnouncementToShow(
        { ...narratorSeen, hasSeenBranchingAnnouncement: true },
        { ...baseCtx, hasCompletedFirstBranch: true },
        TODAY
      )
    ).toBeNull();
  });

  it('caps at one announcement per calendar day', () => {
    expect(
      getAnnouncementToShow(
        { ...baseSeen, lastAnnouncementShownAt: EARLIER_TODAY },
        { ...baseCtx, hasCompletedFirstBranch: true },
        TODAY
      )
    ).toBeNull();
  });

  it('shows again on a later calendar day', () => {
    expect(
      getAnnouncementToShow(
        { ...baseSeen, lastAnnouncementShownAt: YESTERDAY },
        { ...baseCtx, hasCompletedFirstBranch: true },
        TODAY
      )
    ).toBe('branching');
  });

  it('returns narratorVoice for any unseen user — no engagement precondition', () => {
    // baseCtx is all-false/zero: not registered, no quests, no perks.
    expect(getAnnouncementToShow(baseSeen, baseCtx, TODAY)).toBe(
      'narratorVoice'
    );
  });

  it('checks narratorVoice LAST: a user eligible for guilds AND narratorVoice gets guilds today', () => {
    expect(
      getAnnouncementToShow(
        {
          ...baseSeen,
          hasSeenBranchingAnnouncement: true,
          hasSeenSkillTreeAnnouncement: true,
        },
        allEligibleCtx,
        TODAY
      )
    ).toBe('guilds');
  });

  it('narratorVoice respects the once-per-day cap', () => {
    expect(
      getAnnouncementToShow(
        { ...baseSeen, lastAnnouncementShownAt: EARLIER_TODAY },
        baseCtx,
        TODAY
      )
    ).toBeNull();
  });

  it('never re-shows narratorVoice once seen', () => {
    expect(getAnnouncementToShow(narratorSeen, baseCtx, TODAY)).toBeNull();
  });
});

describe('dailyReminder announcement eligibility', () => {
  const NOW = 1754000000000;
  const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;

  const unseenState = {
    hasSeenBranchingAnnouncement: false,
    hasSeenSkillTreeAnnouncement: true,
    hasSeenGuildsAnnouncement: true,
    hasSeenNarratorVoiceAnnouncement: true,
    hasSeenDailyReminderPrompt: false,
    lastAnnouncementShownAt: null,
  };

  const reminderCtx = {
    hasCompletedFirstBranch: false,
    isRegistered: true,
    completedQuestCount: 1,
    availablePerksCount: 0,
    dailyReminderEnabled: false,
    hasBeenPromptedForReminder: false,
    reminderPromptedAt: null,
  };

  it('shows for an existing user: never prompted, >=1 quest, reminder off', () => {
    expect(getAnnouncementToShow(unseenState, reminderCtx, NOW)).toBe(
      'dailyReminder'
    );
  });

  it('does not show with zero completed quests', () => {
    expect(
      getAnnouncementToShow(
        unseenState,
        { ...reminderCtx, completedQuestCount: 0 },
        NOW
      )
    ).toBeNull();
  });

  it('does not show when the reminder is already enabled', () => {
    expect(
      getAnnouncementToShow(
        unseenState,
        { ...reminderCtx, dailyReminderEnabled: true },
        NOW
      )
    ).toBeNull();
  });

  it('does not show again once seen', () => {
    expect(
      getAnnouncementToShow(
        { ...unseenState, hasSeenDailyReminderPrompt: true },
        reminderCtx,
        NOW
      )
    ).toBeNull();
  });

  describe('new-user re-ask (declined at onboarding)', () => {
    const reAskCtx = {
      ...reminderCtx,
      hasBeenPromptedForReminder: true,
      completedQuestCount: 3,
      reminderPromptedAt: NOW - SEVEN_DAYS,
    };

    it('shows at exactly 3 quests and 7 days', () => {
      expect(getAnnouncementToShow(unseenState, reAskCtx, NOW)).toBe(
        'dailyReminder'
      );
    });

    it('does not show with only 2 quests', () => {
      expect(
        getAnnouncementToShow(
          unseenState,
          { ...reAskCtx, completedQuestCount: 2 },
          NOW
        )
      ).toBeNull();
    });

    it('does not show at 6 days 23 hours', () => {
      expect(
        getAnnouncementToShow(
          unseenState,
          {
            ...reAskCtx,
            reminderPromptedAt: NOW - SEVEN_DAYS + 60 * 60 * 1000,
          },
          NOW
        )
      ).toBeNull();
    });

    it('does not show when prompted but reminderPromptedAt is missing', () => {
      expect(
        getAnnouncementToShow(
          unseenState,
          { ...reAskCtx, reminderPromptedAt: null },
          NOW
        )
      ).toBeNull();
    });
  });

  it('outranks other eligible announcements', () => {
    expect(
      getAnnouncementToShow(
        unseenState,
        { ...reminderCtx, hasCompletedFirstBranch: true },
        NOW
      )
    ).toBe('dailyReminder');
  });

  it('respects the once-per-day cap', () => {
    expect(
      getAnnouncementToShow(
        { ...unseenState, lastAnnouncementShownAt: NOW - 1000 },
        reminderCtx,
        NOW
      )
    ).toBeNull();
  });
});

describe('legacy settings migration on first init', () => {
  afterEach(() => {
    jest.dontMock('@/lib/storage');
    jest.resetModules();
  });

  it('seeds seen flags from the legacy unquest-settings blob so dismissals survive', () => {
    // A user who already dismissed Guilds under settings-store must not be
    // re-shown it after the flags move to announcement-store.
    jest.doMock('@/lib/storage', () => ({
      getItem: (key: string) =>
        key === 'unquest-settings'
          ? JSON.stringify({
              state: { hasSeenGuildsAnnouncement: true },
              version: 0,
            })
          : null,
      setItem: jest.fn(),
      removeItem: jest.fn(),
    }));

    let seededGuilds: boolean | undefined;
    let seededBranching: boolean | undefined;
    jest.isolateModules(() => {
      const {
        useAnnouncementStore: freshStore,
      } = require('./announcement-store');
      seededGuilds = freshStore.getState().hasSeenGuildsAnnouncement;
      seededBranching = freshStore.getState().hasSeenBranchingAnnouncement;
    });

    expect(seededGuilds).toBe(true);
    expect(seededBranching).toBe(false);
  });
});
