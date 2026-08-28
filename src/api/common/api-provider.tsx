import { useReactQueryDevTools } from '@dev-plugins/react-query';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as React from 'react';

import { queryClientConfig } from '@/lib/react-query-error-handler';

import { bindFocusManagerToAppState } from './bind-focus-to-app-state';

export const queryClient = new QueryClient(queryClientConfig);

export function APIProvider({ children }: { children: React.ReactNode }) {
  useReactQueryDevTools(queryClient);
  React.useEffect(() => bindFocusManagerToAppState(), []);
  return (
    // Provide the client to your App
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}
