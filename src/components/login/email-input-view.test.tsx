import * as Linking from 'expo-linking';
import * as React from 'react';

import { render, screen } from '@/lib/test-utils';

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
