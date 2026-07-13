import { useQuery } from '@tanstack/react-query';

import { useDiscoverScheduledQuests } from './use-discover-scheduled-quests';

jest.mock('@tanstack/react-query', () => ({
  useQuery: jest.fn(() => ({ data: undefined })),
}));
jest.mock('@/lib/services/scheduled-quest-service', () => ({
  discoverScheduledQuests: jest.fn(),
}));

describe('useDiscoverScheduledQuests', () => {
  it('always refetches on mount, so a newly created event on another device is never masked by a stale cache', () => {
    useDiscoverScheduledQuests();

    expect(useQuery).toHaveBeenCalledWith(
      expect.objectContaining({ refetchOnMount: 'always' })
    );
  });
});
