import type { ReactTestRendererJSON } from 'react-test-renderer';

import { Platform } from 'react-native';

import { socialSignIn } from '@/api/auth';
import {
  getAppleCredential,
  getGoogleCredential,
  SocialSignInCancelled,
} from '@/lib/auth/social';
import { fireEvent, render, screen, waitFor } from '@/lib/test-utils';

import { SocialSignInButtons } from './social-sign-in-buttons';

const mockCapture = jest.fn();
jest.mock('posthog-react-native', () => ({
  usePostHog: () => ({
    capture: mockCapture,
  }),
}));

jest.mock('@/api/auth', () => ({
  socialSignIn: jest.fn(),
}));

jest.mock('@/lib/auth/social', () => ({
  getGoogleCredential: jest.fn(),
  getAppleCredential: jest.fn(),
  SocialSignInCancelled: class SocialSignInCancelled extends Error {},
  SOCIAL_SIGNIN_OUTCOMES: {
    LOGIN: 'login',
    EXISTING_ACCOUNT_LOGIN: 'existing-account-login',
    CONVERTED: 'converted',
    LINKED: 'linked',
    CREATED: 'created',
  },
}));

const mockShowMessage = jest.fn();
jest.mock('react-native-flash-message', () => ({
  showMessage: (...args: unknown[]) => mockShowMessage(...args),
}));

const mockGetGoogleCredential = getGoogleCredential as jest.MockedFunction<
  typeof getGoogleCredential
>;
const mockGetAppleCredential = getAppleCredential as jest.MockedFunction<
  typeof getAppleCredential
>;
const mockSocialSignIn = socialSignIn as jest.MockedFunction<
  typeof socialSignIn
>;

const noop = () => {};

/** Depth-first walk of the rendered JSON tree collecting testIDs in the
 * order they appear — used to assert Apple-before-Google-before-divider
 * layout order, which query-by-testID alone can't express. */
function collectTestIdOrder(
  node: ReactTestRendererJSON | ReactTestRendererJSON[] | string | null
): string[] {
  if (node === null || typeof node === 'string') return [];
  if (Array.isArray(node)) return node.flatMap(collectTestIdOrder);

  const ids: string[] = [];
  if (typeof node.props?.testID === 'string') {
    ids.push(node.props.testID);
  }
  if (node.children) {
    ids.push(...collectTestIdOrder(node.children));
  }
  return ids;
}

describe('SocialSignInButtons', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('on iOS', () => {
    beforeEach(() => {
      Platform.OS = 'ios';
    });

    it('renders the Apple button, then the Google button, then an "or" divider', () => {
      const view = render(
        <SocialSignInButtons onSuccess={noop} onError={noop} />
      );

      expect(screen.getByTestId('apple-sign-in-button')).toBeOnTheScreen();
      expect(screen.getByTestId('google-sign-in-button')).toBeOnTheScreen();
      // The divider is marked accessibility-hidden (decorative — see the
      // component), so it has to be queried with `includeHiddenElements`
      // to still be found by text.
      expect(
        screen.getByText('or', { includeHiddenElements: true })
      ).toBeOnTheScreen();

      const order = collectTestIdOrder(view.toJSON());
      const appleIndex = order.indexOf('apple-sign-in-button');
      const googleIndex = order.indexOf('google-sign-in-button');
      const dividerIndex = order.indexOf('social-signin-divider');

      expect(appleIndex).toBeGreaterThanOrEqual(0);
      expect(appleIndex).toBeLessThan(googleIndex);
      expect(googleIndex).toBeLessThan(dividerIndex);
    });
  });

  describe('on Android', () => {
    beforeEach(() => {
      Platform.OS = 'android';
    });

    it('renders only the Google button — no Apple button (spec-locked decision)', () => {
      render(<SocialSignInButtons onSuccess={noop} onError={noop} />);

      expect(screen.getByTestId('google-sign-in-button')).toBeOnTheScreen();
      expect(
        screen.queryByTestId('apple-sign-in-button')
      ).not.toBeOnTheScreen();
    });
  });

  describe('pressing the Google button', () => {
    beforeEach(() => {
      Platform.OS = 'android';
    });

    it('calls getGoogleCredential then socialSignIn, and fires onSuccess(target, outcome)', async () => {
      mockGetGoogleCredential.mockResolvedValue({
        provider: 'google',
        idToken: 'google-id-token',
      });
      mockSocialSignIn.mockResolvedValue({ target: 'app', outcome: 'login' });
      const onSuccess = jest.fn();

      render(<SocialSignInButtons onSuccess={onSuccess} onError={noop} />);
      fireEvent.press(screen.getByTestId('google-sign-in-button'));

      await waitFor(() => {
        expect(onSuccess).toHaveBeenCalledWith('app', 'login', 'google');
      });

      expect(mockGetGoogleCredential).toHaveBeenCalledTimes(1);
      expect(mockSocialSignIn).toHaveBeenCalledWith({
        provider: 'google',
        idToken: 'google-id-token',
      });
    });

    it('silently cancels — no error, no onSuccess — and captures social_signin_attempt with outcome cancelled', async () => {
      mockGetGoogleCredential.mockRejectedValue(new SocialSignInCancelled());
      const onSuccess = jest.fn();
      const onError = jest.fn();

      render(<SocialSignInButtons onSuccess={onSuccess} onError={onError} />);
      fireEvent.press(screen.getByTestId('google-sign-in-button'));

      await waitFor(() => {
        expect(mockCapture).toHaveBeenCalledWith('social_signin_attempt', {
          provider: 'google',
          outcome: 'cancelled',
        });
      });

      expect(mockSocialSignIn).not.toHaveBeenCalled();
      expect(onSuccess).not.toHaveBeenCalled();
      expect(onError).not.toHaveBeenCalled();
    });

    it("maps a server 409 to onError('email-in-use')", async () => {
      mockGetGoogleCredential.mockResolvedValue({
        provider: 'google',
        idToken: 'google-id-token',
      });
      const conflictError = Object.assign(new Error('conflict'), {
        isAxiosError: true,
        response: { status: 409 },
      });
      mockSocialSignIn.mockRejectedValue(conflictError);
      const onError = jest.fn();

      render(<SocialSignInButtons onSuccess={noop} onError={onError} />);
      fireEvent.press(screen.getByTestId('google-sign-in-button'));

      await waitFor(() => {
        expect(onError).toHaveBeenCalledWith('email-in-use');
      });
    });

    it("maps every other error to onError('generic')", async () => {
      mockGetGoogleCredential.mockResolvedValue({
        provider: 'google',
        idToken: 'google-id-token',
      });
      mockSocialSignIn.mockRejectedValue(new Error('network down'));
      const onError = jest.fn();

      render(<SocialSignInButtons onSuccess={noop} onError={onError} />);
      fireEvent.press(screen.getByTestId('google-sign-in-button'));

      await waitFor(() => {
        expect(onError).toHaveBeenCalledWith('generic');
      });
    });

    it('records the native error code on social_signin_failure, so a DEVELOPER_ERROR is distinguishable from a network failure', async () => {
      mockGetGoogleCredential.mockRejectedValue(
        Object.assign(new Error('developer error'), {
          code: 'DEVELOPER_ERROR',
        })
      );

      render(<SocialSignInButtons onSuccess={noop} onError={noop} />);
      fireEvent.press(screen.getByTestId('google-sign-in-button'));

      await waitFor(() => {
        expect(mockCapture).toHaveBeenCalledWith('social_signin_failure', {
          provider: 'google',
          reason: 'generic',
          code: 'DEVELOPER_ERROR',
        });
      });
    });

    it('records the HTTP status when the server rejects the credential', async () => {
      mockGetGoogleCredential.mockResolvedValue({
        provider: 'google',
        idToken: 'google-id-token',
      });
      // 501 is what the server returns when it has no GOOGLE_WEB_CLIENT_ID
      // configured — indistinguishable from a network failure without this.
      mockSocialSignIn.mockRejectedValue(
        Object.assign(new Error('Request failed with status code 501'), {
          isAxiosError: true,
          response: { status: 501 },
        })
      );

      render(<SocialSignInButtons onSuccess={noop} onError={noop} />);
      fireEvent.press(screen.getByTestId('google-sign-in-button'));

      await waitFor(() => {
        expect(mockCapture).toHaveBeenCalledWith('social_signin_failure', {
          provider: 'google',
          reason: 'generic',
          status: 501,
        });
      });
    });

    it('captures social_signin_success with the provider on success', async () => {
      mockGetGoogleCredential.mockResolvedValue({
        provider: 'google',
        idToken: 'google-id-token',
      });
      mockSocialSignIn.mockResolvedValue({
        target: 'app',
        outcome: 'created',
      });

      render(<SocialSignInButtons onSuccess={noop} onError={noop} />);
      fireEvent.press(screen.getByTestId('google-sign-in-button'));

      await waitFor(() => {
        expect(mockCapture).toHaveBeenCalledWith('social_signin_success', {
          provider: 'google',
          outcome: 'created',
        });
      });
    });

    it('shows a "welcome back" notice when the outcome is existing-account-login', async () => {
      mockGetGoogleCredential.mockResolvedValue({
        provider: 'google',
        idToken: 'google-id-token',
      });
      mockSocialSignIn.mockResolvedValue({
        target: 'app',
        outcome: 'existing-account-login',
      });

      render(<SocialSignInButtons onSuccess={noop} onError={noop} />);
      fireEvent.press(screen.getByTestId('google-sign-in-button'));

      await waitFor(() => {
        expect(mockShowMessage).toHaveBeenCalledWith(
          expect.objectContaining({
            message: 'Welcome back',
            description: 'You signed into your existing account.',
            type: 'success',
          })
        );
      });
    });

    it('does NOT show the "welcome back" notice for other outcomes (e.g. created)', async () => {
      mockGetGoogleCredential.mockResolvedValue({
        provider: 'google',
        idToken: 'google-id-token',
      });
      mockSocialSignIn.mockResolvedValue({
        target: 'app',
        outcome: 'created',
      });

      render(<SocialSignInButtons onSuccess={noop} onError={noop} />);
      fireEvent.press(screen.getByTestId('google-sign-in-button'));

      await waitFor(() => {
        expect(mockCapture).toHaveBeenCalledWith(
          'social_signin_success',
          expect.anything()
        );
      });

      expect(mockShowMessage).not.toHaveBeenCalled();
    });

    it('ignores a second press while the first sign-in attempt is still in flight', async () => {
      let resolveCredential: (value: {
        provider: 'google';
        idToken: string;
      }) => void = () => {};
      mockGetGoogleCredential.mockReturnValue(
        new Promise((resolve) => {
          resolveCredential = resolve;
        })
      );
      mockSocialSignIn.mockResolvedValue({ target: 'app', outcome: 'login' });

      render(<SocialSignInButtons onSuccess={noop} onError={noop} />);
      const button = screen.getByTestId('google-sign-in-button');

      // Both presses fire before the pending credential promise settles —
      // the second one must be a no-op (the guard, not just luck).
      fireEvent.press(button);
      fireEvent.press(button);

      expect(mockGetGoogleCredential).toHaveBeenCalledTimes(1);

      resolveCredential({ provider: 'google', idToken: 'google-id-token' });

      await waitFor(() => {
        expect(mockSocialSignIn).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('pressing the Apple button', () => {
    beforeEach(() => {
      Platform.OS = 'ios';
    });

    it('calls getAppleCredential then socialSignIn, and captures provider apple on success', async () => {
      mockGetAppleCredential.mockResolvedValue({
        provider: 'apple',
        idToken: 'apple-id-token',
        nonce: 'raw-nonce',
      });
      mockSocialSignIn.mockResolvedValue({ target: 'app', outcome: 'login' });

      render(<SocialSignInButtons onSuccess={noop} onError={noop} />);
      fireEvent.press(screen.getByTestId('apple-sign-in-button'));

      await waitFor(() => {
        expect(mockSocialSignIn).toHaveBeenCalledWith({
          provider: 'apple',
          idToken: 'apple-id-token',
          nonce: 'raw-nonce',
        });
      });

      expect(mockGetAppleCredential).toHaveBeenCalledTimes(1);
      expect(mockCapture).toHaveBeenCalledWith('social_signin_success', {
        provider: 'apple',
        outcome: 'login',
      });
    });
  });
});
