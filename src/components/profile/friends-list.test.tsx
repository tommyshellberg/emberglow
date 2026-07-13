import { fireEvent, screen } from '@testing-library/react-native';
import React from 'react';

import { render } from '@/lib/test-utils';

import { FriendsList } from './friends-list';

const noop = () => {};

const baseProps = {
  isLoading: false,
  onInvite: jest.fn(),
  onDelete: jest.fn(),
  onRescind: jest.fn(),
  onAccept: jest.fn(),
  onReject: jest.fn(),
  isOutgoingInvitation: () => false,
  acceptMutation: { isPending: false, variables: undefined },
  rejectMutation: { isPending: false, variables: undefined },
  rescindMutation: { isPending: false, variables: undefined },
  userEmail: 'me@example.com',
};

const friendItem = {
  type: 'friend' as const,
  id: 'friend-1',
  data: {
    _id: 'friend-1',
    email: 'friend@example.com',
    character: { name: 'Aria', type: 'warrior', level: 3 },
  },
};

describe('FriendsList', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('empty state', () => {
    it('omits the header invite button and shows the empty-state invite button', () => {
      render(<FriendsList {...baseProps} combinedData={[]} onInvite={noop} />);

      expect(
        screen.queryByTestId('invite-friends-button')
      ).not.toBeOnTheScreen();
      expect(screen.getByText('Invite friends')).toBeOnTheScreen();
    });

    it('calls onInvite when the empty-state invite button is pressed', () => {
      const onInvite = jest.fn();
      render(
        <FriendsList {...baseProps} combinedData={[]} onInvite={onInvite} />
      );

      fireEvent.press(screen.getByText('Invite friends'));

      expect(onInvite).toHaveBeenCalledTimes(1);
    });

    it('renders the enticing headline and subtext', () => {
      render(<FriendsList {...baseProps} combinedData={[]} onInvite={noop} />);

      expect(screen.getByText('Bring your circle along')).toBeOnTheScreen();
      expect(
        screen.getByText("Don't see someone you want to connect with?")
      ).toBeOnTheScreen();
    });
  });

  describe('non-empty state', () => {
    it('keeps the header invite button when there are friends', () => {
      render(
        <FriendsList
          {...baseProps}
          combinedData={[friendItem]}
          onInvite={noop}
        />
      );

      expect(screen.getByTestId('invite-friends-button')).toBeOnTheScreen();
    });

    it('does not render the empty-state card when there are friends', () => {
      render(
        <FriendsList
          {...baseProps}
          combinedData={[friendItem]}
          onInvite={noop}
        />
      );

      expect(screen.queryByText('Invite friends')).not.toBeOnTheScreen();
    });
  });
});
