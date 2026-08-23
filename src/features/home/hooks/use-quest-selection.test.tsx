import { act, renderHook } from '@testing-library/react-native';
import { Alert } from 'react-native';

import QuestTimer from '@/lib/services/quest-timer';
import { useQuestStore } from '@/store/quest-store';

import { useQuestSelection } from './use-quest-selection';

jest.mock('expo-router', () => {
  const push = jest.fn();
  return { useRouter: () => ({ push }), __push: push };
});
jest.mock('@/lib/services/quest-timer', () => ({
  __esModule: true,
  default: { startPresenceQuest: jest.fn().mockResolvedValue(undefined) },
}));
jest.mock('posthog-react-native', () => ({
  usePostHog: () => ({ capture: jest.fn() }),
}));

const serverQuest = {
  _id: '6855d844bcab15f39041feb2',
  customId: 'quest-6',
  id: 'quest-6',
  title: 'Ancient, Empty Village',
  mode: 'story',
  durationMinutes: 2,
  reward: { xp: 100 },
} as any;

describe('useQuestSelection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useQuestStore.setState({ pendingQuest: null } as any);
  });

  it('starts the presence quest immediately without arming pendingQuest', async () => {
    // Presence runs skip the pending stage: startPresenceQuest activates the
    // quest directly, and the resolver routes on activeQuest instead.
    const { result } = renderHook(() =>
      useQuestSelection({ serverQuests: [serverQuest], serverOptions: [] })
    );

    await act(() => result.current.handleQuestOptionSelect('quest-6'));

    expect(QuestTimer.startPresenceQuest).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'quest-6' })
    );
    expect(useQuestStore.getState().pendingQuest).toBeNull();
  });

  it('tells the user when the quest cannot start (offline) instead of failing silently', async () => {
    // The tap handler discards the promise, so a rethrow here would be an
    // unhandled rejection the user never sees.
    (QuestTimer.startPresenceQuest as jest.Mock).mockRejectedValueOnce(
      new Error('Network Error')
    );
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    const { result } = renderHook(() =>
      useQuestSelection({ serverQuests: [serverQuest], serverOptions: [] })
    );

    await act(() => result.current.handleQuestOptionSelect('quest-6'));

    expect(alertSpy).toHaveBeenCalledWith(
      "Couldn't start the quest",
      'Check your connection and try again.'
    );
    expect(useQuestStore.getState().activeQuest).toBeFalsy();
  });

  it('leaves quest navigation to NavigationGate', async () => {
    // Starting the run IS the navigation: startPresenceQuest activates the
    // quest, the resolver turns that activeQuest into target 'active-quest',
    // and the root NavigationGate performs the route. Pushing here as well
    // would stack a second, identical screen on top of the first, which is
    // what the double-navigation on the orb press actually was.
    const { result } = renderHook(() =>
      useQuestSelection({ serverQuests: [serverQuest], serverOptions: [] })
    );

    await act(() => result.current.handleQuestOptionSelect('quest-6'));

    const { __push } = jest.requireMock('expo-router');
    expect(__push).not.toHaveBeenCalled();
  });

  it('still owns navigation the gate does not derive from quest state', async () => {
    // The co-op menu is a plain user destination, not a resolver target, so the
    // gate has no opinion about it. This hook must keep pushing it itself.
    const { result } = renderHook(() =>
      useQuestSelection({ serverQuests: [], serverOptions: [] })
    );

    act(() => result.current.handleCooperativeQuest());

    const { __push } = jest.requireMock('expo-router');
    expect(__push).toHaveBeenCalledWith('/cooperative-quest-menu');
  });
});
