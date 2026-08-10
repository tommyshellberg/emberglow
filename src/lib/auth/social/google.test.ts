import { GoogleSignin } from '@react-native-google-signin/google-signin';

import { getGoogleCredential } from './google';

jest.mock('@react-native-google-signin/google-signin', () => ({
  GoogleSignin: {
    configure: jest.fn(),
    hasPlayServices: jest.fn().mockResolvedValue(true),
    signOut: jest.fn().mockResolvedValue(undefined),
    signIn: jest.fn(),
  },
  statusCodes: { SIGN_IN_CANCELLED: 'SIGN_IN_CANCELLED' },
}));

describe('getGoogleCredential', () => {
  beforeEach(() => jest.clearAllMocks());

  it('clears the cached account BEFORE opening the chooser', async () => {
    const order: string[] = [];
    (GoogleSignin.signOut as jest.Mock).mockImplementation(async () => {
      order.push('signOut');
    });
    (GoogleSignin.signIn as jest.Mock).mockImplementation(async () => {
      order.push('signIn');
      return { type: 'success', data: { idToken: 'tok' } };
    });

    await getGoogleCredential();

    // Order, not mere presence: signOut AFTER signIn would still record both
    // calls while leaving the cached account in place for the chooser.
    expect(order).toEqual(['signOut', 'signIn']);
  });
});
