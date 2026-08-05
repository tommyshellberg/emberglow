import { Redirect, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';

import { parseLoginIntent } from '@/components/login/copy';
import { LoginForm } from '@/components/login-form';
import { FocusAwareStatusBar } from '@/components/ui';
import { useAuth } from '@/lib';
import { hasProvisionalSession } from '@/lib/auth/provisional-session';

export default function Login() {
  const params = useLocalSearchParams();
  const [error, setError] = useState<string | null>(null);

  // How the user got here decides the screen's framing. Parsed (not cast):
  // `params.intent` is `string | string[] | undefined`, and anything that
  // isn't a known intent takes the returning-user default.
  const intent = parseLoginIntent(params.intent);

  // Extract error from URL parameters
  useEffect(() => {
    if (params.error) {
      setError(decodeURIComponent(params.error as string));
    }
  }, [params]);

  // If we're already logged in, redirect to the home screen.
  //
  // `status === 'signIn'` does NOT mean "has a real account": a provisional
  // session hydrates as 'signIn' too (see auth hydrate()). Every user the
  // conversion gate holds is in exactly that state — the gate is the
  // resolver's LAST branch, below `signOut → login`, so having a session is
  // the definition of the gated population, not an edge case. Redirecting
  // them sent the wall's one email escape hatch nowhere: `/` resolves to
  // `(app)/index`, which is not in PRE_ACCOUNT_ZONE, so NavigationGate
  // replaced them straight back onto /quest-completed-signup and "Sign up
  // with email" only ever flashed. Same dead-link shape is-already-at-target
  // documents having fixed three times already.
  const { status } = useAuth();
  if (status === 'signIn' && !hasProvisionalSession()) {
    return <Redirect href="/" />;
  }

  return (
    <>
      <FocusAwareStatusBar />
      <LoginForm initialError={error} intent={intent} />
    </>
  );
}
