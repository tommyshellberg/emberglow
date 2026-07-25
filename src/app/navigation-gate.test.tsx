import { render } from '@testing-library/react-native';
import React from 'react';

import { type NavigationTarget } from '@/lib/navigation/navigation-state-resolver';

import NavigationGate from './navigation-gate';

const mockReplace = jest.fn();
const mockPush = jest.fn();

// Where the router currently is. Mutated per test to stand in for a
// user-initiated navigation that has already landed.
let mockSegments: string[] = [];
let mockPathname = '/';

jest.mock('expo-router', () => ({
  useRouter: () => ({ replace: mockReplace, push: mockPush }),
  useSegments: () => mockSegments,
  usePathname: () => mockPathname,
  useRootNavigationState: () => ({ key: 'root-key' }),
}));

// The resolver's verdict is the input under test here, not the thing being
// tested — its own unit tests cover how state maps to a target. This file is
// about what the gate DOES with that verdict once the user has moved.
let mockTarget: NavigationTarget = { type: 'loading' };
jest.mock('@/lib/navigation/navigation-state-resolver', () => ({
  useNavigationTarget: () => mockTarget,
}));

beforeEach(() => {
  jest.clearAllMocks();
});

describe('NavigationGate — user-initiated moves inside the signed-out area', () => {
  it('leaves a user who tapped "Have an account? Log in" on /login', () => {
    // Fresh install: signed out, onboarding NOT_STARTED. The resolver returns
    // 'onboarding' for this state and keeps returning it — nothing about
    // tapping the link changes any store.
    mockTarget = { type: 'onboarding' };

    // welcome.tsx:42 has already run router.replace('/login').
    mockSegments = ['login'];
    mockPathname = '/login';

    render(<NavigationGate />);

    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('leaves a returning user who tapped "Create a hero" on the welcome screen', () => {
    // Signed out with onboarding COMPLETED — the resolver returns 'login'.
    mockTarget = { type: 'login' };

    // login-form.tsx:205 has already run router.replace('/onboarding/welcome').
    mockSegments = ['onboarding', 'welcome'];
    mockPathname = '/onboarding/welcome';

    render(<NavigationGate />);

    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('leaves a post-first-quest user who tapped "Create account" on /login', () => {
    // currentStep === VIEWING_SIGNUP_PROMPT, so the resolver returns
    // 'quest-completed-signup'.
    mockTarget = { type: 'quest-completed-signup' };

    // quest-completed-signup.tsx:95 has already run
    // router.replace({ pathname: '/login', params: { intent: 'convert' } }).
    mockSegments = ['login'];
    mockPathname = '/login';

    render(<NavigationGate />);

    expect(mockReplace).not.toHaveBeenCalled();
  });
});

describe('NavigationGate — evictions it must still perform', () => {
  it('pulls a user on /login into a pending quest', () => {
    mockTarget = { type: 'pending-quest', questId: 'quest-1' };
    mockSegments = ['login'];
    mockPathname = '/login';

    render(<NavigationGate />);

    expect(mockPush).toHaveBeenCalledWith('/pending-quest');
  });

  it('pulls a signed-in user off /login and into the app', () => {
    mockTarget = { type: 'app' };
    mockSegments = ['login'];
    mockPathname = '/login';

    render(<NavigationGate />);

    expect(mockReplace).toHaveBeenCalledWith('/(app)');
  });

  it('sends a fresh launch to onboarding before the navigator settles', () => {
    mockTarget = { type: 'onboarding' };
    mockSegments = [];
    mockPathname = '/';

    render(<NavigationGate />);

    expect(mockReplace).toHaveBeenCalledWith('/onboarding');
  });
});
