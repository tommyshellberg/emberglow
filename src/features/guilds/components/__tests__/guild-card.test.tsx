import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';

import { GuildCard } from '../guild-card';
import type { Guild } from '../../types/guild-types';

// Mock the GuildIcon component
jest.mock('../guild-icon', () => ({
  GuildIcon: ({ icon }: { icon: string }) => {
    const RN = jest.requireActual('react-native');
    return <RN.Text testID={`guild-icon-${icon}`}>{icon}</RN.Text>;
  },
}));

// Mock guild data
const createMockGuild = (overrides?: Partial<Guild>): Guild => ({
  id: 'guild-123',
  name: 'Morning Warriors',
  icon: 'flame',
  tagline: 'Rise and disconnect',
  owner: {
    id: 'user-1',
    email: 'owner@example.com',
    character: { name: 'Alex', type: 'knight' },
  },
  members: [
    {
      id: 'user-1',
      email: 'owner@example.com',
      character: { name: 'Alex', type: 'knight' },
    },
    {
      id: 'user-2',
      email: 'member@example.com',
      character: { name: 'Jordan', type: 'wizard' },
    },
    {
      id: 'user-3',
      email: 'member2@example.com',
      character: { name: 'Sam', type: 'druid' },
    },
  ],
  stats: {
    questCount: 47,
    totalMinutes: 1240,
  },
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-15T00:00:00.000Z',
  ...overrides,
});

describe('GuildCard', () => {
  const mockOnPress = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render guild name', () => {
      const guild = createMockGuild();
      const { getByText } = render(
        <GuildCard guild={guild} onPress={mockOnPress} />
      );

      expect(getByText('Morning Warriors')).toBeTruthy();
    });

    it('should render guild tagline when present', () => {
      const guild = createMockGuild();
      const { getByText } = render(
        <GuildCard guild={guild} onPress={mockOnPress} />
      );

      expect(getByText('Rise and disconnect')).toBeTruthy();
    });

    it('should render member count', () => {
      const guild = createMockGuild();
      const { getByText } = render(
        <GuildCard guild={guild} onPress={mockOnPress} />
      );

      expect(getByText('3 members')).toBeTruthy();
    });

    it('should render singular member text for 1 member', () => {
      const guild = createMockGuild({
        members: [
          {
            id: 'user-1',
            email: 'owner@example.com',
            character: { name: 'Alex', type: 'knight' },
          },
        ],
      });
      const { getByText } = render(
        <GuildCard guild={guild} onPress={mockOnPress} />
      );

      expect(getByText('1 member')).toBeTruthy();
    });

    it('should render guild icon', () => {
      const guild = createMockGuild({ icon: 'flame' });
      const { getByTestId } = render(
        <GuildCard guild={guild} onPress={mockOnPress} />
      );

      expect(getByTestId('guild-icon-flame')).toBeTruthy();
    });

    it('should not render tagline when not present', () => {
      const guild = createMockGuild({ tagline: undefined });
      const { queryByText } = render(
        <GuildCard guild={guild} onPress={mockOnPress} />
      );

      expect(queryByText('Rise and disconnect')).toBeNull();
    });
  });

  describe('interactions', () => {
    it('should call onPress when card is pressed', () => {
      const guild = createMockGuild();
      const { getByTestId } = render(
        <GuildCard guild={guild} onPress={mockOnPress} />
      );

      fireEvent.press(getByTestId('guild-card'));

      expect(mockOnPress).toHaveBeenCalledTimes(1);
    });
  });

  describe('owner badge', () => {
    it('should show owner indicator when isOwner is true', () => {
      const guild = createMockGuild();
      const { getByTestId } = render(
        <GuildCard guild={guild} onPress={mockOnPress} isOwner={true} />
      );

      expect(getByTestId('owner-badge')).toBeTruthy();
    });

    it('should not show owner indicator when isOwner is false', () => {
      const guild = createMockGuild();
      const { queryByTestId } = render(
        <GuildCard guild={guild} onPress={mockOnPress} isOwner={false} />
      );

      expect(queryByTestId('owner-badge')).toBeNull();
    });

    it('should not show owner indicator when isOwner is not provided', () => {
      const guild = createMockGuild();
      const { queryByTestId } = render(
        <GuildCard guild={guild} onPress={mockOnPress} />
      );

      expect(queryByTestId('owner-badge')).toBeNull();
    });
  });

  describe('accessibility', () => {
    it('should have proper accessibility label', () => {
      const guild = createMockGuild();
      const { getByLabelText } = render(
        <GuildCard guild={guild} onPress={mockOnPress} />
      );

      expect(
        getByLabelText('Morning Warriors guild with 3 members. Tap to view details.')
      ).toBeTruthy();
    });

    it('should have button role', () => {
      const guild = createMockGuild();
      const { getByRole } = render(
        <GuildCard guild={guild} onPress={mockOnPress} />
      );

      expect(getByRole('button')).toBeTruthy();
    });
  });
});
