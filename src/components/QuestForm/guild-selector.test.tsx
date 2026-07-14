import React from 'react';

import { fireEvent, render, screen, waitFor } from '@/lib/test-utils';

import { GuildSelector } from './guild-selector';

// Mock the useGuilds hook
const mockGuilds = [
  {
    id: 'guild-1',
    name: 'Test Guild One',
    icon: 'axe' as const,
    tagline: 'A test guild',
    owner: { id: 'owner-1', character: { name: 'Owner', type: 'knight' } },
    members: [
      { id: 'owner-1', character: { name: 'Owner', type: 'knight' } },
      { id: 'member-1', character: { name: 'Member One', type: 'druid' } },
      { id: 'member-2', character: { name: 'Member Two', type: 'wizard' } },
    ],
    stats: { questCount: 10, totalMinutes: 500 },
    createdAt: '2024-01-01',
    updatedAt: '2024-01-01',
  },
  {
    id: 'guild-2',
    name: 'Test Guild Two',
    icon: 'flame' as const,
    tagline: 'Another test guild',
    owner: { id: 'owner-2', character: { name: 'Owner 2', type: 'mage' } },
    members: [
      { id: 'owner-2', character: { name: 'Owner 2', type: 'mage' } },
      { id: 'member-3', character: { name: 'Member Three', type: 'archer' } },
    ],
    stats: { questCount: 5, totalMinutes: 200 },
    createdAt: '2024-01-02',
    updatedAt: '2024-01-02',
  },
];

jest.mock('@/features/guilds', () => ({
  ...jest.requireActual('@/features/guilds'),
  useGuilds: jest.fn(() => ({
    data: mockGuilds,
    isLoading: false,
  })),
}));

// Mock lucide-react-native icons — includes the guild crest icons that
// GuildIcon resolves through getGuildIconComponent.
jest.mock('lucide-react-native', () => ({
  Check: () => null,
  Users: () => null,
  Axe: () => null,
  Coffee: () => null,
  Compass: () => null,
  Flag: () => null,
  Flame: () => null,
  Gem: () => null,
  Hammer: () => null,
  Scroll: () => null,
  Tent: () => null,
  Wand: () => null,
}));

describe('GuildSelector', () => {
  const mockOnSelectionChange = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset the mock to return default data
    const { useGuilds } = require('@/features/guilds');
    useGuilds.mockReturnValue({
      data: mockGuilds,
      isLoading: false,
    });
  });

  it('should render guild list', () => {
    render(
      <GuildSelector
        onSelectionChange={mockOnSelectionChange}
        currentUserId="current-user"
      />
    );

    expect(screen.getByText('Test Guild One')).toBeTruthy();
    expect(screen.getByText('Test Guild Two')).toBeTruthy();
    expect(screen.getByText('A test guild')).toBeTruthy();
  });

  it('should show member counts for each guild', () => {
    render(
      <GuildSelector
        onSelectionChange={mockOnSelectionChange}
        currentUserId="current-user"
      />
    );

    // Guild 1 has 3 members to invite (since current-user is not a member)
    expect(screen.getByText(/3 members to invite/)).toBeTruthy();
    // Guild 2 has 2 members to invite
    expect(screen.getByText(/2 members to invite/)).toBeTruthy();
  });

  it('should call onSelectionChange when guild is selected', async () => {
    render(
      <GuildSelector
        onSelectionChange={mockOnSelectionChange}
        currentUserId="owner-1"
      />
    );

    // Click on the first guild
    const guildOne = screen.getByText('Test Guild One');
    fireEvent.press(guildOne);

    await waitFor(() => {
      // Should be called with guild IDs, guild objects, and member IDs (excluding current user)
      expect(mockOnSelectionChange).toHaveBeenCalledWith(
        ['guild-1'],
        [expect.objectContaining({ id: 'guild-1', name: 'Test Guild One' })],
        ['member-1', 'member-2'] // Excludes owner-1 (current user)
      );
    });
  });

  it('should exclude current user from member IDs', async () => {
    render(
      <GuildSelector
        onSelectionChange={mockOnSelectionChange}
        currentUserId="member-1"
      />
    );

    // Click on the first guild
    const guildOne = screen.getByText('Test Guild One');
    fireEvent.press(guildOne);

    await waitFor(() => {
      // Member IDs should exclude member-1 (current user)
      expect(mockOnSelectionChange).toHaveBeenCalledWith(
        ['guild-1'],
        expect.any(Array),
        expect.arrayContaining(['owner-1', 'member-2'])
      );
      // Should NOT include member-1
      const lastCall = mockOnSelectionChange.mock.calls.slice(-1)[0];
      expect(lastCall[2]).not.toContain('member-1');
    });
  });

  it('should switch selection when different guild is clicked (single select)', async () => {
    render(
      <GuildSelector
        onSelectionChange={mockOnSelectionChange}
        currentUserId="current-user"
      />
    );

    // Click on first guild
    const guildOne = screen.getByText('Test Guild One');
    fireEvent.press(guildOne);

    await waitFor(() => {
      expect(mockOnSelectionChange).toHaveBeenCalledWith(
        ['guild-1'],
        expect.any(Array),
        expect.any(Array)
      );
    });

    // Click on second guild - should replace selection, not add
    const guildTwo = screen.getByText('Test Guild Two');
    fireEvent.press(guildTwo);

    await waitFor(() => {
      const lastCall = mockOnSelectionChange.mock.calls.slice(-1)[0];
      // Should only have guild-2 selected, not both
      expect(lastCall[0]).toEqual(['guild-2']);
    });
  });

  it('should deselect guild when clicked again', async () => {
    render(
      <GuildSelector
        onSelectionChange={mockOnSelectionChange}
        currentUserId="current-user"
      />
    );

    const guildOne = screen.getByText('Test Guild One');

    // Select
    fireEvent.press(guildOne);
    await waitFor(() => {
      expect(mockOnSelectionChange).toHaveBeenCalledWith(
        ['guild-1'],
        expect.any(Array),
        expect.any(Array)
      );
    });

    // Deselect
    fireEvent.press(guildOne);
    await waitFor(() => {
      const lastCall = mockOnSelectionChange.mock.calls.slice(-1)[0];
      expect(lastCall[0]).toEqual([]);
      expect(lastCall[2]).toEqual([]);
    });
  });

  it('should show loading state', () => {
    const { useGuilds } = require('@/features/guilds');
    useGuilds.mockReturnValue({
      data: undefined,
      isLoading: true,
    });

    render(
      <GuildSelector
        onSelectionChange={mockOnSelectionChange}
        currentUserId="current-user"
      />
    );

    // When loading, guild names should not be visible
    expect(screen.queryByText('Test Guild One')).toBeNull();
    expect(screen.queryByText('Test Guild Two')).toBeNull();
  });

  it('should show empty state when no guilds', () => {
    const { useGuilds } = require('@/features/guilds');
    useGuilds.mockReturnValue({
      data: [],
      isLoading: false,
    });

    render(
      <GuildSelector
        onSelectionChange={mockOnSelectionChange}
        currentUserId="current-user"
      />
    );

    expect(screen.getByText(/No guilds to invite/i)).toBeTruthy();
  });
});
