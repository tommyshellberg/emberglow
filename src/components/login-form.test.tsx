import * as Linking from 'expo-linking';
import React from 'react';

import { requestMagicLink } from '@/api/auth';
import {
  act,
  cleanup,
  fireEvent,
  screen,
  setup,
  waitFor,
} from '@/lib/test-utils';
import { useCharacterStore } from '@/store/character-store';

import { TERMS_URL } from './login/constants';
import type { LoginFormProps } from './login-form';
import { LoginForm } from './login-form';

afterEach(() => {
  cleanup();
  jest.clearAllMocks();
  useCharacterStore.setState({ character: null });
});

const onSubmitMock: jest.Mock<LoginFormProps['onSubmit']> = jest.fn();

// Mock the requestMagicLink function
jest.mock('@/api/auth', () => ({
  requestMagicLink: jest.fn(),
}));

// Stable capture fn so assertions can see calls — a fresh object per
// usePostHog() call (as an inline factory would produce) would give every
// render its own throwaway `capture`, making call assertions impossible
// (same fix as quest-completed-signup.test.tsx / verify.test.tsx).
const mockPosthogCapture = jest.fn();
jest.mock('posthog-react-native', () => ({
  usePostHog: () => ({
    capture: mockPosthogCapture,
  }),
}));

// Mock expo-linking
jest.mock('expo-linking', () => ({
  openURL: jest.fn(),
}));

// Mock expo-router's imperative `router` — LoginForm's social sign-in
// routing calls `router.replace` directly (mirroring verify.tsx), same
// pattern as quest-completed-signup.test.tsx.
const mockRouterReplace = jest.fn();
jest.mock('expo-router', () => ({
  router: {
    replace: (...args: unknown[]) => mockRouterReplace(...args),
  },
}));

// Mock SocialSignInButtons — this suite only tests LoginForm's placement of
// and wiring to the component (its own behavior, e.g. credential exchange,
// cancellation, outcome-based toasts, is covered exhaustively by
// social-sign-in-buttons.test.tsx). The stub exposes one press target per
// onSuccess/onError scenario LoginForm needs to route or map.
jest.mock('./login/social-sign-in-buttons', () => {
  const { Pressable } = jest.requireActual('react-native');
  return {
    SocialSignInButtons: ({
      onSuccess,
      onError,
    }: {
      onSuccess: (target: string, outcome: string, provider: string) => void;
      onError: (kind: 'email-in-use' | 'generic') => void;
    }) => (
      <>
        <Pressable
          testID="mock-social-success-app-login"
          onPress={() => onSuccess('app', 'login', 'google')}
        />
        <Pressable
          testID="mock-social-success-app-created"
          onPress={() => onSuccess('app', 'created', 'google')}
        />
        <Pressable
          testID="mock-social-success-onboarding-target"
          onPress={() => onSuccess('onboarding', 'login', 'google')}
        />
        <Pressable
          testID="mock-social-error-email-in-use"
          onPress={() => onError('email-in-use')}
        />
        <Pressable
          testID="mock-social-error-generic"
          onPress={() => onError('generic')}
        />
      </>
    ),
  };
});

const mockedRequestMagicLink = requestMagicLink as jest.MockedFunction<
  typeof requestMagicLink
>;

// RNTL 13 sets `defaultIncludeHiddenElements: false`, so a bare `queryBy*`
// returning null proves absence only from the VISIBLE tree — an earlier task in
// this plan shipped a "the divider is gone" test that passed with the divider
// fully present. Every absence assertion below passes this — including the two
// pre-existing bare-form ones, converted rather than exempted, so the claim
// stays true for the whole file instead of being narrowed to describe it.
const hidden = { includeHiddenElements: true } as const;

/**
 * Occurrences of `needle` in the rendered tree's serialized JSON.
 *
 * A second, independent read of the same fact: it does not go through RNTL's
 * query layer at all, so an "absent" or "exactly once" claim does not rest on
 * the same hidden-element default that has already produced a false "it's gone"
 * here. Used alongside the query-based assertions, not instead of them.
 */
const rawCount = (needle: string): number =>
  JSON.stringify(screen.toJSON()).split(needle).length - 1;

// The legal line's opening fragment, and it has to be exactly this. Not the
// whole sentence: the link is a nested <Text>, so the full string never appears
// contiguously in the serialized tree. Not with a trailing space either — the
// JSX writes `our{' '}`, and that `{' '}` is a separate child, so the space is
// its own string in the serialized children array. Both mistakes make the count
// read 0 no matter what rendered, i.e. they turn this counter vacuous in the
// dangerous direction. This fragment appears exactly once per instance.
const LEGAL_LEAD = 'By continuing you agree to our';
const LEGAL_SENTENCE =
  'By continuing you agree to our Terms and Privacy Policy.';

// Deliberately not 'your hero': that is `copy.ts`'s missing-name fallback, so a
// fixture equal to it could not tell "read the store" from "defaulted".
const HERO_NAME = 'Thornwake';

const giveTheUserAHero = () =>
  useCharacterStore.setState({
    character: { type: 'knight', name: HERO_NAME, level: 3, currentXP: 250 },
  });

/**
 * Renders and advances to the email step.
 *
 * Needed by every test about the email form: `signin` — the default intent —
 * now starts on the chooser, so `email-input` / `login-button` are one press
 * away rather than on screen at mount.
 */
const setupOnEmailStep = async (props: LoginFormProps = {}) => {
  const utils = setup(<LoginForm {...props} />);
  await utils.user.press(screen.getByTestId('continue-with-email-button'));
  return utils;
};

/** A 500 from the magic-link endpoint, in the shape axios actually throws. */
const serverError = () =>
  Object.assign(new Error('Request failed with status code 500'), {
    response: { status: 500, data: { message: 'Internal server error' } },
    config: {},
    isAxiosError: true,
  });

/**
 * Holds the next send in flight so a test can act during the request window.
 *
 * That window is where two reachable bugs lived: the back link was live while
 * `isLoading`, so a user could leave the email step and have the send's outcome
 * land on a step that never asked for it.
 */
const deferredSend = () => {
  let settle!: { resolve: () => void; reject: (reason: unknown) => void };
  mockedRequestMagicLink.mockImplementationOnce(
    () =>
      new Promise<void>((resolve, reject) => {
        settle = { resolve: () => resolve(), reject };
      })
  );
  const flush = async (fire: () => void) => {
    await act(async () => {
      fire();
      await Promise.resolve();
    });
  };
  return {
    resolve: () => flush(() => settle.resolve()),
    reject: (reason: unknown) => flush(() => settle.reject(reason)),
  };
};

/** Reaches the `sent` step from the email step via a successful send. */
const sendFrom = async (user: ReturnType<typeof setup>['user']) => {
  const button = screen.getByTestId('login-button');
  await waitFor(() => {
    expect(button.props.accessibilityState?.disabled).not.toBe(true);
  });
  await user.press(button);
  await waitFor(() => {
    expect(screen.getByText(/Check your inbox/i)).toBeOnTheScreen();
  });
};

describe('LoginForm Form ', () => {
  beforeEach(() => {
    mockedRequestMagicLink.mockResolvedValue({ success: true });
  });

  it('renders correctly', async () => {
    setup(<LoginForm />);
    expect(await screen.findByText(/emberglow/i)).toBeOnTheScreen();
  });

  it('should disable button when email is empty', async () => {
    await setupOnEmailStep();

    const button = screen.getByTestId('login-button');

    // Button should be disabled when email is empty
    expect(button.props.accessibilityState?.disabled).toBe(true);
  });

  it('should disable button when email is invalid', async () => {
    const { user } = await setupOnEmailStep();

    const button = screen.getByTestId('login-button');
    const emailInput = screen.getByTestId('email-input');

    await user.type(emailInput, 'yyyyy');

    // Button should remain disabled for invalid email
    expect(button.props.accessibilityState?.disabled).toBe(true);
  });

  it('Should call onSubmit with correct values when email is valid', async () => {
    const { user } = await setupOnEmailStep({ onSubmit: onSubmitMock });

    const button = screen.getByTestId('login-button');
    const emailInput = screen.getByTestId('email-input');

    await user.type(emailInput, 'youssef@gmail.com');

    // Wait for button to become enabled
    await waitFor(
      () => {
        expect(button.props.accessibilityState?.disabled).not.toBe(true);
      },
      { timeout: 3000 }
    );

    await user.press(button);

    await waitFor(
      () => {
        expect(onSubmitMock).toHaveBeenCalledTimes(1);
      },
      { timeout: 3000 }
    );

    // Update expectation to match actual call pattern
    expect(onSubmitMock).toHaveBeenCalledWith({
      email: 'youssef@gmail.com',
    });
  });

  it('should show success message with email address after sending email', async () => {
    const { user } = await setupOnEmailStep();

    const button = screen.getByTestId('login-button');
    const emailInput = screen.getByTestId('email-input');
    const testEmail = 'test@example.com';

    await user.type(emailInput, testEmail);

    // Wait for button to become enabled
    await waitFor(
      () => {
        expect(button.props.accessibilityState?.disabled).not.toBe(true);
      },
      { timeout: 3000 }
    );

    await user.press(button);

    // Wait for all success elements in a single waitFor
    await waitFor(
      () => {
        const successMessages = screen.queryAllByText(/Check your inbox/i);
        expect(successMessages.length).toBeGreaterThan(0);
        expect(screen.getByText(testEmail)).toBeOnTheScreen();
        expect(screen.getByText(/Change email/i)).toBeOnTheScreen();
      },
      { timeout: 3000 }
    );
  });

  it('should return to email form when "Change email" is clicked', async () => {
    const { user } = await setupOnEmailStep();

    // First submit the form
    const button = screen.getByTestId('login-button');
    const emailInput = screen.getByTestId('email-input');
    await user.type(emailInput, 'test@example.com');

    await waitFor(
      () => {
        expect(button.props.accessibilityState?.disabled).not.toBe(true);
      },
      { timeout: 3000 }
    );

    await user.press(button);

    // Wait for the success screen
    await waitFor(
      () => {
        expect(screen.getByText(/Check your inbox/i)).toBeOnTheScreen();
      },
      { timeout: 3000 }
    );

    // Click "Change email"
    const changeEmailLink = screen.getByText(/Change email/i);
    await user.press(changeEmailLink);

    // Check for both elements in a single waitFor
    await waitFor(
      () => {
        expect(screen.getByTestId('email-input')).toBeOnTheScreen();
        expect(screen.getByText(/Send sign-in link/i)).toBeOnTheScreen();
      },
      { timeout: 3000 }
    );
  });

  it('should show specific error message for 409 email already in use', async () => {
    // Mock axios error structure to simulate what the actual axios lib would return
    const axiosError = new Error('Request failed with status code 409');
    Object.assign(axiosError, {
      response: {
        status: 409,
        data: { message: 'mail address is already in use by another account' },
      },
      config: {},
      isAxiosError: true,
    });

    mockedRequestMagicLink.mockRejectedValueOnce(axiosError);

    const { user } = await setupOnEmailStep();

    const button = screen.getByTestId('login-button');
    const emailInput = screen.getByTestId('email-input');
    const testEmail = 'existing@example.com';

    await user.type(emailInput, testEmail);

    // Wait for button to become enabled
    await waitFor(
      () => {
        expect(button.props.accessibilityState?.disabled).not.toBe(true);
      },
      { timeout: 3000 }
    );

    await user.press(button);

    // Wait for the specific 409 error message
    await waitFor(() => {
      expect(
        screen.getByText(
          /This email address is already associated with an account/i
        )
      ).toBeOnTheScreen();
    });

    // Verify the form stays in the email input state (doesn't show success)
    expect(screen.getByTestId('email-input')).toBeOnTheScreen();

    // Verify the success message is NOT shown
    expect(screen.queryByText(/Check your inbox/i, hidden)).toBeNull();
  });

  it('should show timeout error message', async () => {
    const axiosError = new Error('timeout of 10000ms exceeded');
    Object.assign(axiosError, {
      code: 'ECONNABORTED',
      config: {},
      isAxiosError: true,
    });

    mockedRequestMagicLink.mockRejectedValueOnce(axiosError);

    const { user } = await setupOnEmailStep();

    const button = screen.getByTestId('login-button');
    const emailInput = screen.getByTestId('email-input');

    await user.type(emailInput, 'test@example.com');

    await waitFor(
      () => {
        expect(button.props.accessibilityState?.disabled).not.toBe(true);
      },
      { timeout: 3000 }
    );

    await user.press(button);

    await waitFor(() => {
      expect(
        screen.getByText(/Request timed out. Please try again./i)
      ).toBeOnTheScreen();
    });
  });

  it('should show network error message', async () => {
    const axiosError = new Error('Network Error');
    Object.assign(axiosError, {
      config: {},
      isAxiosError: true,
      // No response property means network error
    });

    mockedRequestMagicLink.mockRejectedValueOnce(axiosError);

    const { user } = await setupOnEmailStep();

    const button = screen.getByTestId('login-button');
    const emailInput = screen.getByTestId('email-input');

    await user.type(emailInput, 'test@example.com');

    await waitFor(
      () => {
        expect(button.props.accessibilityState?.disabled).not.toBe(true);
      },
      { timeout: 3000 }
    );

    await user.press(button);

    await waitFor(() => {
      expect(
        screen.getByText(
          /Network error. Please check your connection and try again./i
        )
      ).toBeOnTheScreen();
    });
  });

  it('should show generic server error for 500 status', async () => {
    const axiosError = new Error('Request failed with status code 500');
    Object.assign(axiosError, {
      response: {
        status: 500,
        data: { message: 'Internal server error' },
      },
      config: {},
      isAxiosError: true,
    });

    mockedRequestMagicLink.mockRejectedValueOnce(axiosError);

    const { user } = await setupOnEmailStep();

    const button = screen.getByTestId('login-button');
    const emailInput = screen.getByTestId('email-input');

    await user.type(emailInput, 'test@example.com');

    await waitFor(
      () => {
        expect(button.props.accessibilityState?.disabled).not.toBe(true);
      },
      { timeout: 3000 }
    );

    await user.press(button);

    await waitFor(() => {
      expect(
        screen.getByText(/Login link failed to send. Please try again./i)
      ).toBeOnTheScreen();
    });
  });

  it('should show generic error for unknown errors', async () => {
    const unknownError = new Error('Something went wrong');

    mockedRequestMagicLink.mockRejectedValueOnce(unknownError);

    const { user } = await setupOnEmailStep();

    const button = screen.getByTestId('login-button');
    const emailInput = screen.getByTestId('email-input');

    await user.type(emailInput, 'test@example.com');

    await waitFor(
      () => {
        expect(button.props.accessibilityState?.disabled).not.toBe(true);
      },
      { timeout: 3000 }
    );

    await user.press(button);

    await waitFor(() => {
      expect(
        screen.getByText(/Login link failed to send. Please try again./i)
      ).toBeOnTheScreen();
    });
  });

  it('should allow sending email again from success screen', async () => {
    const { user } = await setupOnEmailStep();

    // First send
    const emailInput = screen.getByTestId('email-input');
    await user.type(emailInput, 'test@example.com');

    const button = screen.getByTestId('login-button');
    await waitFor(
      () => {
        expect(button.props.accessibilityState?.disabled).not.toBe(true);
      },
      { timeout: 3000 }
    );

    await user.press(button);

    // Wait for success screen
    await waitFor(() => {
      expect(screen.getByText(/Check your inbox/i)).toBeOnTheScreen();
    });

    // Click "Resend link" button
    const sendAgainButton = screen.getByText(/Resend link/i);
    await user.press(sendAgainButton);

    // Verify requestMagicLink was called twice
    await waitFor(() => {
      expect(mockedRequestMagicLink).toHaveBeenCalledTimes(2);
    });
  });

  it('should surface a resend error in the sent view without leaving it', async () => {
    const { user } = await setupOnEmailStep();

    // Reach the sent view via a successful first send
    const emailInput = screen.getByTestId('email-input');
    await user.type(emailInput, 'test@example.com');

    const button = screen.getByTestId('login-button');
    await waitFor(
      () => {
        expect(button.props.accessibilityState?.disabled).not.toBe(true);
      },
      { timeout: 3000 }
    );
    await user.press(button);

    await waitFor(() => {
      expect(screen.getByText(/Check your inbox/i)).toBeOnTheScreen();
    });

    // Resend fails
    const axiosError = new Error('Request failed with status code 500');
    Object.assign(axiosError, {
      response: {
        status: 500,
        data: { message: 'Internal server error' },
      },
      config: {},
      isAxiosError: true,
    });
    mockedRequestMagicLink.mockRejectedValueOnce(axiosError);

    await user.press(screen.getByText(/Resend link/i));

    // The error is rendered in the sent view's footnote slot (previously a
    // silent failure: the hook set `error` but the sent view never showed it)
    await waitFor(() => {
      expect(
        screen.getByText(/Login link failed to send. Please try again./i)
      ).toBeOnTheScreen();
    });

    // ...while the sent view is still shown (no bounce back to the form)
    expect(screen.getByText(/Check your inbox/i)).toBeOnTheScreen();

    // The default spam hint yields the footnote slot to the error
    expect(screen.queryByText(/Check your spam folder/i, hidden)).toBeNull();
  });

  it('should show contact support link after 3 failed attempts', async () => {
    const { user } = await setupOnEmailStep();

    const emailInput = screen.getByTestId('email-input');
    await user.type(emailInput, 'test@example.com');

    // First send - success
    const button = screen.getByTestId('login-button');
    await waitFor(
      () => {
        expect(button.props.accessibilityState?.disabled).not.toBe(true);
      },
      { timeout: 3000 }
    );
    await user.press(button);

    await waitFor(() => {
      expect(screen.getByText(/Check your inbox/i)).toBeOnTheScreen();
    });

    // Send again (attempt 2)
    await user.press(screen.getByText(/Resend link/i));
    await waitFor(() => {
      expect(mockedRequestMagicLink).toHaveBeenCalledTimes(2);
    });

    // Send again (attempt 3) - should show support link
    await user.press(screen.getByText(/Resend link/i));
    await waitFor(() => {
      expect(screen.getByText(/hello@emberglowapp.com/i)).toBeOnTheScreen();
    });
  });

  it('should display initial error from props', async () => {
    const errorMessage = 'Magic link expired';
    setup(<LoginForm initialError={errorMessage} />);

    await waitFor(() => {
      expect(screen.getByText(errorMessage)).toBeOnTheScreen();
    });

    // On the chooser's banner, which is where a returning user starts and
    // therefore where an expired-link redirect lands them — not the sent view.
    expect(screen.getByTestId('continue-with-email-button')).toBeOnTheScreen();
    expect(screen.queryByText(/Check your inbox/i, hidden)).toBeNull();
  });

  it('should show error when trying to submit invalid email', async () => {
    const { user } = await setupOnEmailStep();

    const emailInput = screen.getByTestId('email-input');
    await user.type(emailInput, 'notanemail');

    const button = screen.getByTestId('login-button');

    // Button should be disabled
    expect(button.props.accessibilityState?.disabled).toBe(true);

    // Try to press it anyway (simulating force press)
    await user.press(button);

    // Should not have called the API
    expect(mockedRequestMagicLink).not.toHaveBeenCalled();
  });

  describe('Intent framing', () => {
    it('titles the email step for a returning user by default', async () => {
      await setupOnEmailStep();

      expect(await screen.findByText('Sign in with email')).toBeOnTheScreen();
      expect(
        screen.getByText(
          "We'll send a sign-in link to your email. No password needed."
        )
      ).toBeOnTheScreen();
    });

    it('titles the email step as a signup when converting a provisional account', async () => {
      setup(<LoginForm intent="convert" />);

      expect(await screen.findByText('Sign up with email')).toBeOnTheScreen();
      // The subtitle is shared copy — the framing changes, the mechanic
      // (a link, no password) does not.
      expect(
        screen.getByText(
          "We'll send a sign-in link to your email. No password needed."
        )
      ).toBeOnTheScreen();
    });
  });

  describe('Social sign-in', () => {
    it('renders the social sign-in options on the first step a user reaches', async () => {
      setup(<LoginForm />);

      expect(await screen.findByText(/emberglow/i)).toBeOnTheScreen();
      expect(
        screen.getByTestId('mock-social-success-app-login')
      ).toBeOnTheScreen();
      // The email form is no longer stacked underneath them — it is the next
      // step, behind "Continue with email".
      expect(
        screen.getByTestId('continue-with-email-button')
      ).toBeOnTheScreen();
      expect(screen.queryByTestId('email-input', hidden)).toBeNull();
    });

    it('renders the "or" divider separating the social options from the email option', async () => {
      setup(<LoginForm />);

      expect(await screen.findByText(/emberglow/i)).toBeOnTheScreen();
      // `SocialSignInButtons` used to render this divider itself; the chooser
      // owns it now. `includeHiddenElements` is required — the divider is
      // decorative and hides itself from assistive tech, so RNTL's default
      // query would miss it whether or not it rendered.
      expect(
        screen.getByTestId('social-signin-divider', {
          includeHiddenElements: true,
        })
      ).toBeTruthy();
    });

    it('shows neither the social options nor the divider once the email has been sent', async () => {
      const { user } = await setupOnEmailStep();
      await user.type(screen.getByTestId('email-input'), 'test@example.com');

      await sendFrom(user);

      expect(
        screen.queryByTestId('mock-social-success-app-login', hidden)
      ).toBeNull();
      // The divider introduces the social options, so it leaves with them.
      expect(
        screen.queryByTestId('social-signin-divider', {
          includeHiddenElements: true,
        })
      ).toBeNull();
    });

    it('routes to the app when social sign-in resolves an app target for an ordinary outcome', async () => {
      setup(<LoginForm />);

      fireEvent.press(screen.getByTestId('mock-social-success-app-login'));

      await waitFor(() => {
        expect(mockRouterReplace).toHaveBeenCalledWith('/(app)/');
      });
    });

    it('routes to onboarding when social sign-in resolves an onboarding target', async () => {
      setup(<LoginForm />);

      fireEvent.press(
        screen.getByTestId('mock-social-success-onboarding-target')
      );

      await waitFor(() => {
        expect(mockRouterReplace).toHaveBeenCalledWith('/onboarding');
      });
    });

    it('routes brand-new social signups (outcome "created") to onboarding, not the app shell with no character', async () => {
      setup(<LoginForm />);

      // `completeSignIn` always resolves target 'app' — routing this by
      // target alone would drop a brand-new, character-less user into the
      // app shell. This pins the `created`-outcome override instead.
      fireEvent.press(screen.getByTestId('mock-social-success-app-created'));

      await waitFor(() => {
        expect(mockRouterReplace).toHaveBeenCalledWith('/onboarding');
      });
    });

    it('fires signup_completed with the provider when a brand-new social account is created', async () => {
      setup(<LoginForm />);

      fireEvent.press(screen.getByTestId('mock-social-success-app-created'));

      await waitFor(() => {
        expect(mockRouterReplace).toHaveBeenCalledWith('/onboarding');
      });

      expect(mockPosthogCapture).toHaveBeenCalledWith('signup_completed', {
        method: 'google',
      });
    });

    it('does NOT fire signup_completed for an ordinary login outcome', async () => {
      setup(<LoginForm />);

      fireEvent.press(screen.getByTestId('mock-social-success-app-login'));

      await waitFor(() => {
        expect(mockRouterReplace).toHaveBeenCalledWith('/(app)/');
      });

      expect(mockPosthogCapture).not.toHaveBeenCalledWith(
        'signup_completed',
        expect.anything()
      );
    });

    it('maps a social sign-in email-in-use error to the same copy as the magic-link 409 path', async () => {
      setup(<LoginForm />);

      fireEvent.press(screen.getByTestId('mock-social-error-email-in-use'));

      await waitFor(() => {
        expect(
          screen.getByText(
            /This email address is already associated with an account/i
          )
        ).toBeOnTheScreen();
      });
    });

    it('maps a generic social sign-in error to the existing generic error copy', async () => {
      setup(<LoginForm />);

      fireEvent.press(screen.getByTestId('mock-social-error-generic'));

      await waitFor(() => {
        expect(
          screen.getByText(/Login link failed to send. Please try again./i)
        ).toBeOnTheScreen();
      });
    });
  });

  describe('Step machine', () => {
    it('starts a returning user on the chooser, with the email form a step away', async () => {
      setup(<LoginForm intent="signin" />);

      // Positive first: a blank render would satisfy the absence check below.
      expect(
        await screen.findByTestId('continue-with-email-button')
      ).toBeOnTheScreen();
      expect(screen.getByText('Welcome back')).toBeOnTheScreen();
      expect(
        screen.getByTestId('mock-social-success-app-login')
      ).toBeOnTheScreen();

      expect(screen.queryByTestId('email-input', hidden)).toBeNull();
      expect(rawCount('email-input')).toBe(0);
    });

    it('starts a converting user on the email step, since they have already decided to sign up', async () => {
      setup(<LoginForm intent="convert" />);

      expect(await screen.findByTestId('email-input')).toBeOnTheScreen();
      expect(screen.getByText('Sign up with email')).toBeOnTheScreen();

      // No chooser: they came from the conversion screen, which already
      // presented these same three options.
      expect(
        screen.queryByTestId('continue-with-email-button', hidden)
      ).toBeNull();
      expect(rawCount('continue-with-email-button')).toBe(0);
    });

    it('moves the chooser to the email step when Continue with email is pressed', async () => {
      const { user } = setup(<LoginForm intent="signin" />);

      await user.press(screen.getByTestId('continue-with-email-button'));

      expect(screen.getByTestId('email-input')).toBeOnTheScreen();
      expect(screen.getByText('Sign in with email')).toBeOnTheScreen();
      // The chooser's own content leaves with it — the social options are the
      // chooser's, not the shell's.
      expect(
        screen.queryByTestId('continue-with-email-button', hidden)
      ).toBeNull();
      expect(
        screen.queryByTestId('mock-social-success-app-login', hidden)
      ).toBeNull();
      expect(rawCount('mock-social-success-app-login')).toBe(0);
    });

    it('moves the email step back to the chooser via the back link', async () => {
      const { user } = await setupOnEmailStep();
      expect(screen.getByText('← Other ways to sign in')).toBeOnTheScreen();

      await user.press(screen.getByTestId('back-to-chooser-link'));

      expect(
        screen.getByTestId('continue-with-email-button')
      ).toBeOnTheScreen();
      expect(screen.getByText('Welcome back')).toBeOnTheScreen();
      expect(screen.queryByTestId('email-input', hidden)).toBeNull();
      // The link is the email step's, so it leaves with it — a back link on the
      // chooser would point at nothing.
      expect(screen.queryByTestId('back-to-chooser-link', hidden)).toBeNull();
      expect(rawCount('Other ways to sign in')).toBe(0);
    });

    it('clears an email-step error on the way back to the chooser', async () => {
      const axiosError = new Error('Request failed with status code 500');
      Object.assign(axiosError, {
        response: { status: 500, data: { message: 'Internal server error' } },
        config: {},
        isAxiosError: true,
      });
      mockedRequestMagicLink.mockRejectedValueOnce(axiosError);

      const { user } = await setupOnEmailStep();
      await user.type(screen.getByTestId('email-input'), 'test@example.com');
      await user.press(screen.getByTestId('login-button'));

      await waitFor(() => {
        expect(
          screen.getByText(/Login link failed to send. Please try again./i)
        ).toBeOnTheScreen();
      });

      await user.press(screen.getByTestId('back-to-chooser-link'));

      // The error belonged to the step being left — a failed send to THAT
      // address. Carried onto the chooser it would sit above Apple/Google and
      // read as their failure.
      expect(
        screen.queryByText(/Login link failed to send. Please try again./i, {
          ...hidden,
        })
      ).toBeNull();
      expect(rawCount('Login link failed to send')).toBe(0);
      expect(screen.queryByTestId('error-message', hidden)).toBeNull();
    });

    it('replaces the email step with the sent step after a successful send', async () => {
      const { user } = await setupOnEmailStep();
      await user.type(screen.getByTestId('email-input'), 'test@example.com');

      await sendFrom(user);

      expect(screen.queryByTestId('email-input', hidden)).toBeNull();
      expect(screen.queryByTestId('back-to-chooser-link', hidden)).toBeNull();
    });

    it('clears a chooser error on the way forward to the email step', async () => {
      const { user } = setup(<LoginForm intent="signin" />);

      // A failed Apple/Google attempt belongs to the chooser.
      fireEvent.press(screen.getByTestId('mock-social-error-generic'));
      await waitFor(() => {
        expect(
          screen.getByText(/Login link failed to send. Please try again./i)
        ).toBeOnTheScreen();
      });

      await user.press(screen.getByTestId('continue-with-email-button'));

      // Without this, the email step opens saying a link failed to send when no
      // link has been requested — the generic social copy is the magic-link
      // copy, so it is doubly misattributed.
      expect(
        screen.queryByText(/Login link failed to send. Please try again./i, {
          ...hidden,
        })
      ).toBeNull();
      expect(rawCount('Login link failed to send')).toBe(0);
      expect(screen.queryByTestId('error-message', hidden)).toBeNull();
      expect(mockedRequestMagicLink).not.toHaveBeenCalled();
    });

    it('does not carry a chooser 409 into the email step', async () => {
      const { user } = setup(<LoginForm intent="signin" />);

      fireEvent.press(screen.getByTestId('mock-social-error-email-in-use'));
      await waitFor(() => {
        expect(
          screen.getByText(/already associated with an account/i)
        ).toBeOnTheScreen();
      });

      await user.press(screen.getByTestId('continue-with-email-button'));

      expect(
        screen.queryByText(/already associated with an account/i, { ...hidden })
      ).toBeNull();
      expect(rawCount('already associated with an account')).toBe(0);
    });
  });

  // Both of these are about the request window. The back link used to be live
  // while a send was pending, which let the user leave the email step and have
  // the send's outcome land on a step that never asked for it.
  describe('While a send is in flight', () => {
    it('keeps a failed send’s error on the email step instead of the chooser', async () => {
      const pending = deferredSend();
      const { user } = await setupOnEmailStep();
      await user.type(screen.getByTestId('email-input'), 'test@example.com');
      await user.press(screen.getByTestId('login-button'));

      const backLink = screen.getByTestId('back-to-chooser-link');
      // Disclosed as inert, not just ignored — a screen reader reads this.
      expect(backLink.props.accessibilityState?.disabled).toBe(true);
      await user.press(backLink);

      // The press is a no-op: still on the email step, where the request was
      // made from.
      expect(screen.getByTestId('email-input')).toBeOnTheScreen();
      expect(
        screen.queryByTestId('continue-with-email-button', hidden)
      ).toBeNull();

      await pending.reject(serverError());

      // `setError('')` in the back handler fires synchronously; the rejection
      // arrives after it. So clearing alone cannot keep this error off the
      // chooser — only refusing the transition can. Left unguarded, this copy
      // renders in the chooser's banner directly above Apple and Google.
      await waitFor(() => {
        expect(
          screen.getByText(/Login link failed to send. Please try again./i)
        ).toBeOnTheScreen();
      });
      expect(screen.getByTestId('email-input')).toBeOnTheScreen();
      expect(
        screen.queryByTestId('continue-with-email-button', hidden)
      ).toBeNull();
    });

    it('leaves "Change email" a way back to the email form after a send that resolves', async () => {
      const pending = deferredSend();
      const { user } = await setupOnEmailStep();
      await user.type(screen.getByTestId('email-input'), 'test@example.com');
      await user.press(screen.getByTestId('login-button'));

      await user.press(screen.getByTestId('back-to-chooser-link'));
      await pending.resolve();

      await waitFor(() => {
        expect(screen.getByText(/Check your inbox/i)).toBeOnTheScreen();
      });

      await user.press(screen.getByText(/Change email/i));

      // `resetForm` only unsets hook state, so `step` collapses to whatever
      // `mode` holds. If the back-link press had been allowed to set it to
      // 'chooser', the user would land on the chooser with no email input —
      // stranded, with the address they just used discarded.
      expect(screen.getByTestId('email-input')).toBeOnTheScreen();
      expect(screen.getByText('Sign in with email')).toBeOnTheScreen();
      expect(
        screen.queryByTestId('continue-with-email-button', hidden)
      ).toBeNull();
    });
  });

  describe('Legal consent', () => {
    // The regression this guards: `ChooserView` was built with the legal line
    // and never mounted, then the duplicate was removed from `EmailInputView`
    // on the strength of the chooser carrying it — leaving the rendered screen
    // with no consent text on any path. The line therefore lives in the shell,
    // outside the chooser/email switch, so no step can be reached without it.
    it('states the legal terms on the chooser step, exactly once', async () => {
      setup(<LoginForm intent="signin" />);

      expect(await screen.findByText(LEGAL_SENTENCE)).toBeOnTheScreen();
      expect(screen.getAllByTestId('legal-consent', hidden)).toHaveLength(1);
      expect(rawCount(LEGAL_LEAD)).toBe(1);
    });

    it('states the legal terms on the email step, where the convert intent starts', async () => {
      // The step that carried NO consent text under the chooser-only design:
      // `convert` opens here and can finish a signup without ever going back.
      setup(<LoginForm intent="convert" />);

      expect(await screen.findByText(LEGAL_SENTENCE)).toBeOnTheScreen();
      expect(screen.getAllByTestId('legal-consent', hidden)).toHaveLength(1);
      expect(rawCount(LEGAL_LEAD)).toBe(1);
    });

    it('keeps exactly one legal line across a chooser → email → chooser round trip', async () => {
      const { user } = await setupOnEmailStep({ intent: 'signin' });

      expect(screen.getByText(LEGAL_SENTENCE)).toBeOnTheScreen();
      expect(rawCount(LEGAL_LEAD)).toBe(1);

      await user.press(screen.getByTestId('back-to-chooser-link'));

      // A second copy here is what a `ChooserView`-plus-shell placement would
      // produce on the chooser step.
      expect(rawCount(LEGAL_LEAD)).toBe(1);
    });

    it('links the legal line to the hosted terms document', async () => {
      const { user } = await setupOnEmailStep();

      await user.press(screen.getByText('Terms and Privacy Policy'));

      expect(Linking.openURL).toHaveBeenCalledWith(TERMS_URL);
    });

    it('drops the legal line on the sent step, where consent has already been given', async () => {
      const { user } = await setupOnEmailStep();
      await user.type(screen.getByTestId('email-input'), 'test@example.com');

      await sendFrom(user);

      expect(screen.queryByTestId('legal-consent', hidden)).toBeNull();
      expect(rawCount(LEGAL_LEAD)).toBe(0);
    });
  });

  describe('Hero name', () => {
    it('names the hero from the character store in the convert chooser', async () => {
      giveTheUserAHero();

      const { user } = setup(<LoginForm intent="convert" />);
      // `convert` starts on the email step, so reach the chooser to see the
      // subtitle the store feeds.
      await user.press(screen.getByTestId('back-to-chooser-link'));

      expect(
        screen.getByText(`Keep ${HERO_NAME} and everything you've earned.`)
      ).toBeOnTheScreen();
    });

    it('falls back to the generic name when the store has no character yet', async () => {
      const { user } = setup(<LoginForm intent="convert" />);
      await user.press(screen.getByTestId('back-to-chooser-link'));

      expect(
        screen.getByText("Keep your hero and everything you've earned.")
      ).toBeOnTheScreen();
    });
  });
});
