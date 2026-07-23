import axios from 'axios';
import { usePostHog } from 'posthog-react-native';
import { useCallback, useState } from 'react';

import { requestMagicLink } from '@/api/auth';

import { emailSchema } from '../types';

/**
 * Shared with `login-form.tsx`'s social sign-in error mapping — a 409 from
 * either auth path (magic link or social) means the same thing to the user,
 * so both surfaces show the identical copy rather than each owning a
 * hand-typed duplicate that could drift.
 */
export const EMAIL_IN_USE_ERROR_MESSAGE =
  'This email address is already associated with an account. Please use a different email address.';

/** Ditto for the catch-all failure copy. */
export const GENERIC_SEND_ERROR_MESSAGE =
  'Login link failed to send. Please try again.';

export type UseMagicLinkReturn = {
  isLoading: boolean;
  error: string;
  emailSent: boolean;
  sendAttempts: number;
  submittedEmail: string;
  requestMagicLink: (
    email: string,
    onSuccess?: (email: string) => void
  ) => Promise<void>;
  resetForm: () => void;
  setError: (error: string) => void;
};

/**
 * Custom hook for handling magic link authentication flow
 * Manages state, validation, API calls, and analytics
 */
export function useMagicLink(): UseMagicLinkReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [emailSent, setEmailSent] = useState(false);
  const [sendAttempts, setSendAttempts] = useState(0);
  const [submittedEmail, setSubmittedEmail] = useState('');
  const posthog = usePostHog();

  const handleMagicLinkRequest = useCallback(
    async (email: string, onSuccess?: (email: string) => void) => {
      // Validate email using Zod schema
      const validation = emailSchema.safeParse({ email });

      if (!validation.success) {
        setError('Please enter a valid email address');
        posthog.capture('magic_link_request_invalid_email', { email });
        return;
      }

      posthog.capture('magic_link_request_attempt', { email });

      setError('');
      setIsLoading(true);
      setSendAttempts((prev) => prev + 1);

      try {
        await requestMagicLink(email);
        posthog.capture('magic_link_sent_success', { email });
        setSubmittedEmail(email);
        setEmailSent(true);
        onSuccess?.(email);
      } catch (err) {
        posthog.capture('magic_link_request_failed', { email });

        if (axios.isAxiosError(err)) {
          if (err.code === 'ECONNABORTED') {
            setError('Request timed out. Please try again.');
            posthog.capture('magic_link_request_failed_timeout', { email });
          } else if (!err.response) {
            setError(
              'Network error. Please check your connection and try again.'
            );
            posthog.capture('magic_link_request_failed_network_error', {
              email,
            });
          } else if (err.response.status === 409) {
            setError(EMAIL_IN_USE_ERROR_MESSAGE);
            posthog.capture('magic_link_request_failed_email_in_use', {
              email,
            });
          } else {
            setError(GENERIC_SEND_ERROR_MESSAGE);
            posthog.capture('magic_link_request_failed_server_error', {
              email,
              status: err.response.status,
            });
          }
        } else {
          setError(GENERIC_SEND_ERROR_MESSAGE);
          posthog.capture('magic_link_request_failed_unknown', { email });
        }
      } finally {
        setIsLoading(false);
      }
    },
    [posthog]
  );

  const resetForm = useCallback(() => {
    setEmailSent(false);
    setError('');
  }, []);

  return {
    isLoading,
    error,
    emailSent,
    sendAttempts,
    submittedEmail,
    requestMagicLink: handleMagicLinkRequest,
    resetForm,
    setError,
  };
}
