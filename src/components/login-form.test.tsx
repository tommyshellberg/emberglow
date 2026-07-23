import React from 'react';

import { requestMagicLink } from '@/api/auth';
import { cleanup, fireEvent, screen, setup, waitFor } from '@/lib/test-utils';

import type { LoginFormProps } from './login-form';
import { LoginForm } from './login-form';

afterEach(() => {
  cleanup();
  jest.clearAllMocks();
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

describe('LoginForm Form ', () => {
  beforeEach(() => {
    mockedRequestMagicLink.mockResolvedValue({ success: true });
  });

  it('renders correctly', async () => {
    setup(<LoginForm />);
    expect(await screen.findByText(/emberglow/i)).toBeOnTheScreen();
  });

  it('should disable button when email is empty', async () => {
    setup(<LoginForm />);

    const button = screen.getByTestId('login-button');

    // Button should be disabled when email is empty
    expect(button.props.accessibilityState?.disabled).toBe(true);
  });

  it('should disable button when email is invalid', async () => {
    const { user } = setup(<LoginForm />);

    const button = screen.getByTestId('login-button');
    const emailInput = screen.getByTestId('email-input');

    await user.type(emailInput, 'yyyyy');

    // Button should remain disabled for invalid email
    expect(button.props.accessibilityState?.disabled).toBe(true);
  });

  it('Should call onSubmit with correct values when email is valid', async () => {
    const { user } = setup(<LoginForm onSubmit={onSubmitMock} />);

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
    const { user } = setup(<LoginForm />);

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
    const { user } = setup(<LoginForm />);

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

    const { user } = setup(<LoginForm />);

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
    expect(screen.queryByText(/Check your inbox/i)).not.toBeOnTheScreen();
  });

  it('should show timeout error message', async () => {
    const axiosError = new Error('timeout of 10000ms exceeded');
    Object.assign(axiosError, {
      code: 'ECONNABORTED',
      config: {},
      isAxiosError: true,
    });

    mockedRequestMagicLink.mockRejectedValueOnce(axiosError);

    const { user } = setup(<LoginForm />);

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

    const { user } = setup(<LoginForm />);

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

    const { user } = setup(<LoginForm />);

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

    const { user } = setup(<LoginForm />);

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
    const { user } = setup(<LoginForm />);

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
    const { user } = setup(<LoginForm />);

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
    expect(screen.queryByText(/Check your spam folder/i)).not.toBeOnTheScreen();
  });

  it('should show contact support link after 3 failed attempts', async () => {
    const { user } = setup(<LoginForm />);

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

    // Should be in email input mode (not success mode)
    expect(screen.getByTestId('email-input')).toBeOnTheScreen();
  });

  it('should show error when trying to submit invalid email', async () => {
    const { user } = setup(<LoginForm />);

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

  describe('Social sign-in', () => {
    it('renders the social sign-in options above the email form before the email is sent', async () => {
      setup(<LoginForm />);

      expect(await screen.findByText(/emberglow/i)).toBeOnTheScreen();
      expect(
        screen.getByTestId('mock-social-success-app-login')
      ).toBeOnTheScreen();
      expect(screen.getByTestId('email-input')).toBeOnTheScreen();
    });

    it('hides the social sign-in options once the email has been sent', async () => {
      const { user } = setup(<LoginForm />);

      const button = screen.getByTestId('login-button');
      const emailInput = screen.getByTestId('email-input');
      await user.type(emailInput, 'test@example.com');

      await waitFor(() => {
        expect(button.props.accessibilityState?.disabled).not.toBe(true);
      });
      await user.press(button);

      await waitFor(() => {
        expect(screen.getByText(/Check your inbox/i)).toBeOnTheScreen();
      });

      expect(
        screen.queryByTestId('mock-social-success-app-login')
      ).not.toBeOnTheScreen();
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
});
