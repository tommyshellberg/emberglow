import { PostHogProvider } from 'posthog-react-native';
import React from 'react';

import { posthogClient } from '@/lib/posthog';

interface PostHogProviderWrapperProps {
  children: React.ReactNode;
}

export function PostHogProviderWrapper({
  children,
}: PostHogProviderWrapperProps) {
  return (
    <PostHogProvider
      // Shared module-level client so non-React code (services, stores) can
      // capture through the same instance — see src/lib/posthog.ts.
      client={posthogClient}
      // Disable autocapture to prevent navigation errors
      autocapture={false}
    >
      {children}
    </PostHogProvider>
  );
}
