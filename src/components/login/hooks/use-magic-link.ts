import axios from 'axios';
import { usePostHog } from 'posthog-react-native';
import { useCallback, useState } from 'react';

import { requestMagicLink } from '@/api/auth';
import {
  ProvisionalRefreshUnavailable,
  ProvisionalSessionExpired,
} from '@/lib/auth/provisional-session';

import {
  EMAIL_IN_USE_ERROR_MESSAGE,
  GENERIC_SEND_ERROR_MESSAGE,
  NETWORK_ERROR_MESSAGE,
} from '../constants';
import { emailSchema } from '../types';

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
        // Not a send failure — nothing was ever sent, and nothing here is
        // retryable. `endProvisionalSession` has already put a non-cancelable
        // "Character Expired" alert on screen and acknowledging it wipes and
        // resets to onboarding, so this branch deliberately sets no error copy
        // (a second, vaguer message would only compete with the alert) and
        // reports its own outcome instead of the catch-all `..._unknown`.
        if (err instanceof ProvisionalSessionExpired) {
          posthog.capture('magic_link_request_provisional_session_expired', {
            email,
          });
          return;
        }

        // Deliberately NOT handled like the case above. That one is proven and
        // final and owns an alert; this one proved nothing, left the session
        // intact, and abandoned the conversion so the user could retry — so it
        // is the branch that owes them a message. Reported under its own name
        // because the send never happened: `magic_link_request_failed` would
        // claim an attempt that was never made.
        if (err instanceof ProvisionalRefreshUnavailable) {
          setError(NETWORK_ERROR_MESSAGE);
          posthog.capture(
            'magic_link_request_provisional_refresh_unavailable',
            { email }
          );
          return;
        }

        posthog.capture('magic_link_request_failed', { email });

        if (axios.isAxiosError(err)) {
          if (err.code === 'ECONNABORTED') {
            setError('Request timed out. Please try again.');
            posthog.capture('magic_link_request_failed_timeout', { email });
          } else if (!err.response) {
            setError(NETWORK_ERROR_MESSAGE);
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
