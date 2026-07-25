import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { NavigationContainer } from '@react-navigation/native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { RenderOptions } from '@testing-library/react-native';
import { render, renderAsync, userEvent } from '@testing-library/react-native';
import type { ReactElement } from 'react';
import React from 'react';

import { LazyWebSocketProvider } from '@/components/providers/lazy-websocket-provider';

// Create a client for testing
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Turn off retries and caching for testing
      retry: false,
      gcTime: 0,
    },
  },
});

const createAppWrapper = () => {
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <LazyWebSocketProvider>
        <BottomSheetModalProvider>
          <NavigationContainer>{children}</NavigationContainer>
        </BottomSheetModalProvider>
      </LazyWebSocketProvider>
    </QueryClientProvider>
  );
};

const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => {
  const Wrapper = createAppWrapper(); // make sure we have a new wrapper for each render
  return render(ui, { wrapper: Wrapper, ...options });
};

// Async counterpart to `render`, for tests that mount/unmount repeatedly in
// a single test (e.g. a loop asserting several data variants). `render`'s
// mount is wrapped in a synchronous `act()` whose scope can still be
// finishing up (via a microtask) when control returns; chaining straight
// into another act()-wrapped call (`user.press`, `waitFor`, `unmountAsync`)
// without an intervening await can race that teardown and, under React 19,
// surface as "overlapping act() calls" - which then corrupts
// react-test-renderer's shared state for every later render() in the file.
// `renderAsync` awaits its own act() scope before returning, avoiding the
// race. Prefer `render` for the common single-mount-per-test case.
const customRenderAsync = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => {
  const Wrapper = createAppWrapper();
  return renderAsync(ui, { wrapper: Wrapper, ...options });
};

// Reset the query client between tests
export const resetQueryClient = () => {
  queryClient.clear();
};

// use this if you want to test user events
export const setup = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => {
  const Wrapper = createAppWrapper();
  return {
    user: userEvent.setup(),
    ...render(ui, { wrapper: Wrapper, ...options }),
  };
};

export * from '@testing-library/react-native';
export { customRender as render, customRenderAsync as renderAsync };
