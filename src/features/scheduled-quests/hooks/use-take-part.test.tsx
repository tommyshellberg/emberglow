import { act, renderHook } from '@testing-library/react-native';

import QuestTimer from '@/lib/services/quest-timer';
import { useQuestStore } from '@/store/quest-store';

import { useTakePart } from './use-take-part';

jest.mock('expo-router', () => {
  const push = jest.fn();
  return { useRouter: () => ({ push }), __push: push };
});
jest.mock('@/lib/services/quest-timer', () => ({
  __esModule: true,
  default: { prepareQuest: jest.fn().mockResolvedValue(undefined) },
}));

const run = {
  id: 'r1',
  status: 'active',
  scheduledStartAt: '2030-01-01T05:00:00.000Z',
  actualStartTime: '2030-01-01T05:00:01.000Z',
  scheduledEndTime: '2030-01-01T06:00:00.000Z',
  quest: {
    title: '5am run club',
    category: 'fitness',
    durationMinutes: 60,
    mode: 'cooperative',
    reward: { xp: 180 },
  },
  participants: [
    {
      userId: {
        id: 'creator',
        character: { name: 'Thorin', type: 'knight', level: 4 },
      },
      ready: false,
      phoneLocked: false,
      status: 'active',
    },
    {
      userId: {
        id: 'me',
        character: { name: 'Bilbo', type: 'scout', level: 2 },
      },
      ready: false,
      phoneLocked: false,
      status: 'active',
    },
  ],
  completionPolicy: 'individual',
  visibility: 'public',
  maxParticipants: 10,
} as any;

describe('useTakePart', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useQuestStore.setState({
      cooperativeQuestRun: null,
      pendingQuest: null,
    } as any);
  });

  it('mirrors the coop handoff: store run, prepare template, arm QuestTimer with the run id', async () => {
    const { result } = renderHook(() => useTakePart(run));
    await act(() => result.current.takePart());

    const state = useQuestStore.getState();
    expect(state.cooperativeQuestRun?.id).toBe('r1');
    expect(state.cooperativeQuestRun?.status).toBe('active');
    expect(state.cooperativeQuestRun?.completionPolicy).toBe('individual');
    expect(state.pendingQuest?.title).toBe('5am run club');
    // mode MUST be 'cooperative' or the navigation resolver routes the armed
    // quest to the solo /pending-quest screen (see D9).
    expect(state.pendingQuest?.mode).toBe('cooperative');
    expect((state.pendingQuest as any)?.category).toBe('cooperative');
    expect(QuestTimer.prepareQuest).toHaveBeenCalledWith(
      expect.objectContaining({
        mode: 'cooperative',
        category: 'cooperative',
        durationMinutes: 60,
      }),
      'r1'
    );
  });

  it('leaves cooperative-pending-quest navigation to NavigationGate', async () => {
    // The mode assertion above is the whole navigation contract: arming the
    // store with mode 'cooperative' is what makes the resolver return target
    // 'cooperative-pending-quest', and the root NavigationGate acts on it.
    // Pushing here as well stacked a second identical screen.
    const { result } = renderHook(() => useTakePart(run));
    await act(() => result.current.takePart());

    const { __push } = jest.requireMock('expo-router');
    expect(__push).not.toHaveBeenCalledWith('/cooperative-pending-quest');
  });
});
