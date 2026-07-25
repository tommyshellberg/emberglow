import type { ReactTestRendererJSON } from 'react-test-renderer';

import * as AppleAuthentication from 'expo-apple-authentication';
import { Platform } from 'react-native';

import { socialSignIn } from '@/api/auth';
import {
  ExistingAccountConfirmationRequired,
  getAppleCredential,
  getGoogleCredential,
  SocialSignInCancelled,
} from '@/lib/auth/social';
import {
  bottomSheetMock,
  resetBottomSheetMock,
} from '@/lib/test-mocks/gorhom-bottom-sheet';
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
  // The REAL class, not a stand-in: the component branches on
  // `instanceof ExistingAccountConfirmationRequired`, so a hand-written double
  // here would keep passing even if production's class stopped being
  // constructible or lost its prototype chain under Babel's Error downleveling.
  // `errors.ts` has no imports of its own, so requiring it pulls in none of the
  // native modules this module mock exists to avoid.
  ExistingAccountConfirmationRequired: jest.requireActual(
    '@/lib/auth/social/errors'
  ).ExistingAccountConfirmationRequired,
  SOCIAL_SIGNIN_OUTCOMES: {
    LOGIN: 'login',
    EXISTING_ACCOUNT_LOGIN: 'existing-account-login',
    CONVERTED: 'converted',
    LINKED: 'linked',
    CREATED: 'created',
  },
}));

// The component now mounts `ExistingAccountSheet`, whose only observable
// "opened" signal is `present()` on the sheet's ref — jest-setup.ts's global
// mock never attaches that ref, so under it deleting the whole collision branch
// would still leave every content query passing (the mocked modal renders its
// children whether or not it is open). See the helper's docstring.
jest.mock('@gorhom/bottom-sheet', () =>
  require('@/lib/test-mocks/gorhom-bottom-sheet').createBottomSheetMock()
);

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

const GOOGLE_CREDENTIAL = {
  provider: 'google' as const,
  idToken: 'google-id-token',
};
const APPLE_CREDENTIAL = {
  provider: 'apple' as const,
  idToken: 'apple-id-token',
  nonce: 'raw-nonce',
};

/** Deliberately unlike the server's own fallbacks (`character?.level || 1`,
 * `dailyQuestStreak || 0`): a fixture equal to a fallback can't tell "read from
 * the collision payload" apart from "defaulted". */
const COLLIDING_HERO = { name: 'Rowan', level: 12, dailyQuestStreak: 4 };

/** Depth-first walk of the rendered JSON tree collecting testIDs in the
 * order they appear — used to assert Apple-before-Google layout order, which
 * query-by-testID alone can't express. */
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

    it('renders the Apple button, then the Google button', () => {
      const view = render(
        <SocialSignInButtons onSuccess={noop} onError={noop} />
      );

      expect(screen.getByTestId('apple-sign-in-button')).toBeOnTheScreen();
      expect(screen.getByTestId('google-sign-in-button')).toBeOnTheScreen();

      const order = collectTestIdOrder(view.toJSON());
      const appleIndex = order.indexOf('apple-sign-in-button');
      const googleIndex = order.indexOf('google-sign-in-button');

      expect(appleIndex).toBeGreaterThanOrEqual(0);
      expect(appleIndex).toBeLessThan(googleIndex);
    });

    it('no longer renders the divider — callers own it', () => {
      const view = render(
        <SocialSignInButtons onSuccess={noop} onError={noop} />
      );

      // Asserted against the raw rendered tree, not `queryByTestId`: the
      // divider is accessibility-hidden, and RNTL skips hidden elements by
      // default, so a query-based absence check passes whether or not the
      // divider rendered — it would prove nothing.
      expect(collectTestIdOrder(view.toJSON())).not.toContain(
        'social-signin-divider'
      );
    });

    it('uses the CONTINUE button type so the native label is mode-neutral', () => {
      render(<SocialSignInButtons onSuccess={jest.fn()} onError={jest.fn()} />);
      expect(screen.getByTestId('apple-sign-in-button').props.buttonType).toBe(
        AppleAuthentication.AppleAuthenticationButtonType.CONTINUE
      );
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

  describe('when the credential collides with an existing account', () => {
    beforeEach(() => {
      Platform.OS = 'android';
      // `clearAllMocks` drops call records but NOT queued one-time
      // implementations, so an unconsumed `...Once` from another test would
      // leak in here. Reset, then state the default out loud: every replay in
      // this block signs into the existing account unless it says otherwise.
      mockSocialSignIn.mockReset();
      mockSocialSignIn.mockResolvedValue({
        target: 'app',
        outcome: 'existing-account-login',
      });
      mockGetGoogleCredential.mockResolvedValue(GOOGLE_CREDENTIAL);
      resetBottomSheetMock();
    });

    /** First exchange collides; anything after it takes the default above. */
    const collide = () => {
      mockSocialSignIn.mockRejectedValueOnce(
        new ExistingAccountConfirmationRequired(COLLIDING_HERO)
      );
      const onSuccess = jest.fn();
      const onError = jest.fn();
      render(<SocialSignInButtons onSuccess={onSuccess} onError={onError} />);
      fireEvent.press(screen.getByTestId('google-sign-in-button'));
      return { onSuccess, onError };
    };

    /** The sheet's content renders whether or not the sheet is open (the mocked
     * modal always renders its children), so `present()` on the sheet's ref is
     * the only honest signal that it actually opened. */
    const waitForSheet = () =>
      waitFor(() => {
        expect(bottomSheetMock.handle?.present).toHaveBeenCalledTimes(1);
      });

    it('opens the confirmation sheet and reports neither success nor failure', async () => {
      const { onSuccess, onError } = collide();

      await waitForSheet();

      expect(onError).not.toHaveBeenCalled();
      expect(onSuccess).not.toHaveBeenCalled();
    });

    it('names the colliding hero on the sheet, so the choice is legible', async () => {
      collide();

      // Before the collision this button reads "Continue to your account"
      // (the sheet is mounted with an empty summary), so the name and meta
      // only appear if the error's `account` actually reached the sheet.
      await waitFor(() => {
        expect(screen.getByText('Continue as Rowan')).toBeOnTheScreen();
      });
      expect(screen.getByText('Level 12 · 4 day streak')).toBeOnTheScreen();
    });

    it('captures the prompt and NOT social_signin_failure — a collision is control flow, not a failure', async () => {
      collide();

      await waitFor(() => {
        expect(mockCapture).toHaveBeenCalledWith(
          'social_signin_existing_account_prompt',
          { provider: 'google' }
        );
      });

      // The same server response used to be reported as `email-in-use`/409.
      // Now that it opens a sheet instead, a `social_signin_failure` event
      // would be a phantom failure in the funnel — asserted on the event names
      // alone so it can't be satisfied by a differently-shaped payload.
      expect(mockCapture.mock.calls.map(([event]) => event)).not.toContain(
        'social_signin_failure'
      );
    });

    it('does not log the collision to the console — the log is for real failures', async () => {
      const consoleError = jest
        .spyOn(console, 'error')
        .mockImplementation(() => {});

      collide();
      await waitForSheet();

      expect(consoleError).not.toHaveBeenCalled();
      consoleError.mockRestore();
    });

    it('re-posts the same credential with the confirmation flag and then follows the normal success path', async () => {
      const { onSuccess, onError } = collide();
      await waitForSheet();

      fireEvent.press(screen.getByTestId('existing-account-confirm'));

      await waitFor(() => {
        expect(onSuccess).toHaveBeenCalledWith(
          'app',
          'existing-account-login',
          'google'
        );
      });

      // The first attempt must NOT carry the flag, the replay must — and it
      // must be the same credential object, not a fresh one.
      expect(mockSocialSignIn).toHaveBeenNthCalledWith(1, GOOGLE_CREDENTIAL);
      expect(mockSocialSignIn).toHaveBeenNthCalledWith(
        2,
        GOOGLE_CREDENTIAL,
        true
      );
      expect(mockCapture).toHaveBeenCalledWith(
        'social_signin_existing_account_confirmed',
        { provider: 'google' }
      );
      // The success tail exists once (in `finishSignIn`): a duplicated copy
      // would toast twice for a single sign-in.
      expect(mockCapture).toHaveBeenCalledWith('social_signin_success', {
        provider: 'google',
        outcome: 'existing-account-login',
      });
      expect(mockShowMessage).toHaveBeenCalledTimes(1);
      expect(onSuccess).toHaveBeenCalledTimes(1);
      expect(onError).not.toHaveBeenCalled();
    });

    it('does not prompt the native SDK again when the collision is confirmed', async () => {
      collide();
      await waitForSheet();

      fireEvent.press(screen.getByTestId('existing-account-confirm'));

      await waitFor(() => {
        expect(mockSocialSignIn).toHaveBeenCalledTimes(2);
      });
      // The whole reason the credential is held in state: a second trip
      // through Google's UI would ask the user to pick their account again to
      // answer a question they just answered.
      expect(mockGetGoogleCredential).toHaveBeenCalledTimes(1);
    });

    it('dismissing keeps the provisional session — no outcome, no re-post', async () => {
      const { onSuccess, onError } = collide();
      await waitForSheet();

      fireEvent.press(screen.getByTestId('existing-account-use-different'));

      await waitFor(() => {
        expect(mockCapture).toHaveBeenCalledWith(
          'social_signin_existing_account_dismissed',
          { provider: 'google' }
        );
      });

      expect(onSuccess).not.toHaveBeenCalled();
      expect(onError).not.toHaveBeenCalled();
      // `socialSignIn` is the only thing that clears provisional storage — its
      // `removeItem` calls run after a successful post (api/auth.ts) — so "the
      // local hero survives a dismiss" means exactly "no second post from
      // here". The storage assertion itself is api/auth.test.ts's ("leaves
      // provisional storage intact when the collision throws").
      expect(mockSocialSignIn).toHaveBeenCalledTimes(1);
    });

    it('treats a swipe-away or backdrop tap as a dismiss', async () => {
      const { onSuccess, onError } = collide();
      await waitForSheet();

      // The real gesture lives in @gorhom's native pan handler; invoking the
      // `onDismiss` the sheet handed the library is the only way a test can
      // stand in for it. It also arrives asynchronously in production, which
      // is why this is worth its own case.
      expect(bottomSheetMock.onDismiss).toBeDefined();
      bottomSheetMock.onDismiss?.();

      await waitFor(() => {
        expect(mockCapture).toHaveBeenCalledWith(
          'social_signin_existing_account_dismissed',
          { provider: 'google' }
        );
      });

      expect(onSuccess).not.toHaveBeenCalled();
      expect(onError).not.toHaveBeenCalled();
      expect(mockSocialSignIn).toHaveBeenCalledTimes(1);
    });

    it('keeps the buttons disabled while the sheet is up', async () => {
      collide();
      await waitForSheet();

      fireEvent.press(screen.getByTestId('google-sign-in-button'));

      // The parked attempt is not over — it is waiting on an answer. A second
      // attempt started underneath the sheet would race the replay and leave
      // the sheet answering for a credential nobody is holding any more.
      expect(mockGetGoogleCredential).toHaveBeenCalledTimes(1);
    });

    it('re-enables the buttons after a dismiss, so another provider can be tried', async () => {
      collide();
      await waitForSheet();

      fireEvent.press(screen.getByTestId('existing-account-use-different'));

      fireEvent.press(screen.getByTestId('google-sign-in-button'));

      // The parked attempt leaves `isSigningIn` set on purpose (the buttons sit
      // behind the sheet); if the dismiss handler doesn't clear it, the second
      // press is swallowed by the in-flight guard and both buttons are dead for
      // the rest of the screen's life.
      await waitFor(() => {
        expect(mockGetGoogleCredential).toHaveBeenCalledTimes(2);
      });
    });

    it('routes a failed replay to onError and leaves the buttons usable', async () => {
      mockSocialSignIn.mockReset();
      mockSocialSignIn
        .mockRejectedValueOnce(
          new ExistingAccountConfirmationRequired(COLLIDING_HERO)
        )
        .mockRejectedValueOnce(new Error('network down'));
      const onSuccess = jest.fn();
      const onError = jest.fn();
      render(<SocialSignInButtons onSuccess={onSuccess} onError={onError} />);
      fireEvent.press(screen.getByTestId('google-sign-in-button'));
      await waitForSheet();

      fireEvent.press(screen.getByTestId('existing-account-confirm'));

      // The confirmed replay shares the first attempt's failure tail — without
      // it a network blip after the user confirmed would surface nothing at all
      // and reject unhandled.
      await waitFor(() => {
        expect(onError).toHaveBeenCalledWith('generic');
      });
      expect(onSuccess).not.toHaveBeenCalled();

      mockSocialSignIn.mockResolvedValue({ target: 'app', outcome: 'login' });
      fireEvent.press(screen.getByTestId('google-sign-in-button'));

      await waitFor(() => {
        expect(mockGetGoogleCredential).toHaveBeenCalledTimes(2);
      });
    });

    it('leaves the sheet shut for a plain 409 — only the typed collision opens it', async () => {
      mockSocialSignIn.mockReset();
      mockSocialSignIn.mockRejectedValue(
        Object.assign(new Error('conflict'), {
          isAxiosError: true,
          response: { status: 409 },
        })
      );
      const onError = jest.fn();

      render(<SocialSignInButtons onSuccess={noop} onError={onError} />);
      fireEvent.press(screen.getByTestId('google-sign-in-button'));

      await waitFor(() => {
        expect(onError).toHaveBeenCalledWith('email-in-use');
      });

      // Without this, an undefined handle would make the assertion below pass
      // for the wrong reason (nothing to have been called).
      expect(bottomSheetMock.handle).toBeDefined();
      expect(bottomSheetMock.handle?.present).not.toHaveBeenCalled();
    });

    it('replays the Apple credential — nonce and all — without a second Apple prompt', async () => {
      Platform.OS = 'ios';
      mockGetAppleCredential.mockResolvedValue(APPLE_CREDENTIAL);
      mockSocialSignIn.mockRejectedValueOnce(
        new ExistingAccountConfirmationRequired(COLLIDING_HERO)
      );

      render(<SocialSignInButtons onSuccess={noop} onError={noop} />);
      fireEvent.press(screen.getByTestId('apple-sign-in-button'));
      await waitForSheet();

      expect(mockCapture).toHaveBeenCalledWith(
        'social_signin_existing_account_prompt',
        { provider: 'apple' }
      );

      fireEvent.press(screen.getByTestId('existing-account-confirm'));

      await waitFor(() => {
        expect(mockSocialSignIn).toHaveBeenNthCalledWith(
          2,
          APPLE_CREDENTIAL,
          true
        );
      });
      expect(mockGetAppleCredential).toHaveBeenCalledTimes(1);
    });
  });
});
