import { act, renderHook } from '@testing-library/react-native';

import QuestTimer from '@/lib/services/quest-timer';
import { useQuestStore } from '@/store/quest-store';

import { useQuestSelection } from './use-quest-selection';

jest.mock('expo-router', () => {
  const push = jest.fn();
  return { useRouter: () => ({ push }), __push: push };
});
jest.mock('@/lib/services/quest-timer', () => ({
  __esModule: true,
  default: { prepareQuest: jest.fn().mockResolvedValue(undefined) },
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

  it('arms the quest in the store', async () => {
    const { result } = renderHook(() =>
      useQuestSelection({ serverQuests: [serverQuest], serverOptions: [] })
    );

    await act(() => result.current.handleQuestOptionSelect('quest-6'));

    expect(useQuestStore.getState().pendingQuest?.id).toBe('quest-6');
    expect(QuestTimer.prepareQuest).toHaveBeenCalled();
  });

  it('leaves pending-quest navigation to NavigationGate', async () => {
    // Arming the store IS the navigation: the resolver turns a pendingQuest
    // into target 'pending-quest' and the root NavigationGate pushes it. That
    // happens the moment prepareQuest() lands — a whole POST /quest-runs before
    // this hook's await resolves. Pushing here as well stacks a second,
    // identical pending-quest screen on top of the first, which is what the
    // double-navigation on the orb press actually was.
    const { result } = renderHook(() =>
      useQuestSelection({ serverQuests: [serverQuest], serverOptions: [] })
    );

    await act(() => result.current.handleQuestOptionSelect('quest-6'));

    const { __push } = jest.requireMock('expo-router');
    expect(__push).not.toHaveBeenCalledWith('/pending-quest');
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
