import { renderHook } from '@testing-library/react-native';

import { useAuth } from '@/lib/auth';
import { useNavigationTarget } from '@/lib/navigation/navigation-state-resolver';
// Import mocked modules
import { getItem } from '@/lib/storage';
import { useCharacterStore } from '@/store/character-store';
import { OnboardingStep } from '@/store/onboarding-store';
import { useOnboardingStore } from '@/store/onboarding-store';
import { useQuestStore } from '@/store/quest-store';
import { useUserStore } from '@/store/user-store';

// Mock modules
jest.mock('@/lib/storage');
jest.mock('@/lib/auth');
jest.mock('@/store/onboarding-store');
jest.mock('@/store/character-store');
jest.mock('@/store/quest-store');
jest.mock('@/store/user-store');

// Setup mock implementations
const mockGetItem = getItem as jest.MockedFunction<typeof getItem>;
const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;
const mockUseOnboardingStore = useOnboardingStore as jest.MockedFunction<
  typeof useOnboardingStore
>;
const mockUseCharacterStore = useCharacterStore as jest.MockedFunction<
  typeof useCharacterStore
>;
const mockUseQuestStore = useQuestStore as jest.MockedFunction<
  typeof useQuestStore
> & {
  getState: jest.MockedFunction<() => any>;
  subscribe: jest.MockedFunction<(listener: any) => () => void>;
};

// Mock state objects
const mockAuthState = {
  status: 'idle' as 'idle' | 'signOut' | 'signIn' | 'hydrating',
};

// Step order, mirrored from the real store so the double below can enforce the
// same rule. Kept local rather than exported from the store: the point is for
// this file to encode what the store PROMISES, so a change there fails here.
const STEP_ORDER: Record<OnboardingStep, number> = {
  [OnboardingStep.NOT_STARTED]: 0,
  [OnboardingStep.SELECTING_CHARACTER]: 1,
  [OnboardingStep.VIEWING_INTRO]: 2,
  [OnboardingStep.REQUESTING_NOTIFICATIONS]: 3,
  [OnboardingStep.STARTING_FIRST_QUEST]: 4,
  [OnboardingStep.VIEWING_SIGNUP_PROMPT]: 5,
  [OnboardingStep.COMPLETED]: 6,
};

const mockOnboardingState = {
  isOnboardingComplete: jest.fn(() => false),
  currentStep: OnboardingStep.NOT_STARTED,
  // NOT a bare jest.fn(). The real setCurrentStep is FORWARD-ONLY: it silently
  // refuses to move backwards and only logs a warning. A bare spy records the
  // call and reports success, so a test asserting "we asked for step X" passes
  // while the app does nothing — which is exactly how a broken fix for the
  // character-less social account shipped and had to be caught on a device.
  // Move backwards through resetOnboarding, which set()s directly.
  setCurrentStep: jest.fn((step: OnboardingStep) => {
    if (STEP_ORDER[step] >= STEP_ORDER[mockOnboardingState.currentStep]) {
      mockOnboardingState.currentStep = step;
    }
  }),
  resetOnboarding: jest.fn(() => {
    mockOnboardingState.currentStep = OnboardingStep.NOT_STARTED;
  }),
};

const mockCharacterState = {
  character: null as any,
};

const mockUseUserStore = useUserStore as jest.MockedFunction<
  typeof useUserStore
>;

// The server's view of the account. `type`/`name` are '' (not undefined) when
// the account has no character — see the server's transformUserResponse, whose
// fallbacks are `character?.type || ''`. `user: null` means the post-sign-in
// fetch has not landed yet, which is a DIFFERENT state from "has no character".
const mockUserState = {
  user: null as any,
};

const mockQuestState = {
  pendingQuest: null as any,
  recentCompletedQuest: null as any,
  failedQuest: null as any,
  completedQuests: [] as any[],
  resetFailedQuest: jest.fn(),
  clearRecentCompletedQuest: jest.fn(),
};

// Setup initial mocks
beforeAll(() => {
  // Mock useQuestStore static methods
  mockUseQuestStore.getState = jest.fn(() => mockQuestState);
  mockUseQuestStore.subscribe = jest.fn(() => jest.fn());
});

beforeEach(() => {
  jest.clearAllMocks();

  // Reset mock implementations
  mockGetItem.mockReturnValue(null);

  mockUseAuth.mockImplementation((selector) => selector(mockAuthState));

  mockUseOnboardingStore.mockImplementation((selector) =>
    selector(mockOnboardingState)
  );

  mockUseCharacterStore.mockImplementation((selector) =>
    selector(mockCharacterState)
  );

  mockUseUserStore.mockImplementation((selector) => selector(mockUserState));

  mockUseQuestStore.mockImplementation((selector) => {
    if (typeof selector === 'function') {
      return selector(mockQuestState);
    }
    return mockQuestState;
  });

  // Reset mock state
  mockAuthState.status = 'idle';
  mockOnboardingState.isOnboardingComplete.mockReturnValue(false);
  mockOnboardingState.currentStep = OnboardingStep.NOT_STARTED;
  mockOnboardingState.setCurrentStep.mockClear();
  mockOnboardingState.resetOnboarding.mockClear();
  mockCharacterState.character = null;
  mockUserState.user = null;
  mockQuestState.pendingQuest = null;
  mockQuestState.recentCompletedQuest = null;
  mockQuestState.failedQuest = null;
  mockQuestState.completedQuests = [];
  mockQuestState.resetFailedQuest.mockClear();
  mockQuestState.clearRecentCompletedQuest.mockClear();

  // Reset getState mock
  mockUseQuestStore.getState.mockReturnValue(mockQuestState);
});

describe('Navigation State Resolver', () => {
  it('returns loading when auth is hydrating', () => {
    mockAuthState.status = 'hydrating';

    const { result } = renderHook(() => useNavigationTarget());

    expect(result.current).toEqual({ type: 'loading' });
  });

  it('prioritizes pending quest over everything', () => {
    mockAuthState.status = 'signOut'; // Even if signed out
    mockQuestState.pendingQuest = { id: 'quest-1' };

    const { result } = renderHook(() => useNavigationTarget());

    expect(result.current).toEqual({
      type: 'pending-quest',
      questId: 'quest-1',
    });
  });

  it('redirects to first-quest-result for failed quest-1 during onboarding', () => {
    mockAuthState.status = 'signOut';
    mockOnboardingState.isOnboardingComplete.mockReturnValue(false);
    mockCharacterState.character = null;
    mockQuestState.failedQuest = { id: 'quest-1' };
    mockQuestState.completedQuests = [];

    // Mock provisional data to prevent auto-sync
    mockGetItem.mockImplementation((key) => {
      if (key === 'provisionalUserId') return 'test-provisional-id';
      return null;
    });

    const { result } = renderHook(() => useNavigationTarget());

    expect(result.current).toEqual({
      type: 'first-quest-result',
      outcome: 'failed',
    });
  });

  it('redirects to quest-result for regular failed quest', () => {
    mockAuthState.status = 'signIn';
    mockOnboardingState.isOnboardingComplete.mockReturnValue(true);
    mockQuestState.failedQuest = { id: 'quest-2' };

    const { result } = renderHook(() => useNavigationTarget());

    expect(result.current).toEqual({
      type: 'quest-result',
      questId: 'quest-2',
      outcome: 'failed',
    });
  });

  it('redirects to first-quest-result for completed quest-1 during onboarding', () => {
    mockAuthState.status = 'signOut';
    mockOnboardingState.isOnboardingComplete.mockReturnValue(false);
    mockQuestState.recentCompletedQuest = { id: 'quest-1' };
    mockQuestState.completedQuests = [];

    // Mock provisional data to prevent auto-sync
    mockGetItem.mockImplementation((key) => {
      if (key === 'provisionalUserId') return 'test-provisional-id';
      return null;
    });

    const { result } = renderHook(() => useNavigationTarget());

    expect(result.current).toEqual({
      type: 'first-quest-result',
      outcome: 'completed',
    });
  });

  it('redirects to first-quest-result for completed first quest when provisional user relaunches app (authStatus signIn)', () => {
    // After an app restart, hydration sets provisional users to signIn
    // (see auth/index.tsx). They are still mid-onboarding.
    mockAuthState.status = 'signIn';
    mockOnboardingState.isOnboardingComplete.mockReturnValue(false);
    mockQuestState.recentCompletedQuest = { id: 'quest-1a' };
    mockQuestState.completedQuests = [];

    mockGetItem.mockImplementation((key) => {
      if (key === 'provisionalAccessToken') return 'test-provisional-token';
      return null;
    });

    const { result } = renderHook(() => useNavigationTarget());

    expect(result.current).toEqual({
      type: 'first-quest-result',
      outcome: 'completed',
    });
  });

  it('redirects to first-quest-result for failed first quest when provisional user relaunches app (authStatus signIn)', () => {
    mockAuthState.status = 'signIn';
    mockOnboardingState.isOnboardingComplete.mockReturnValue(false);
    mockQuestState.failedQuest = { id: 'quest-1a' };
    mockQuestState.completedQuests = [];

    mockGetItem.mockImplementation((key) => {
      if (key === 'provisionalAccessToken') return 'test-provisional-token';
      return null;
    });

    const { result } = renderHook(() => useNavigationTarget());

    expect(result.current).toEqual({
      type: 'first-quest-result',
      outcome: 'failed',
    });
  });

  it('redirects to quest-result for regular completed quest', () => {
    mockAuthState.status = 'signIn';
    mockOnboardingState.isOnboardingComplete.mockReturnValue(true);
    mockQuestState.recentCompletedQuest = { id: 'quest-2' };

    const { result } = renderHook(() => useNavigationTarget());

    expect(result.current).toEqual({
      type: 'quest-result',
      questId: 'quest-2',
      outcome: 'completed',
    });
  });

  it('redirects to onboarding when not complete and user has provisional data', () => {
    mockAuthState.status = 'signIn';
    mockOnboardingState.isOnboardingComplete.mockReturnValue(false);
    mockOnboardingState.currentStep = OnboardingStep.NOT_STARTED;
    mockCharacterState.character = null;
    mockQuestState.completedQuests = [];

    // Mock provisional data to indicate genuine new user
    mockGetItem.mockImplementation((key) => {
      if (key === 'provisionalUserId') return 'test-provisional-id';
      return null;
    });

    const { result } = renderHook(() => useNavigationTarget());

    expect(result.current).toEqual({ type: 'onboarding' });
  });

  it('redirects to app for legacy users with character data but incomplete onboarding', () => {
    mockAuthState.status = 'signIn';
    mockOnboardingState.isOnboardingComplete.mockReturnValue(true); // Will be set by synchronization
    mockOnboardingState.currentStep = OnboardingStep.COMPLETED;
    mockCharacterState.character = {
      name: 'LegacyChar',
      type: 'alchemist',
      level: 5,
      currentXP: 200,
      xpToNextLevel: 300,
    };
    mockQuestState.completedQuests = [];

    const { result } = renderHook(() => useNavigationTarget());

    expect(result.current).toEqual({ type: 'app' });
  });

  it('handles failed quest-1 correctly for legacy users with character data', () => {
    mockAuthState.status = 'signIn';
    mockOnboardingState.isOnboardingComplete.mockReturnValue(true); // Will be set by sync
    mockCharacterState.character = {
      name: 'LegacyChar',
      type: 'druid',
      level: 1,
      currentXP: 0,
      xpToNextLevel: 100,
    };
    mockQuestState.failedQuest = { id: 'quest-1' };

    const { result } = renderHook(() => useNavigationTarget());

    // Should redirect to regular quest-result since character data indicates effective completion
    expect(result.current).toEqual({
      type: 'quest-result',
      questId: 'quest-1',
      outcome: 'failed',
    });
  });

  it('redirects to login when signed out', () => {
    mockAuthState.status = 'signOut';
    mockOnboardingState.isOnboardingComplete.mockReturnValue(true);
    mockQuestState.completedQuests = [];

    const { result } = renderHook(() => useNavigationTarget());

    expect(result.current).toEqual({ type: 'login' });
  });

  it('redirects to app by default', () => {
    mockAuthState.status = 'signIn';
    mockOnboardingState.isOnboardingComplete.mockReturnValue(true);
    mockQuestState.completedQuests = [];

    const { result } = renderHook(() => useNavigationTarget());

    expect(result.current).toEqual({ type: 'app' });
  });

  it('updates navigation target when auth status changes from signOut to signIn', () => {
    // Start with signed out state
    mockAuthState.status = 'signOut';
    mockOnboardingState.isOnboardingComplete.mockReturnValue(true);
    mockQuestState.completedQuests = [];

    const { result, rerender } = renderHook(() => useNavigationTarget());

    // Should initially redirect to login
    expect(result.current).toEqual({ type: 'login' });

    // Simulate auth status change (magic link verification)
    mockAuthState.status = 'signIn';
    rerender();

    // Should now redirect to app
    expect(result.current).toEqual({ type: 'app' });
  });

  it('prioritizes quest states in correct order', () => {
    mockAuthState.status = 'signIn';
    mockOnboardingState.isOnboardingComplete.mockReturnValue(true);

    // Test priority: pending > failed > completed
    mockQuestState.pendingQuest = { id: 'quest-1' };
    mockQuestState.failedQuest = { id: 'quest-2' };
    mockQuestState.recentCompletedQuest = { id: 'quest-3' };

    const { result } = renderHook(() => useNavigationTarget());

    expect(result.current).toEqual({
      type: 'pending-quest',
      questId: 'quest-1',
    });
  });

  it('handles failed quest priority over completed quest', () => {
    mockAuthState.status = 'signIn';
    mockOnboardingState.isOnboardingComplete.mockReturnValue(true);
    mockQuestState.failedQuest = { id: 'quest-2' };
    mockQuestState.recentCompletedQuest = { id: 'quest-3' };

    const { result } = renderHook(() => useNavigationTarget());

    expect(result.current).toEqual({
      type: 'quest-result',
      questId: 'quest-2',
      outcome: 'failed',
    });
  });

  it('redirects to app when user has completed quests but onboarding state is reset', () => {
    mockAuthState.status = 'signIn';
    mockOnboardingState.isOnboardingComplete.mockReturnValue(true); // Will be set by synchronization
    mockOnboardingState.currentStep = OnboardingStep.COMPLETED;
    mockCharacterState.character = null;
    mockQuestState.completedQuests = [{ id: 'quest-1a', status: 'completed' }];

    const { result } = renderHook(() => useNavigationTarget());

    expect(result.current).toEqual({ type: 'app' });
  });

  it('redirects to app when user has character data even with reset onboarding state', () => {
    mockAuthState.status = 'signIn';
    mockOnboardingState.isOnboardingComplete.mockReturnValue(true); // Will be set by synchronization
    mockOnboardingState.currentStep = OnboardingStep.COMPLETED;
    mockCharacterState.character = {
      name: 'TestChar',
      type: 'alchemist',
      level: 2,
      currentXP: 150,
      xpToNextLevel: 250,
    };
    mockQuestState.completedQuests = [];

    const { result } = renderHook(() => useNavigationTarget());

    expect(result.current).toEqual({ type: 'app' });
  });

  it('still redirects to onboarding for truly new users with no quest history', () => {
    mockAuthState.status = 'signIn';
    mockOnboardingState.isOnboardingComplete.mockReturnValue(false);
    mockOnboardingState.currentStep = OnboardingStep.NOT_STARTED;
    mockCharacterState.character = null;
    mockQuestState.completedQuests = []; // No completed quests - truly new user

    // Mock provisional data to indicate this is a genuine new user
    mockGetItem.mockImplementation((key) => {
      if (key === 'provisionalUserId') return 'test-provisional-id';
      return null;
    });

    const { result } = renderHook(() => useNavigationTarget());

    expect(result.current).toEqual({ type: 'onboarding' });
  });

  it('automatically synchronizes onboarding state for users with character data', () => {
    mockAuthState.status = 'signIn';
    mockOnboardingState.isOnboardingComplete.mockReturnValue(false);
    mockOnboardingState.currentStep = OnboardingStep.NOT_STARTED;
    mockCharacterState.character = {
      name: 'LegacyChar',
      type: 'alchemist',
      level: 5,
      currentXP: 200,
      xpToNextLevel: 300,
    };
    mockQuestState.completedQuests = [];

    renderHook(() => useNavigationTarget());

    // Should have called setCurrentStep to mark onboarding as complete
    expect(mockOnboardingState.setCurrentStep).toHaveBeenCalledWith(
      OnboardingStep.COMPLETED
    );
  });

  it('automatically synchronizes onboarding state for users with completed quests', () => {
    mockAuthState.status = 'signIn';
    mockOnboardingState.isOnboardingComplete.mockReturnValue(false);
    mockOnboardingState.currentStep = OnboardingStep.NOT_STARTED;
    mockCharacterState.character = null;
    mockQuestState.completedQuests = [{ id: 'quest-1a', status: 'completed' }];

    renderHook(() => useNavigationTarget());

    // Should have called setCurrentStep to mark onboarding as complete
    expect(mockOnboardingState.setCurrentStep).toHaveBeenCalledWith(
      OnboardingStep.COMPLETED
    );
  });

  // A social signup (resolveSocialUser branch 4) creates a full, verified
  // account with NO character, so the user never passes through onboarding.
  // The step below is already COMPLETED because a previous run of the
  // sync effect force-completed it and MMKV persisted that. Routing here is
  // synchronous (part of the render's return value, not a useEffect side
  // effect) so the caller never sees an intermediate '/(app)' target — the
  // silent bounce is the defect this replaces.
  it('routes a hero-less signed-in account to the explanation, not silently home', () => {
    mockAuthState.status = 'signIn';
    mockOnboardingState.isOnboardingComplete.mockReturnValue(true);
    mockOnboardingState.currentStep = OnboardingStep.COMPLETED;
    mockCharacterState.character = null;
    mockQuestState.completedQuests = [];
    // Empty strings, exactly as the server sends them for a null character.
    mockUserState.user = { id: 'u1', type: '', name: '', email: 'a@b.com' };
    mockGetItem.mockReturnValue(null); // no provisional data

    const { result } = renderHook(() => useNavigationTarget());

    expect(result.current).toEqual({ type: 'no-hero' });
    expect(result.current).not.toEqual({ type: 'app' });
  });

  // The over-application guard for the test above. A returning user on a fresh
  // install ALSO has `character === null` at this moment — the post-sign-in
  // fetch has not hydrated the store yet — so keying on the local character
  // alone would drag them into character creation and overwrite the hero they
  // already own. Only the server's empty type/name may trigger that.
  it('still completes onboarding for a returning user whose server account has a character', () => {
    mockAuthState.status = 'signIn';
    mockOnboardingState.isOnboardingComplete.mockReturnValue(false);
    mockOnboardingState.currentStep = OnboardingStep.NOT_STARTED;
    mockCharacterState.character = null;
    mockQuestState.completedQuests = [];
    mockUserState.user = {
      id: 'u1',
      type: 'bard',
      name: 'Tommy',
      email: 'a@b.com',
    };
    mockGetItem.mockReturnValue(null);

    renderHook(() => useNavigationTarget());

    expect(mockOnboardingState.setCurrentStep).toHaveBeenCalledWith(
      OnboardingStep.COMPLETED
    );
    expect(mockOnboardingState.setCurrentStep).not.toHaveBeenCalledWith(
      OnboardingStep.SELECTING_CHARACTER
    );
  });

  // Once the fix above routes a character-less social user into onboarding,
  // they walk it while ALREADY signed in and non-provisional — the two
  // conditions the force-complete branch keys on. Without a step check it
  // fires the moment they pick a hero and skips the intro and first quest,
  // which is the whole experience they were sent back for.
  it('does not force-complete onboarding while a verified user is partway through it', () => {
    mockAuthState.status = 'signIn';
    mockOnboardingState.isOnboardingComplete.mockReturnValue(false);
    mockOnboardingState.currentStep = OnboardingStep.VIEWING_INTRO;
    // They have just chosen a hero locally; the server has not been told yet.
    mockCharacterState.character = {
      name: 'Tommy',
      type: 'bard',
      level: 1,
      currentXP: 0,
      xpToNextLevel: 100,
    };
    mockQuestState.completedQuests = [];
    mockUserState.user = { id: 'u1', type: '', name: '', email: 'a@b.com' };
    mockGetItem.mockReturnValue(null);

    renderHook(() => useNavigationTarget());

    expect(mockOnboardingState.setCurrentStep).not.toHaveBeenCalledWith(
      OnboardingStep.COMPLETED
    );
  });

  it('does not synchronize onboarding state for truly new users', () => {
    mockAuthState.status = 'signIn';
    mockOnboardingState.isOnboardingComplete.mockReturnValue(false);
    mockOnboardingState.currentStep = OnboardingStep.NOT_STARTED;
    mockCharacterState.character = null;
    mockQuestState.completedQuests = []; // No completed quests

    // Mock provisional data to indicate this is a genuinely new user
    mockGetItem.mockImplementation((key) => {
      if (key === 'provisionalUserId') return 'test-provisional-id';
      return null;
    });

    renderHook(() => useNavigationTarget());

    // Should NOT have called setCurrentStep since this is a genuinely new user
    expect(mockOnboardingState.setCurrentStep).not.toHaveBeenCalled();
  });

  it('automatically synchronizes onboarding state for verified users with no provisional data', () => {
    mockAuthState.status = 'signIn';
    mockOnboardingState.isOnboardingComplete.mockReturnValue(false);
    mockOnboardingState.currentStep = OnboardingStep.NOT_STARTED;
    mockCharacterState.character = null;
    mockQuestState.completedQuests = [];

    // Mock getItem to return null (no provisional data)
    mockGetItem.mockReturnValue(null);

    renderHook(() => useNavigationTarget());

    // Should have called setCurrentStep to mark onboarding as complete for verified user
    expect(mockOnboardingState.setCurrentStep).toHaveBeenCalledWith(
      OnboardingStep.COMPLETED
    );
  });

  it('does not synchronize onboarding state for users with provisional data', () => {
    mockAuthState.status = 'signIn';
    mockOnboardingState.isOnboardingComplete.mockReturnValue(false);
    mockOnboardingState.currentStep = OnboardingStep.NOT_STARTED;
    mockCharacterState.character = null;
    mockQuestState.completedQuests = [];

    // Mock getItem to return provisional data (indicating new user in onboarding)
    mockGetItem.mockImplementation((key) => {
      if (key === 'provisionalUserId') return 'test-provisional-id';
      return null;
    });

    renderHook(() => useNavigationTarget());

    // Should NOT have called setCurrentStep since user has provisional data (genuine new user)
    expect(mockOnboardingState.setCurrentStep).not.toHaveBeenCalled();
  });

  it('redirects verified users without local data to app after synchronization', () => {
    mockAuthState.status = 'signIn';
    mockOnboardingState.isOnboardingComplete.mockReturnValue(true); // Will be set to true by synchronization
    mockOnboardingState.currentStep = OnboardingStep.COMPLETED;
    mockCharacterState.character = null;
    mockQuestState.completedQuests = [];

    // Mock getItem to return null (no provisional data)
    mockGetItem.mockReturnValue(null);

    const { result } = renderHook(() => useNavigationTarget());

    expect(result.current).toEqual({ type: 'app' });
  });

  it('handles failed quest with undefined ID and redirects to app', () => {
    mockAuthState.status = 'signIn';
    mockOnboardingState.isOnboardingComplete.mockReturnValue(true);
    mockQuestState.failedQuest = { id: 'undefined' };

    const { result } = renderHook(() => useNavigationTarget());

    expect(result.current).toEqual({ type: 'app' });
    expect(mockQuestState.resetFailedQuest).toHaveBeenCalled();
  });

  it('handles failed quest with no ID and redirects to app', () => {
    mockAuthState.status = 'signIn';
    mockOnboardingState.isOnboardingComplete.mockReturnValue(true);
    mockQuestState.failedQuest = { id: undefined };

    const { result } = renderHook(() => useNavigationTarget());

    expect(result.current).toEqual({ type: 'app' });
    expect(mockQuestState.resetFailedQuest).toHaveBeenCalled();
  });

  it('handles completed quest with undefined ID and redirects to app', () => {
    mockAuthState.status = 'signIn';
    mockOnboardingState.isOnboardingComplete.mockReturnValue(true);
    mockQuestState.recentCompletedQuest = { id: 'undefined' };

    const { result } = renderHook(() => useNavigationTarget());

    expect(result.current).toEqual({ type: 'app' });
    expect(mockQuestState.clearRecentCompletedQuest).toHaveBeenCalled();
  });

  it('handles completed quest with no ID and redirects to app', () => {
    mockAuthState.status = 'signIn';
    mockOnboardingState.isOnboardingComplete.mockReturnValue(true);
    mockQuestState.recentCompletedQuest = { id: undefined };

    const { result } = renderHook(() => useNavigationTarget());

    expect(result.current).toEqual({ type: 'app' });
    expect(mockQuestState.clearRecentCompletedQuest).toHaveBeenCalled();
  });
});
