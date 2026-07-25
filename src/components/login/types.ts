import * as z from 'zod';

/**
 * Email validation schema
 */
export const emailSchema = z.object({
  email: z
    .string({
      required_error: 'Email is required',
    })
    .email('Invalid email format'),
});

/**
 * Email form type derived from schema
 */
export type EmailFormType = z.infer<typeof emailSchema>;

/**
 * How the user arrived at `/login`, which decides the screen's framing (see
 * `copy.ts`):
 * - `signin`: a returning user signing into an existing account.
 * - `convert`: a provisional user turning their first quest into an account.
 *
 * The buttons stay mode-neutral ("Continue with...") on every surface and the
 * server resolves what actually happened; this only picks the copy.
 */
export type LoginIntent = 'signin' | 'convert';

/**
 * Props for login form
 */
export type LoginFormProps = {
  onSubmit?: (data: EmailFormType) => void;
  initialError?: string | null;
  /**
   * Omitted means "no framing was supplied", which is the returning-user
   * case. `parseLoginIntent` applies the same default to URL params.
   */
  intent?: LoginIntent;
};

/**
 * Magic link request state
 */
export type MagicLinkState = {
  isLoading: boolean;
  error: string;
  emailSent: boolean;
  sendAttempts: number;
};
