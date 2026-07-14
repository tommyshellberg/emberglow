import { fireEvent, screen } from '@testing-library/react-native';
import React from 'react';

import { render } from '@/lib/test-utils';
import { useAnnouncementStore } from '@/store/announcement-store';

import { SkillTreeAnnouncementModal } from './skill-tree-announcement-modal';

// Mock router
const mockRouterPush = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: mockRouterPush,
  }),
}));

// Mock PostHog with a function we can inspect
const mockPosthogCapture = jest.fn();
jest.mock('posthog-react-native', () => ({
  usePostHog: () => ({
    capture: mockPosthogCapture,
  }),
}));

// Mock announcement store
jest.mock('@/store/announcement-store', () => ({
  useAnnouncementStore: jest.fn(),
}));

describe('SkillTreeAnnouncementModal', () => {
  const mockSetHasSeenSkillTreeAnnouncement = jest.fn();
  const mockRef = { current: { dismiss: jest.fn() } } as any;

  beforeEach(() => {
    jest.clearAllMocks();

    (useAnnouncementStore as unknown as jest.Mock).mockImplementation(
      (selector) => {
        const store = {
          setHasSeenSkillTreeAnnouncement: mockSetHasSeenSkillTreeAnnouncement,
        };
        return selector(store);
      }
    );
  });

  it('renders modal with correct content', () => {
    render(<SkillTreeAnnouncementModal ref={mockRef} />);

    expect(screen.getByText('New: Skill Trees')).toBeTruthy();
    expect(screen.getByText('Unlock Your First Perk')).toBeTruthy();
    expect(screen.getByText(/You've leveled up enough/)).toBeTruthy();
    expect(screen.getByText('What are Perks?')).toBeTruthy();
    expect(screen.getByText('Explore Skill Tree')).toBeTruthy();
    expect(screen.getByText('Maybe Later')).toBeTruthy();
  });

  it('shows perk benefits in highlight box', () => {
    render(<SkillTreeAnnouncementModal ref={mockRef} />);

    expect(screen.getByText(/Boost your XP gains/)).toBeTruthy();
    expect(screen.getByText(/Unlock special abilities/)).toBeTruthy();
    expect(screen.getByText(/Customize your playstyle/)).toBeTruthy();
  });

  it('navigates to skill tree and marks seen on CTA press', () => {
    render(<SkillTreeAnnouncementModal ref={mockRef} />);

    fireEvent.press(screen.getByText('Explore Skill Tree'));

    expect(mockPosthogCapture).toHaveBeenCalledWith(
      'skill_tree_announcement_accepted'
    );
    expect(mockSetHasSeenSkillTreeAnnouncement).toHaveBeenCalledWith(true);
    expect(mockRouterPush).toHaveBeenCalledWith('/skill-tree');
  });

  it('marks seen and fires analytics on Maybe Later press', () => {
    render(<SkillTreeAnnouncementModal ref={mockRef} />);

    fireEvent.press(screen.getByText('Maybe Later'));

    expect(mockPosthogCapture).toHaveBeenCalledWith(
      'skill_tree_announcement_declined'
    );
    expect(mockSetHasSeenSkillTreeAnnouncement).toHaveBeenCalledWith(true);
  });
});
