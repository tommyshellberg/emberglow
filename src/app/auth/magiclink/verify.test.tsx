import axios from 'axios';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';

import { verifyMagicLinkAndSignIn } from '@/api/auth';
import { signOut } from '@/lib/auth';
import { act, render, screen, waitFor } from '@/lib/test-utils';

import MagicLinkVerifyScreen from './verify';

// Mock the expo-router hooks
jest.mock('expo-router', () => ({
  useLocalSearchParams: jest.fn(),
  useRouter: jest.fn(() => ({
    replace: jest.fn(),
  })),
}));

// Mock the auth service
jest.mock('@/api/auth', () => ({
  verifyMagicLinkAndSignIn: jest.fn(),
}));

// Mock the auth functions
jest.mock('@/lib/auth', () => ({
  signOut: jest.fn(),
  useAuth: jest.fn((selector) => selector({ status: 'signOut' })),
}));

// Mock axios
jest.mock('axios');

// Stable capture fn so assertions can see calls (the global jest-setup mock
// returns a fresh object per usePostHog call).
const mockPosthogCapture = jest.fn();
jest.mock('posthog-react-native', () => ({
  usePostHog: () => ({ capture: mockPosthogCapture }),
}));

describe('MagicLinkVerifyScreen', () => {
  let mockReplace: jest.Mock;

  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();

    // Setup router mock
    mockReplace = jest.fn();
    (useRouter as jest.Mock).mockReturnValue({
      replace: mockReplace,
    });
  });

  afterEach(() => {
    // The failure tests switch to fake timers for the delayed redirect —
    // keep the restore local to this file.
    jest.useRealTimers();
  });

  it('should show loading state initially', () => {
    // Mock params with a valid token
    (useLocalSearchParams as jest.Mock).mockReturnValue({
      token: 'valid-token',
    });

    // Mock verification that doesn't resolve immediately
    (verifyMagicLinkAndSignIn as jest.Mock).mockReturnValue(
      new Promise(() => {})
    );

    render(<MagicLinkVerifyScreen />);

    // Check that the verifying state is shown
    expect(screen.getByText('Verifying your login')).toBeTruthy();
    expect(screen.getByText('Stoking the fire — one moment.')).toBeTruthy();
  });

  it('should redirect to login with error when token is missing', async () => {
    // Mock params with no token
    (useLocalSearchParams as jest.Mock).mockReturnValue({});

    render(<MagicLinkVerifyScreen />);

    // Check that it redirects to login with error (immediately — the
    // no-token branch has no error UI to pause on)
    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith({
        pathname: '/login',
        params: {
          error: "That link didn't work. Please request a fresh one.",
        },
      });
    });
  });

  it('should redirect to app when verification returns app target', async () => {
    // Mock params with a valid token
    (useLocalSearchParams as jest.Mock).mockReturnValue({
      token: 'valid-token',
    });

    // Mock successful verification that returns 'app'
    (verifyMagicLinkAndSignIn as jest.Mock).mockResolvedValue('app');

    render(<MagicLinkVerifyScreen />);

    // Check that it redirects to app
    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('/(app)/');
    });

    // Verify that verifyMagicLinkAndSignIn was called with the correct token
    expect(verifyMagicLinkAndSignIn).toHaveBeenCalledWith('valid-token');
  });

  it('should capture signup_completed after successful verification', async () => {
    (useLocalSearchParams as jest.Mock).mockReturnValue({
      token: 'valid-token',
    });
    (verifyMagicLinkAndSignIn as jest.Mock).mockResolvedValue('app');

    render(<MagicLinkVerifyScreen />);

    await waitFor(() => {
      expect(mockPosthogCapture).toHaveBeenCalledWith('signup_completed', {
        method: 'magic_link',
      });
    });
  });

  it('should not capture signup_completed when verification fails', async () => {
    (useLocalSearchParams as jest.Mock).mockReturnValue({
      token: 'bad-token',
    });
    (verifyMagicLinkAndSignIn as jest.Mock).mockRejectedValue(
      new Error('expired')
    );

    render(<MagicLinkVerifyScreen />);

    await waitFor(() => {
      expect(signOut).toHaveBeenCalled();
    });
    expect(mockPosthogCapture).not.toHaveBeenCalledWith('signup_completed');
  });

  it('should redirect to onboarding when verification returns onboarding target', async () => {
    // Mock params with a valid token
    (useLocalSearchParams as jest.Mock).mockReturnValue({
      token: 'valid-token',
    });

    // Mock successful verification that returns 'onboarding'
    (verifyMagicLinkAndSignIn as jest.Mock).mockResolvedValue('onboarding');

    render(<MagicLinkVerifyScreen />);

    // Check that it redirects to onboarding
    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('/onboarding');
    });

    // Verify that verifyMagicLinkAndSignIn was called with the correct token
    expect(verifyMagicLinkAndSignIn).toHaveBeenCalledWith('valid-token');
  });

  it('should sign out, pause, then redirect to login when verification fails', async () => {
    jest.useFakeTimers();

    // Mock params with a token
    (useLocalSearchParams as jest.Mock).mockReturnValue({
      token: 'invalid-token',
    });

    // Mock failed verification
    (verifyMagicLinkAndSignIn as jest.Mock).mockRejectedValue(
      new Error('Verification failed')
    );

    render(<MagicLinkVerifyScreen />);

    // Let the rejected verification promise settle
    await act(async () => {
      await Promise.resolve();
    });

    // signOut fires as soon as verification fails — before the redirect
    // is even scheduled
    expect(signOut).toHaveBeenCalled();

    // The redirect is deliberately delayed so the error state is readable
    expect(mockReplace).not.toHaveBeenCalled();

    // Advance past the pause
    act(() => {
      jest.advanceTimersByTime(3000);
    });

    // Exactly one redirect, carrying the error copy for login's banner
    expect(mockReplace).toHaveBeenCalledTimes(1);
    expect(mockReplace).toHaveBeenCalledWith({
      pathname: '/login',
      params: {
        error:
          "That link has expired. It's okay — enter your email and we'll send a fresh one.",
      },
    });
  });

  it('should show the error state when verification fails', async () => {
    jest.useFakeTimers();

    // Mock params with a token
    (useLocalSearchParams as jest.Mock).mockReturnValue({
      token: 'invalid-token',
    });

    // Mock failed verification
    (verifyMagicLinkAndSignIn as jest.Mock).mockRejectedValue(
      new Error('Verification failed')
    );

    render(<MagicLinkVerifyScreen />);

    // Let the rejected verification promise settle
    await act(async () => {
      await Promise.resolve();
    });

    // The full error state is visible during the pre-redirect pause
    expect(screen.getByText('This link has gone cold')).toBeTruthy();
    expect(screen.getByText(/That link has expired/)).toBeTruthy();
    expect(screen.getByText('Redirecting to login…')).toBeTruthy();
  });

  it('should show specific error message for 409 email already in use', async () => {
    jest.useFakeTimers();

    // Mock params with a token
    (useLocalSearchParams as jest.Mock).mockReturnValue({
      token: 'provisional-token',
    });

    // Mock 409 error (email already in use)
    const axiosError = {
      response: {
        status: 409,
        data: { message: 'mail address is already in use by another account' },
      },
      isAxiosError: true,
    };

    // Mock axios.isAxiosError to return true for our mock error
    (axios.isAxiosError as unknown as jest.Mock).mockReturnValue(true);

    (verifyMagicLinkAndSignIn as jest.Mock).mockRejectedValue(axiosError);

    render(<MagicLinkVerifyScreen />);

    // Let the rejected verification promise settle
    await act(async () => {
      await Promise.resolve();
    });

    // Check that it signs out
    expect(signOut).toHaveBeenCalled();

    // The 409 keeps its distinct email-in-use copy on screen (not merged
    // into the generic expired-link message)
    expect(
      screen.getByText(/This email is already tied to another account/)
    ).toBeTruthy();

    // Advance past the pause
    act(() => {
      jest.advanceTimersByTime(3000);
    });

    // Exactly one redirect, carrying the 409 copy for login's banner
    expect(mockReplace).toHaveBeenCalledTimes(1);
    expect(mockReplace).toHaveBeenCalledWith({
      pathname: '/login',
      params: {
        error:
          'This email is already tied to another account. Please sign in with a different email.',
      },
    });
  });
});
