import { fireEvent, render, screen } from '@/lib/test-utils';

import { FadingCard } from './fading-card';

// Mock the router (matches the repo convention used in index.test.tsx)
const mockPush = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

describe('FadingCard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows the fading message and routes to /restoration on CTA', () => {
    render(<FadingCard />);

    expect(screen.getByText(/Your Spirit Is Fading/i)).toBeTruthy();

    fireEvent.press(screen.getByText(/Begin the Restoration/i));

    expect(mockPush).toHaveBeenCalledWith('/restoration');
  });
});
