import { renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

import { apiClient } from '@/api';
import { provisionalApiClient } from '@/api/common/provisional-client';
import { getItem } from '@/lib/storage';

import {
  createRestoration,
  useCreateRestoration,
  type RestorationBody,
} from './index';

// Mock the API clients
jest.mock('@/api', () => ({
  apiClient: {
    post: jest.fn(),
  },
}));

jest.mock('@/api/common/provisional-client', () => ({
  provisionalApiClient: {
    post: jest.fn(),
  },
}));

jest.mock('@/lib/storage', () => ({
  getItem: jest.fn(),
}));

const mockApiClient = apiClient as jest.Mocked<typeof apiClient>;
const mockProvisionalApiClient = provisionalApiClient as jest.Mocked<
  typeof provisionalApiClient
>;
const mockGetItem = getItem as unknown as jest.Mock;

const mockResponse = {
  id: 'r1',
  restorationNumber: 1,
  spiritRestoredAt: '2026-07-03T00:00:00.000Z',
  restorationCount: 1,
  spirit: 100,
};

const body: RestorationBody = {
  challenges: ['social'],
  challengeText: 'phones at dinner',
  journalText: 'felt good',
  commitmentHour: 20,
  commitmentMinute: 0,
};

describe('restoration API', () => {
  let queryClient: QueryClient;

  const createWrapper = () => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
          gcTime: 0,
        },
      },
    });

    return ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetItem.mockReturnValue(null);
  });

  afterEach(() => {
    queryClient?.clear();
  });

  describe('createRestoration', () => {
    it('calls apiClient.post with /restorations/ and returns the data payload', async () => {
      mockApiClient.post.mockResolvedValue({ data: mockResponse });

      const result = await createRestoration(body);

      expect(mockApiClient.post).toHaveBeenCalledWith('/restorations/', body);
      expect(result).toEqual(mockResponse);
    });

    it('uses provisionalApiClient when a provisional token is present', async () => {
      mockGetItem.mockReturnValue('prov-token-abc');
      mockProvisionalApiClient.post.mockResolvedValue({ data: mockResponse });

      const result = await createRestoration(body);

      expect(mockProvisionalApiClient.post).toHaveBeenCalledWith(
        '/restorations/',
        body
      );
      expect(mockApiClient.post).not.toHaveBeenCalled();
      expect(result).toEqual(mockResponse);
    });
  });

  describe('useCreateRestoration', () => {
    it('invalidates the user details query on success', async () => {
      mockApiClient.post.mockResolvedValue({ data: mockResponse });

      const invalidateSpy = jest.spyOn(
        QueryClient.prototype,
        'invalidateQueries'
      );

      const { result } = renderHook(() => useCreateRestoration(), {
        wrapper: createWrapper(),
      });

      result.current.mutate(body);

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: ['user', 'details'],
      });

      invalidateSpy.mockRestore();
    });
  });
});
