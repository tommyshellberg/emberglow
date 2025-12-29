import { fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';

import { useSettingsStore } from '@/store/settings-store';

import { GuildsAnnouncementModal } from './guilds-announcement-modal';

// Mock dependencies
const mockRouterPush = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: mockRouterPush,
  }),
}));

jest.mock('posthog-react-native', () => ({
  usePostHog: () => ({
    capture: jest.fn(),
  }),
}));

// Mock UI components
jest.mock('@/components/ui', () => {
  const RN = jest.requireActual('react-native');
  return {
    View: RN.View,
    Text: RN.Text,
    Card: ({ children, ...props }: any) => (
      <RN.View {...props}>{children}</RN.View>
    ),
    Button: ({ label, onPress, ...props }: any) => (
      <RN.Pressable onPress={onPress} {...props}>
        <RN.Text>{label}</RN.Text>
      </RN.Pressable>
    ),
    Modal: ({ children, title }: any) => (
      <RN.View>
        <RN.Text>{title}</RN.Text>
        {children}
      </RN.View>
    ),
  };
});

// Mock GuildIcon component
jest.mock('@/features/guilds/components/guild-icon', () => ({
  GuildIcon: ({ icon }: { icon: string }) => {
    const RN = jest.requireActual('react-native');
    return <RN.Text testID={`guild-icon-${icon}`}>{icon}</RN.Text>;
  },
}));

describe('GuildsAnnouncementModal', () => {
  const mockRef = { current: { dismiss: jest.fn() } };

  beforeEach(() => {
    jest.clearAllMocks();

    // Reset settings store
    useSettingsStore.setState({
      hasSeenGuildsAnnouncement: false,
      setHasSeenGuildsAnnouncement: jest.fn(),
    });
  });

  describe('Rendering', () => {
    it('renders the modal title', () => {
      render(<GuildsAnnouncementModal ref={mockRef as any} />);

      expect(screen.getByText('New: Guilds')).toBeTruthy();
    });

    it('renders the main heading', () => {
      render(<GuildsAnnouncementModal ref={mockRef as any} />);

      expect(screen.getByText('Quest Together')).toBeTruthy();
    });

    it('renders the description text', () => {
      render(<GuildsAnnouncementModal ref={mockRef as any} />);

      expect(
        screen.getByText(/Create a guild with friends or coworkers/i)
      ).toBeTruthy();
    });

    it('renders the guild preview card', () => {
      render(<GuildsAnnouncementModal ref={mockRef as any} />);

      expect(screen.getByText('Morning Runners')).toBeTruthy();
      expect(screen.getByText(/5 members/i)).toBeTruthy();
    });

    it('renders the create guild button', () => {
      render(<GuildsAnnouncementModal ref={mockRef as any} />);

      expect(screen.getByText('Create a Guild')).toBeTruthy();
    });

    it('renders the maybe later option', () => {
      render(<GuildsAnnouncementModal ref={mockRef as any} />);

      expect(screen.getByText('Maybe Later')).toBeTruthy();
    });
  });

  describe('Interactions', () => {
    it('navigates to create guild screen and dismisses when Create a Guild is pressed', () => {
      const mockSetHasSeenGuildsAnnouncement = jest.fn();
      useSettingsStore.setState({
        setHasSeenGuildsAnnouncement: mockSetHasSeenGuildsAnnouncement,
      });

      render(<GuildsAnnouncementModal ref={mockRef as any} />);

      const createButton = screen.getByText('Create a Guild');
      fireEvent.press(createButton);

      expect(mockSetHasSeenGuildsAnnouncement).toHaveBeenCalledWith(true);
      expect(mockRouterPush).toHaveBeenCalledWith('/guild/create');
    });

    it('dismisses modal when Maybe Later is pressed', () => {
      const mockSetHasSeenGuildsAnnouncement = jest.fn();
      useSettingsStore.setState({
        setHasSeenGuildsAnnouncement: mockSetHasSeenGuildsAnnouncement,
      });

      render(<GuildsAnnouncementModal ref={mockRef as any} />);

      const maybeLaterButton = screen.getByText('Maybe Later');
      fireEvent.press(maybeLaterButton);

      expect(mockSetHasSeenGuildsAnnouncement).toHaveBeenCalledWith(true);
    });
  });
});
