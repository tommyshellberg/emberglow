import { useLocalSearchParams } from 'expo-router';
import React from 'react';

import { cleanup, screen, setup } from '@/lib/test-utils';

import Login from './login';

// Mock expo-router
jest.mock('expo-router', () => ({
  useLocalSearchParams: jest.fn(),
  Redirect: ({ href }: { href: string }) => {
    const { View } = require('react-native');
    return <View testID="redirect" accessibilityHint={href} />;
  },
}));

// Mock the LoginForm component. `intent` is echoed as text (via String(),
// so an undefined prop renders "intent:undefined" and fails loudly rather
// than rendering nothing) — this suite owns the param parsing, while
// login-form.test.tsx owns what the resolved copy renders as.
jest.mock('@/components/login-form', () => ({
  LoginForm: ({
    initialError,
    intent,
  }: {
    initialError?: string | null;
    intent?: string;
  }) => {
    const { View, Text } = require('react-native');
    return (
      <View testID="login-form">
        {initialError && <Text testID="initial-error">{initialError}</Text>}
        <Text testID="login-intent">{`intent:${String(intent)}`}</Text>
      </View>
    );
  },
}));

// Mock FocusAwareStatusBar
jest.mock('@/components/ui', () => ({
  FocusAwareStatusBar: () => {
    const { View } = require('react-native');
    return <View testID="status-bar" />;
  },
}));

// Mock useAuth
const mockUseAuth = jest.fn();
jest.mock('@/lib', () => ({
  useAuth: () => mockUseAuth(),
}));

afterEach(() => {
  cleanup();
  jest.clearAllMocks();
});

describe('Login Screen', () => {
  beforeEach(() => {
    (useLocalSearchParams as jest.Mock).mockReturnValue({});
    mockUseAuth.mockReturnValue({ status: 'signOut' });
  });

  it('renders LoginForm when user is not authenticated', () => {
    mockUseAuth.mockReturnValue({ status: 'signOut' });

    setup(<Login />);

    expect(screen.getByTestId('login-form')).toBeOnTheScreen();
    expect(screen.getByTestId('status-bar')).toBeOnTheScreen();
  });

  it('redirects to home when user is already authenticated', () => {
    mockUseAuth.mockReturnValue({ status: 'signIn' });

    setup(<Login />);

    const redirect = screen.getByTestId('redirect');
    expect(redirect).toBeOnTheScreen();
    expect(redirect.props.accessibilityHint).toBe('/');
  });

  it('passes error from URL params to LoginForm', () => {
    const errorMessage = 'Magic link expired';
    (useLocalSearchParams as jest.Mock).mockReturnValue({
      error: encodeURIComponent(errorMessage),
    });

    setup(<Login />);

    expect(screen.getByTestId('login-form')).toBeOnTheScreen();
    expect(screen.getByText(errorMessage)).toBeOnTheScreen();
  });

  it('handles missing error param gracefully', () => {
    (useLocalSearchParams as jest.Mock).mockReturnValue({});

    setup(<Login />);

    expect(screen.getByTestId('login-form')).toBeOnTheScreen();
    expect(screen.queryByTestId('initial-error')).not.toBeOnTheScreen();
  });

  it('decodes URL-encoded error message', () => {
    const errorMessage = 'Invalid magic link token';
    (useLocalSearchParams as jest.Mock).mockReturnValue({
      error: encodeURIComponent(errorMessage),
    });

    setup(<Login />);

    expect(screen.getByTestId('login-form')).toBeOnTheScreen();
    expect(screen.getByText(errorMessage)).toBeOnTheScreen();
  });

  describe('intent param', () => {
    it('passes the convert intent through when arriving from the conversion screen', () => {
      (useLocalSearchParams as jest.Mock).mockReturnValue({
        intent: 'convert',
      });

      setup(<Login />);

      expect(screen.getByText('intent:convert')).toBeOnTheScreen();
    });

    it('defaults to the signin intent when no param is present', () => {
      (useLocalSearchParams as jest.Mock).mockReturnValue({});

      setup(<Login />);

      expect(screen.getByText('intent:signin')).toBeOnTheScreen();
    });

    it('falls back to the signin intent for an unrecognised value', () => {
      (useLocalSearchParams as jest.Mock).mockReturnValue({
        intent: 'nonsense',
      });

      setup(<Login />);

      // Not `intent:nonsense` — an unvalidated cast would key the copy
      // table with it and render undefined copy.
      expect(screen.getByText('intent:signin')).toBeOnTheScreen();
    });

    it('falls back to the signin intent when the param is repeated', () => {
      // `?intent=convert&intent=signin` — expo-router hands back an array.
      (useLocalSearchParams as jest.Mock).mockReturnValue({
        intent: ['convert', 'signin'],
      });

      setup(<Login />);

      expect(screen.getByText('intent:signin')).toBeOnTheScreen();
    });
  });
});
