import { fireEvent, screen } from '@testing-library/react-native';
import React from 'react';

import { render } from '@/lib/test-utils';
import { useAnnouncementStore } from '@/store/announcement-store';

import { GuildsAnnouncementModal } from './guilds-announcement-modal';

// Mock dependencies
const mockRouterPush = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: mockRouterPush,
  }),
}));

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

// Mock GuildIcon component
jest.mock('@/features/guilds/components/guild-icon', () => ({
  GuildIcon: ({ icon }: { icon: string }) => {
    const RN = jest.requireActual('react-native');
    return <RN.Text testID={`guild-icon-${icon}`}>{icon}</RN.Text>;
  },
}));

describe('GuildsAnnouncementModal', () => {
  const mockSetHasSeenGuildsAnnouncement = jest.fn();
  const mockRef = { current: { dismiss: jest.fn() } } as any;

  beforeEach(() => {
    jest.clearAllMocks();

    (useAnnouncementStore as unknown as jest.Mock).mockImplementation(
      (selector) => {
        const store = {
          setHasSeenGuildsAnnouncement: mockSetHasSeenGuildsAnnouncement,
        };
        return selector(store);
      }
    );
  });

  describe('Rendering', () => {
    it('renders the modal title', () => {
      render(<GuildsAnnouncementModal ref={mockRef} />);

      expect(screen.getByText('New: Guilds')).toBeTruthy();
    });

    it('renders the main heading', () => {
      render(<GuildsAnnouncementModal ref={mockRef} />);

      expect(screen.getByText('Quest Together')).toBeTruthy();
    });

    it('renders the description text', () => {
      render(<GuildsAnnouncementModal ref={mockRef} />);

      expect(
        screen.getByText(/Create a guild with friends or coworkers/i)
      ).toBeTruthy();
    });

    it('renders the guild preview card', () => {
      render(<GuildsAnnouncementModal ref={mockRef} />);

      expect(screen.getByText('Morning Runners')).toBeTruthy();
      expect(screen.getByText(/5 members/i)).toBeTruthy();
    });

    it('renders the create guild button', () => {
      render(<GuildsAnnouncementModal ref={mockRef} />);

      expect(screen.getByText('Create a Guild')).toBeTruthy();
    });

    it('renders the maybe later option', () => {
      render(<GuildsAnnouncementModal ref={mockRef} />);

      expect(screen.getByText('Maybe Later')).toBeTruthy();
    });
  });

  describe('Interactions', () => {
    it('navigates to create guild screen and dismisses when Create a Guild is pressed', () => {
      render(<GuildsAnnouncementModal ref={mockRef} />);

      fireEvent.press(screen.getByText('Create a Guild'));

      expect(mockPosthogCapture).toHaveBeenCalledWith(
        'guilds_announcement_accepted'
      );
      expect(mockSetHasSeenGuildsAnnouncement).toHaveBeenCalledWith(true);
      expect(mockRouterPush).toHaveBeenCalledWith('/guild/create');
    });

    it('dismisses modal when Maybe Later is pressed', () => {
      render(<GuildsAnnouncementModal ref={mockRef} />);

      fireEvent.press(screen.getByText('Maybe Later'));

      expect(mockPosthogCapture).toHaveBeenCalledWith(
        'guilds_announcement_declined'
      );
      expect(mockSetHasSeenGuildsAnnouncement).toHaveBeenCalledWith(true);
    });
  });
});
