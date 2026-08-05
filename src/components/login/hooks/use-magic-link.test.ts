import { act, renderHook, waitFor } from '@testing-library/react-native';

import { requestMagicLink } from '@/api/auth';
// The REAL class, not a stand-in: the hook branches on `instanceof`, and
// `provisional-session.ts` imports only `@/lib/storage`, so requiring it pulls
// in none of the native modules the `@/api/auth` mock below exists to avoid.
import { ProvisionalSessionExpired } from '@/lib/auth/provisional-session';

import { useMagicLink } from './use-magic-link';

// Mock the requestMagicLink function
jest.mock('@/api/auth', () => ({
  requestMagicLink: jest.fn(),
}));

// Mock PostHog
const mockCapture = jest.fn();
jest.mock('posthog-react-native', () => ({
  usePostHog: () => ({
    capture: mockCapture,
  }),
}));

const mockedRequestMagicLink = requestMagicLink as jest.MockedFunction<
  typeof requestMagicLink
>;

describe('useMagicLink', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedRequestMagicLink.mockResolvedValue({ success: true });
  });

  it('should initialize with default values', () => {
    const { result } = renderHook(() => useMagicLink());

    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBe('');
    expect(result.current.emailSent).toBe(false);
    expect(result.current.sendAttempts).toBe(0);
  });

  it('should successfully request magic link with valid email', async () => {
    const { result } = renderHook(() => useMagicLink());
    const onSuccess = jest.fn();

    await result.current.requestMagicLink('test@example.com', onSuccess);

    await waitFor(() => {
      expect(result.current.emailSent).toBe(true);
      expect(result.current.sendAttempts).toBe(1);
      expect(result.current.error).toBe('');
      expect(onSuccess).toHaveBeenCalledWith('test@example.com');
      expect(mockedRequestMagicLink).toHaveBeenCalledWith('test@example.com');
    });
  });

  it('should reject invalid email', async () => {
    const { result } = renderHook(() => useMagicLink());

    await result.current.requestMagicLink('notanemail');

    await waitFor(() => {
      expect(result.current.error).toBe('Please enter a valid email address');
      expect(result.current.emailSent).toBe(false);
      expect(mockedRequestMagicLink).not.toHaveBeenCalled();
    });
  });

  it('should handle timeout error', async () => {
    const axiosError = new Error('timeout');
    Object.assign(axiosError, {
      code: 'ECONNABORTED',
      isAxiosError: true,
    });
    mockedRequestMagicLink.mockRejectedValueOnce(axiosError);

    const { result } = renderHook(() => useMagicLink());

    await result.current.requestMagicLink('test@example.com');

    await waitFor(() => {
      expect(result.current.error).toBe('Request timed out. Please try again.');
      expect(result.current.emailSent).toBe(false);
    });
  });

  it('should handle network error', async () => {
    const axiosError = new Error('network error');
    Object.assign(axiosError, {
      isAxiosError: true,
    });
    mockedRequestMagicLink.mockRejectedValueOnce(axiosError);

    const { result } = renderHook(() => useMagicLink());

    await result.current.requestMagicLink('test@example.com');

    await waitFor(() => {
      expect(result.current.error).toBe(
        'Network error. Please check your connection and try again.'
      );
    });
  });

  it('should handle 409 email in use error', async () => {
    const axiosError = new Error('409');
    Object.assign(axiosError, {
      response: { status: 409 },
      isAxiosError: true,
    });
    mockedRequestMagicLink.mockRejectedValueOnce(axiosError);

    const { result } = renderHook(() => useMagicLink());

    await result.current.requestMagicLink('test@example.com');

    await waitFor(() => {
      expect(result.current.error).toBe(
        'This email address is already associated with an account. Please use a different email address.'
      );
    });
  });

  // Not a magic-link failure: the provisional session turned out to be dead,
  // `endProvisionalSession` has already put a non-cancelable alert on screen,
  // and acknowledging it wipes and resets to onboarding. Reporting it as a
  // send failure buries a distinct, actionable cause under the catch-all
  // `..._unknown` bucket and shows the user retry copy for something retrying
  // cannot fix.
  it('reports an expired provisional session as its own outcome, not a generic send failure', async () => {
    mockedRequestMagicLink.mockRejectedValueOnce(
      new ProvisionalSessionExpired()
    );

    const { result } = renderHook(() => useMagicLink());

    await result.current.requestMagicLink('test@example.com');

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(mockCapture).toHaveBeenCalledWith(
      'magic_link_request_provisional_session_expired',
      { email: 'test@example.com' }
    );
    expect(mockCapture).not.toHaveBeenCalledWith(
      'magic_link_request_failed',
      expect.anything()
    );
    expect(mockCapture).not.toHaveBeenCalledWith(
      'magic_link_request_failed_unknown',
      expect.anything()
    );
    // The alert owns the explaining; a second, vaguer message under it would
    // only compete with it.
    expect(result.current.error).toBe('');
    expect(result.current.emailSent).toBe(false);
  });

  it('should increment send attempts on each request', async () => {
    const { result } = renderHook(() => useMagicLink());

    await result.current.requestMagicLink('test@example.com');
    await waitFor(() => expect(result.current.sendAttempts).toBe(1));

    await result.current.requestMagicLink('test@example.com');
    await waitFor(() => expect(result.current.sendAttempts).toBe(2));

    await result.current.requestMagicLink('test@example.com');
    await waitFor(() => expect(result.current.sendAttempts).toBe(3));
  });

  it('should reset form state', async () => {
    const { result } = renderHook(() => useMagicLink());

    // First request
    await result.current.requestMagicLink('test@example.com');
    await waitFor(() => expect(result.current.emailSent).toBe(true));

    // Reset
    // Called directly on the hook result (not via a fireEvent-driven
    // interaction), so React 19 needs an explicit act() to flush the
    // resulting setState calls before result.current reflects them.
    act(() => {
      result.current.resetForm();
    });

    expect(result.current.emailSent).toBe(false);
    expect(result.current.error).toBe('');
    // sendAttempts should NOT reset
    expect(result.current.sendAttempts).toBe(1);
  });

  it('should track analytics events', async () => {
    const { result } = renderHook(() => useMagicLink());

    await result.current.requestMagicLink('test@example.com');

    await waitFor(() => {
      expect(mockCapture).toHaveBeenCalledWith('magic_link_request_attempt', {
        email: 'test@example.com',
      });
      expect(mockCapture).toHaveBeenCalledWith('magic_link_sent_success', {
        email: 'test@example.com',
      });
    });
  });
});
