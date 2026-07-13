import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import React from 'react';

import { render } from '@/lib/test-utils';

import { GUILD_VALIDATION } from '../../constants/guild-strings';
import { JoinGuildModal } from '../modals/join-guild-modal';

describe('JoinGuildModal', () => {
  const mockOnSubmit = jest.fn();
  const mockOnClose = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render the modal title', () => {
      render(
        <JoinGuildModal
          visible={true}
          onSubmit={mockOnSubmit}
          onClose={mockOnClose}
          isLoading={false}
        />
      );

      expect(screen.getByText('Join a Guild')).toBeTruthy();
    });

    it('should render invite code input', () => {
      render(
        <JoinGuildModal
          visible={true}
          onSubmit={mockOnSubmit}
          onClose={mockOnClose}
          isLoading={false}
        />
      );

      expect(screen.getByTestId('guild-invite-code-input')).toBeTruthy();
    });

    it('should render join button', () => {
      render(
        <JoinGuildModal
          visible={true}
          onSubmit={mockOnSubmit}
          onClose={mockOnClose}
          isLoading={false}
        />
      );

      expect(screen.getByTestId('join-guild-submit')).toBeTruthy();
    });

    it('should render helpful description text', () => {
      render(
        <JoinGuildModal
          visible={true}
          onSubmit={mockOnSubmit}
          onClose={mockOnClose}
          isLoading={false}
        />
      );

      expect(
        screen.getByText(/Got an invite code from a friend/i)
      ).toBeTruthy();
    });

    it('should render cancel button', () => {
      render(
        <JoinGuildModal
          visible={true}
          onSubmit={mockOnSubmit}
          onClose={mockOnClose}
          isLoading={false}
        />
      );

      expect(screen.getByText('Cancel')).toBeTruthy();
    });
  });

  describe('form validation', () => {
    it('should show error when code is empty on submit', async () => {
      render(
        <JoinGuildModal
          visible={true}
          onSubmit={mockOnSubmit}
          onClose={mockOnClose}
          isLoading={false}
        />
      );

      fireEvent.press(screen.getByTestId('join-guild-submit'));

      expect(
        await screen.findByText(GUILD_VALIDATION.INVITE_CODE_REQUIRED)
      ).toBeTruthy();
      expect(mockOnSubmit).not.toHaveBeenCalled();
    });

    it('should show error for invalid code format', async () => {
      render(
        <JoinGuildModal
          visible={true}
          onSubmit={mockOnSubmit}
          onClose={mockOnClose}
          isLoading={false}
        />
      );

      // Enter an invalid code (too short)
      fireEvent.changeText(
        screen.getByTestId('guild-invite-code-input'),
        'abc'
      );

      fireEvent.press(screen.getByTestId('join-guild-submit'));

      expect(
        await screen.findByText(GUILD_VALIDATION.INVITE_CODE_INVALID)
      ).toBeTruthy();
      expect(mockOnSubmit).not.toHaveBeenCalled();
    });
  });

  describe('interactions', () => {
    it('should call onSubmit with code when valid', async () => {
      render(
        <JoinGuildModal
          visible={true}
          onSubmit={mockOnSubmit}
          onClose={mockOnClose}
          isLoading={false}
        />
      );

      // Enter a valid 8-character code
      fireEvent.changeText(
        screen.getByTestId('guild-invite-code-input'),
        'ABCD1234'
      );

      fireEvent.press(screen.getByTestId('join-guild-submit'));

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith('ABCD1234');
      });
    });

    it('should auto-uppercase input', () => {
      render(
        <JoinGuildModal
          visible={true}
          onSubmit={mockOnSubmit}
          onClose={mockOnClose}
          isLoading={false}
        />
      );

      fireEvent.changeText(
        screen.getByTestId('guild-invite-code-input'),
        'abcd1234'
      );

      expect(screen.getByTestId('guild-invite-code-input').props.value).toBe(
        'ABCD1234'
      );
    });

    it('should call onClose when cancel is pressed', () => {
      render(
        <JoinGuildModal
          visible={true}
          onSubmit={mockOnSubmit}
          onClose={mockOnClose}
          isLoading={false}
        />
      );

      fireEvent.press(screen.getByText('Cancel'));

      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  describe('loading state', () => {
    it('should disable submit button when loading', () => {
      render(
        <JoinGuildModal
          visible={true}
          onSubmit={mockOnSubmit}
          onClose={mockOnClose}
          isLoading={true}
        />
      );

      const submitButton = screen.getByTestId('join-guild-submit');
      expect(submitButton.props.accessibilityState?.disabled).toBe(true);
    });
  });

  describe('error handling', () => {
    it('should display error message when provided', () => {
      render(
        <JoinGuildModal
          visible={true}
          onSubmit={mockOnSubmit}
          onClose={mockOnClose}
          isLoading={false}
          error="Invalid invite code"
        />
      );

      expect(screen.getByText('Invalid invite code')).toBeTruthy();
    });
  });
});
