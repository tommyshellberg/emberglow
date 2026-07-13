import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import React from 'react';

import { render } from '@/lib/test-utils';
import { useAnnouncementStore } from '@/store/announcement-store';

import { BranchingStoryAnnouncementModal } from './branching-story-announcement-modal';

// Mock PostHog with a function we can inspect
const mockPosthogCapture = jest.fn();
jest.mock('posthog-react-native', () => ({
  usePostHog: () => ({
    capture: mockPosthogCapture,
  }),
}));

// Mock the storyline-reset mutation
const mockMutateAsync = jest.fn();
jest.mock('@/api/quest', () => ({
  useResetStoryline: () => ({ mutateAsync: mockMutateAsync }),
}));

// Mock announcement store
jest.mock('@/store/announcement-store', () => ({
  useAnnouncementStore: jest.fn(),
}));

describe('BranchingStoryAnnouncementModal', () => {
  const mockSetHasSeenBranchingAnnouncement = jest.fn();
  const mockRef = { current: { dismiss: jest.fn() } } as any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockMutateAsync.mockResolvedValue({});

    (useAnnouncementStore as unknown as jest.Mock).mockImplementation(
      (selector) => {
        const store = {
          setHasSeenBranchingAnnouncement: mockSetHasSeenBranchingAnnouncement,
        };
        return selector(store);
      }
    );
  });

  it('renders the modal content without emoji', () => {
    render(<BranchingStoryAnnouncementModal ref={mockRef} />);

    expect(screen.getByText('Branching Storylines')).toBeTruthy();
    expect(screen.getByText('Your Story Just Got Deadlier')).toBeTruthy();
    expect(
      screen.getByText('Experience the storylines from the beginning')
    ).toBeTruthy();
    expect(screen.getByText('Keep your level and XP')).toBeTruthy();
    expect(screen.getByText('Restart at Branching Point')).toBeTruthy();
    expect(screen.getByText('Continue Current Journey')).toBeTruthy();
    // The old ⚔️ / ✓ emoji must be gone (brand guide bans emoji).
    expect(screen.queryByText('⚔️')).toBeNull();
    expect(screen.queryByText(/✓/)).toBeNull();
  });

  it('resets the storyline and marks seen when Restart is pressed', async () => {
    render(<BranchingStoryAnnouncementModal ref={mockRef} />);

    fireEvent.press(screen.getByText('Restart at Branching Point'));

    expect(mockPosthogCapture).toHaveBeenCalledWith(
      'branching_announcement_accepted'
    );
    expect(mockMutateAsync).toHaveBeenCalledWith({ storylineId: 'vaedros' });

    await waitFor(() => {
      expect(mockPosthogCapture).toHaveBeenCalledWith(
        'storyline_reset_success',
        expect.objectContaining({ storyline_id: 'vaedros' })
      );
      expect(mockSetHasSeenBranchingAnnouncement).toHaveBeenCalledWith(true);
    });
  });

  it('still marks seen when the reset fails', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    mockMutateAsync.mockRejectedValueOnce(new Error('network'));

    render(<BranchingStoryAnnouncementModal ref={mockRef} />);

    fireEvent.press(screen.getByText('Restart at Branching Point'));

    await waitFor(() => {
      expect(mockPosthogCapture).toHaveBeenCalledWith(
        'storyline_reset_failed',
        expect.objectContaining({ storyline_id: 'vaedros' })
      );
      expect(mockSetHasSeenBranchingAnnouncement).toHaveBeenCalledWith(true);
    });
  });

  it('marks seen and fires analytics on Continue Current Journey', () => {
    render(<BranchingStoryAnnouncementModal ref={mockRef} />);

    fireEvent.press(screen.getByText('Continue Current Journey'));

    expect(mockPosthogCapture).toHaveBeenCalledWith(
      'branching_announcement_declined'
    );
    expect(mockSetHasSeenBranchingAnnouncement).toHaveBeenCalledWith(true);
  });
});
