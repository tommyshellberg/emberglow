import * as Linking from 'expo-linking';
import * as React from 'react';
import { StyleSheet } from 'react-native';

import { fireEvent, render, screen, setup } from '@/lib/test-utils';

import { EmailInputView } from './email-input-view';

jest.mock('expo-linking', () => ({ openURL: jest.fn() }));

// RNTL 13 skips accessibility-hidden elements by default, so a bare
// `queryBy*` returning null is not proof of absence (see
// chooser-view.test.tsx / social-divider.test.tsx for the same trap on this
// branch — a "the divider is gone" test once passed with the divider fully
// present because of this default).
const hidden = { includeHiddenElements: true } as const;

const renderView = (
  props: Partial<React.ComponentProps<typeof EmailInputView>> = {}
) => {
  const onSubmit = jest.fn();
  const view = render(
    <EmailInputView
      onSubmit={onSubmit}
      isLoading={false}
      error=""
      title="Welcome back"
      subtitle="Enter your email to get a sign-in link."
      {...props}
    />
  );
  return { ...view, onSubmit };
};

describe('EmailInputView', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders the title and subtitle supplied by the caller', () => {
    renderView({
      title: 'Save your progress',
      subtitle: "Keep Thornwake and everything you've earned.",
    });

    expect(screen.getByText('Save your progress')).toBeOnTheScreen();
    expect(
      screen.getByText("Keep Thornwake and everything you've earned.")
    ).toBeOnTheScreen();
  });

  it('shows the shared error banner when there is an error to show', () => {
    renderView({ error: 'Login link failed to send. Please try again.' });

    expect(screen.getByTestId('error-message', hidden)).toBeOnTheScreen();
    expect(
      screen.getByText('Login link failed to send. Please try again.')
    ).toBeOnTheScreen();
  });

  it('renders no error banner when there is no error', () => {
    renderView({ error: '' });

    expect(screen.queryByTestId('error-message', hidden)).toBeNull();
  });

  describe('while the link is being sent', () => {
    /**
     * A send is only ever in flight for an address that passed validation, so
     * the field MUST hold a valid one here. With it left empty, `disabled`
     * is true on the email alone and every assertion below passes for the
     * wrong reason — the dim and the blocked press would both be the invalid
     * address talking, with `isLoading` contributing nothing.
     */
    const renderSending = () => {
      const onSubmit = jest.fn();
      const { user } = setup(
        <EmailInputView
          onSubmit={onSubmit}
          isLoading
          error=""
          title="Welcome back"
          subtitle="Enter your email to get a sign-in link."
        />
      );
      fireEvent.changeText(
        screen.getByTestId('email-input'),
        'rowan@ember.app'
      );
      return { onSubmit, user };
    };

    it('keeps the spinner at full strength — dimming it reads as broken, not busy', () => {
      renderSending();

      const button = screen.getByTestId('login-button');
      // `disabled` carries a 40% dim (button.tsx's `styles.disabled`), which
      // it used to apply to this button and therefore to the spinner inside.
      expect(StyleSheet.flatten(button.props.style).opacity).toBeUndefined();
      expect(button.props.accessibilityState.busy).toBe(true);
    });

    it('still refuses a second send while one is in flight', async () => {
      const { onSubmit, user } = renderSending();

      await user.press(screen.getByTestId('login-button'));

      // The other half of the split: `busy` has to keep blocking presses now
      // that `disabled` no longer covers the in-flight case.
      expect(onSubmit).not.toHaveBeenCalled();
    });
  });

  // Spec §3: legal text now lives on the chooser only — every user passes
  // through it before any auth path (mode-neutral "Continue with..."
  // buttons), so consent is captured once, earlier, rather than repeated
  // here. This view no longer owns a Terms link at all.
  it('renders no Terms link — that consent point moved to the chooser', () => {
    renderView();

    // Regex rather than the old exact copy so a reworded (but still present)
    // Terms line would still be caught, not just this literal string.
    expect(screen.queryAllByText(/terms/i, hidden)).toHaveLength(0);
    expect(screen.queryByRole('link', hidden)).toBeNull();
    expect(Linking.openURL).not.toHaveBeenCalled();
  });
});
