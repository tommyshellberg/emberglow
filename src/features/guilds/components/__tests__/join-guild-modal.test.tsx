import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';
import React from 'react';

import {
  bottomSheetMock,
  resetBottomSheetMock,
} from '@/lib/test-mocks/gorhom-bottom-sheet';
import { render } from '@/lib/test-utils';

import { GUILD_VALIDATION } from '../../constants/guild-strings';
import { JoinGuildModal } from '../modals/join-guild-modal';

// Ref-attaching replacement for jest-setup.ts's sheet mock, whose
// `BottomSheetModal` never receives a ref — under it `present()` / `dismiss()`
// are no-ops and the `onDismiss` prop is unreachable, so none of the close-path
// tests below could observe anything. See the helper for what it models.
jest.mock('@gorhom/bottom-sheet', () =>
  require('@/lib/test-mocks/gorhom-bottom-sheet').createBottomSheetMock()
);

describe('JoinGuildModal', () => {
  const mockOnSubmit = jest.fn();
  const mockOnClose = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    resetBottomSheetMock();
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

  // Nothing here was covered before: every test above renders `visible={true}`
  // and none ever rerenders it false, so neither the effect's close branch nor
  // the dismiss guard ran.
  describe('closing', () => {
    const renderSheet = (visible = true) =>
      render(
        <JoinGuildModal
          visible={visible}
          onSubmit={mockOnSubmit}
          onClose={mockOnClose}
          isLoading={false}
        />
      );

    const rerenderWith = (
      rerender: (ui: React.ReactElement) => void,
      visible: boolean
    ) =>
      rerender(
        <JoinGuildModal
          visible={visible}
          onSubmit={mockOnSubmit}
          onClose={mockOnClose}
          isLoading={false}
        />
      );

    it('dismisses the sheet when the store flips visible to false', () => {
      const { rerender } = renderSheet();

      rerenderWith(rerender, false);

      expect(bottomSheetMock.handle?.dismiss).toHaveBeenCalledTimes(1);
    });

    it('reports a swipe-down or backdrop dismiss through onClose', () => {
      renderSheet();

      // The real gesture lives in the library's native pan handler; invoking the
      // onDismiss prop the sheet hands @gorhom is the synchronous stand-in.
      expect(bottomSheetMock.onDismiss).toBeDefined();
      bottomSheetMock.onDismiss?.();

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    // The bug this fixed: the store answers the report above by flipping
    // `visible` off, and the close branch then fired a second dismiss() at an
    // already-unmounted modal — which parks @gorhom's status at DISMISSING and
    // makes every later present() a no-op, so the sheet never reopened. That
    // consequence lives inside the library, so the call causing it is asserted.
    it('does not dismiss again after the sheet closed itself', () => {
      const { rerender } = renderSheet();

      bottomSheetMock.onDismiss?.();
      expect(mockOnClose).toHaveBeenCalledTimes(1);

      rerenderWith(rerender, false);

      expect(bottomSheetMock.handle).toBeDefined();
      expect(bottomSheetMock.handle?.dismiss).not.toHaveBeenCalled();
    });

    // The effect's close branch owns the form reset and no longer runs for a
    // self-initiated close, so the handler has to do it — otherwise the next
    // open still shows the abandoned code.
    it('clears the typed code when the sheet closes itself', () => {
      renderSheet();

      fireEvent.changeText(
        screen.getByTestId('guild-invite-code-input'),
        'ABCD1234'
      );
      expect(screen.getByTestId('guild-invite-code-input').props.value).toBe(
        'ABCD1234'
      );

      // Wrapped: unlike the other close paths, this one clears form state, so
      // the re-render has to flush before the field is re-read.
      act(() => {
        bottomSheetMock.onDismiss?.();
      });

      expect(screen.getByTestId('guild-invite-code-input').props.value).toBe(
        ''
      );
    });

    it('ignores a dismiss callback for a sheet it never presented', () => {
      renderSheet(false);

      expect(bottomSheetMock.onDismiss).toBeDefined();
      bottomSheetMock.onDismiss?.();

      expect(mockOnClose).not.toHaveBeenCalled();
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
