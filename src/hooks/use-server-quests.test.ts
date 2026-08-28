import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook } from '@testing-library/react-native';
import React from 'react';

import { useServerQuests } from './use-server-quests';

// Mock the API
jest.mock('@/api/quest', () => ({
  useNextAvailableQuests: jest.fn(),
}));

// Mock the stores
const mockSetServerAvailableQuests = jest.fn();
let mockCompletedQuests: any[] = [];
jest.mock('@/store/quest-store', () => ({
  useQuestStore: jest.fn((selector) =>
    selector({
      activeQuest: null,
      pendingQuest: null,
      completedQuests: mockCompletedQuests,
      setServerAvailableQuests: mockSetServerAvailableQuests,
    })
  ),
}));

jest.mock('@/store/user-store', () => ({
  useUserStore: jest.fn((selector) =>
    selector({
      user: { id: 'test-user-id' },
    })
  ),
}));

const { useNextAvailableQuests } = require('@/api/quest');

// Helper to create wrapper with QueryClient
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
};

describe('useServerQuests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCompletedQuests = [];
  });

  it('tells the query which story quest was completed most recently', () => {
    // Deliberately not in completion order: the answer (quest-1a) is neither
    // the first nor the last story entry, a custom quest and a FAILED story
    // quest finished later, so "take first/last entry" would both be wrong.
    mockCompletedQuests = [
      { id: 'quest-1', mode: 'story', status: 'completed', stopTime: 100 },
      { id: 'custom-1', mode: 'custom', status: 'completed', stopTime: 300 },
      { id: 'quest-1a', mode: 'story', status: 'completed', stopTime: 200 },
      { id: 'quest-2', mode: 'story', status: 'failed', stopTime: 400 },
      { id: 'quest-0', mode: 'story', status: 'completed', stopTime: 50 },
    ];
    useNextAvailableQuests.mockReturnValue({
      data: null,
      isLoading: false,
      error: null,
    });

    renderHook(() => useServerQuests(), { wrapper: createWrapper() });

    expect(useNextAvailableQuests).toHaveBeenCalledWith(
      expect.objectContaining({ lastCompletedQuestId: 'quest-1a' })
    );
  });

  it('updates the completed quest id when another story quest finishes', () => {
    mockCompletedQuests = [
      { id: 'quest-1', mode: 'story', status: 'completed', stopTime: 100 },
    ];
    useNextAvailableQuests.mockReturnValue({
      data: null,
      isLoading: false,
      error: null,
    });
    const { rerender } = renderHook(() => useServerQuests(), {
      wrapper: createWrapper(),
    });

    mockCompletedQuests = [
      ...mockCompletedQuests,
      { id: 'quest-1a', mode: 'story', status: 'completed', stopTime: 200 },
    ];
    rerender({});

    expect(useNextAvailableQuests).toHaveBeenLastCalledWith(
      expect.objectContaining({ lastCompletedQuestId: 'quest-1a' })
    );
  });

  it('passes no completed quest id before any story quest is completed', () => {
    useNextAvailableQuests.mockReturnValue({
      data: null,
      isLoading: false,
      error: null,
    });

    renderHook(() => useServerQuests(), { wrapper: createWrapper() });

    expect(useNextAvailableQuests).toHaveBeenCalledWith(
      expect.objectContaining({ lastCompletedQuestId: undefined })
    );
  });

  it('should return empty options when no data', () => {
    useNextAvailableQuests.mockReturnValue({
      data: null,
      isLoading: false,
      error: null,
    });

    const { result } = renderHook(() => useServerQuests(), {
      wrapper: createWrapper(),
    });

    expect(result.current.options).toEqual([]);
    expect(result.current.serverQuests).toEqual([]);
  });

  it('should use explicit server options when provided', () => {
    const mockOptions = [
      { id: 'opt-1', text: 'Option 1', nextQuestId: 'quest-1' },
      { id: 'opt-2', text: 'Option 2', nextQuestId: 'quest-2' },
    ];

    useNextAvailableQuests.mockReturnValue({
      data: {
        quests: [],
        options: mockOptions,
        hasMoreQuests: false,
        storylineComplete: false,
      },
      isLoading: false,
      error: null,
    });

    const { result } = renderHook(() => useServerQuests(), {
      wrapper: createWrapper(),
    });

    expect(result.current.options).toEqual(mockOptions);
  });

  it('should create options from multiple server quests with decisionText', () => {
    const mockQuests = [
      {
        customId: 'quest-4a',
        title: 'Unraveling the Inscription',
        decisionText: 'Stay and investigate the ruins',
      },
      {
        customId: 'quest-4b',
        title: 'Moving Forward Before Nightfall',
        decisionText: 'Continue on before nightfall',
      },
    ];

    useNextAvailableQuests.mockReturnValue({
      data: {
        quests: mockQuests,
        options: [],
        hasMoreQuests: false,
        storylineComplete: false,
      },
      isLoading: false,
      error: null,
    });

    const { result } = renderHook(() => useServerQuests(), {
      wrapper: createWrapper(),
    });

    // Should return empty array - component will handle creating options from decisionText
    expect(result.current.options).toEqual([]);
  });

  it('should use Continue as fallback when decisionText is missing', () => {
    const mockQuests = [
      {
        customId: 'quest-4a',
        title: 'Unraveling the Inscription',
        // No decisionText
      },
      {
        customId: 'quest-4b',
        title: 'Moving Forward Before Nightfall',
        // No decisionText
      },
    ];

    useNextAvailableQuests.mockReturnValue({
      data: {
        quests: mockQuests,
        options: [],
        hasMoreQuests: false,
        storylineComplete: false,
      },
      isLoading: false,
      error: null,
    });

    const { result } = renderHook(() => useServerQuests(), {
      wrapper: createWrapper(),
    });

    // Should return empty array - component will handle creating options from decisionText
    expect(result.current.options).toEqual([]);
  });

  it('should not create options from single quest', () => {
    const mockQuests = [
      {
        customId: 'quest-5',
        title: 'The Lake Discovery',
        decisionText: 'Approach the lake',
      },
    ];

    useNextAvailableQuests.mockReturnValue({
      data: {
        quests: mockQuests,
        options: [],
        hasMoreQuests: false,
        storylineComplete: false,
      },
      isLoading: false,
      error: null,
    });

    const { result } = renderHook(() => useServerQuests(), {
      wrapper: createWrapper(),
    });

    // Single quest should not generate options
    expect(result.current.options).toEqual([]);
    expect(result.current.serverQuests).toEqual(mockQuests);
  });

  it('should sync server data to quest store', () => {
    const mockData = {
      quests: [{ customId: 'quest-1' }],
      hasMoreQuests: true,
      storylineComplete: false,
    };

    useNextAvailableQuests.mockReturnValue({
      data: mockData,
      isLoading: false,
      error: null,
    });

    renderHook(() => useServerQuests(), {
      wrapper: createWrapper(),
    });

    expect(mockSetServerAvailableQuests).toHaveBeenCalledWith(
      mockData.quests,
      mockData.hasMoreQuests,
      mockData.storylineComplete
    );
  });

  it('should not fetch when user is not authenticated', () => {
    // Mock no user
    const { useUserStore } = require('@/store/user-store');
    useUserStore.mockImplementation((selector) =>
      selector({
        user: null,
      })
    );

    renderHook(() => useServerQuests(), {
      wrapper: createWrapper(),
    });

    // Should call with enabled: false
    expect(useNextAvailableQuests).toHaveBeenCalledWith({
      enabled: false,
      storylineId: 'vaedros',
      includeOptions: true,
    });
  });

  it('should not fetch when quest is active or pending', () => {
    // Mock active quest
    const { useQuestStore } = require('@/store/quest-store');
    useQuestStore.mockImplementation((selector) =>
      selector({
        activeQuest: { id: 'active-quest' },
        pendingQuest: null,
        completedQuests: [],
        setServerAvailableQuests: mockSetServerAvailableQuests,
      })
    );

    renderHook(() => useServerQuests(), {
      wrapper: createWrapper(),
    });

    // Should call with enabled: false
    expect(useNextAvailableQuests).toHaveBeenCalledWith({
      enabled: false,
      storylineId: 'vaedros',
      includeOptions: true,
    });
  });

  it('should handle mixed decisionText scenarios', () => {
    const mockQuests = [
      {
        customId: 'quest-4a',
        title: 'Quest A',
        decisionText: 'Choose path A',
      },
      {
        customId: 'quest-4b',
        title: 'Quest B',
        // No decisionText - should fallback
      },
      {
        customId: 'quest-4c',
        title: 'Quest C',
        decisionText: 'Choose path C',
      },
    ];

    useNextAvailableQuests.mockReturnValue({
      data: {
        quests: mockQuests,
        options: [],
        hasMoreQuests: false,
        storylineComplete: false,
      },
      isLoading: false,
      error: null,
    });

    const { result } = renderHook(() => useServerQuests(), {
      wrapper: createWrapper(),
    });

    // Should return empty array - component will handle creating options from decisionText
    expect(result.current.options).toEqual([]);
  });
});
