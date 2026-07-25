import * as AppleAuthentication from 'expo-apple-authentication';
import * as Crypto from 'expo-crypto';

import {
  GoogleSignin,
  statusCodes,
} from '@react-native-google-signin/google-signin';

import { SocialSignInCancelled } from './errors';
import { getAppleCredential } from './apple';
import { getGoogleCredential } from './google';

jest.mock('@env', () => ({
  Env: {
    GOOGLE_WEB_CLIENT_ID: 'web-client-id',
    GOOGLE_IOS_CLIENT_ID: 'ios-client-id',
  },
}));

describe('getGoogleCredential', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (GoogleSignin.hasPlayServices as jest.Mock).mockResolvedValue(true);
  });

  // `getGoogleCredential` configures `GoogleSignin` at most once per process
  // (see the `configured` guard in google.ts), so the configure-call
  // assertion has to ride along with the very first invocation in this
  // file — a later, separate test wouldn't observe another `configure`
  // call and would be asserting on stale state instead.
  it('configures GoogleSignin and returns a google credential with the id token from a successful sign-in', async () => {
    (GoogleSignin.signIn as jest.Mock).mockResolvedValue({
      type: 'success',
      data: { idToken: 'google-id-token' },
    });

    const result = await getGoogleCredential();

    expect(GoogleSignin.configure).toHaveBeenCalledWith({
      webClientId: 'web-client-id',
      iosClientId: 'ios-client-id',
    });
    expect(result).toEqual({ provider: 'google', idToken: 'google-id-token' });
  });

  it('throws SocialSignInCancelled when the user cancels (type: cancelled response)', async () => {
    (GoogleSignin.signIn as jest.Mock).mockResolvedValue({
      type: 'cancelled',
      data: null,
    });

    await expect(getGoogleCredential()).rejects.toThrow(SocialSignInCancelled);
  });

  it('throws SocialSignInCancelled when signIn rejects with the SIGN_IN_CANCELLED code', async () => {
    (GoogleSignin.signIn as jest.Mock).mockRejectedValue(
      Object.assign(new Error('cancelled'), {
        code: statusCodes.SIGN_IN_CANCELLED,
      })
    );

    await expect(getGoogleCredential()).rejects.toThrow(SocialSignInCancelled);
  });

  it('throws when the success response has no idToken', async () => {
    (GoogleSignin.signIn as jest.Mock).mockResolvedValue({
      type: 'success',
      data: {},
    });

    await expect(getGoogleCredential()).rejects.toThrow(
      'Google returned no ID token'
    );
  });

  it('rethrows unrelated errors', async () => {
    (GoogleSignin.signIn as jest.Mock).mockRejectedValue(
      new Error('network down')
    );

    await expect(getGoogleCredential()).rejects.toThrow('network down');
  });
});

describe('getAppleCredential', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns an apple credential with the identity token and the RAW nonce', async () => {
    (AppleAuthentication.signInAsync as jest.Mock).mockResolvedValue({
      identityToken: 'apple-id-token',
    });

    const result = await getAppleCredential();

    expect(result).toEqual({
      provider: 'apple',
      idToken: 'apple-id-token',
      nonce: 'raw-nonce',
    });
  });

  it('sends the SHA-256 HASHED nonce to signInAsync, not the raw one', async () => {
    (AppleAuthentication.signInAsync as jest.Mock).mockResolvedValue({
      identityToken: 'apple-id-token',
    });

    await getAppleCredential();

    expect(Crypto.randomUUID).toHaveBeenCalled();
    expect(Crypto.digestStringAsync).toHaveBeenCalledWith(
      Crypto.CryptoDigestAlgorithm.SHA256,
      'raw-nonce'
    );
    expect(AppleAuthentication.signInAsync).toHaveBeenCalledWith(
      expect.objectContaining({ nonce: 'hashed-nonce' })
    );
  });

  it('throws SocialSignInCancelled when the user cancels', async () => {
    (AppleAuthentication.signInAsync as jest.Mock).mockRejectedValue(
      Object.assign(new Error('cancelled'), { code: 'ERR_REQUEST_CANCELED' })
    );

    await expect(getAppleCredential()).rejects.toThrow(SocialSignInCancelled);
  });

  it('throws when Apple returns no identity token', async () => {
    (AppleAuthentication.signInAsync as jest.Mock).mockResolvedValue({});

    await expect(getAppleCredential()).rejects.toThrow(
      'Apple returned no identity token'
    );
  });

  it('rethrows unrelated errors', async () => {
    (AppleAuthentication.signInAsync as jest.Mock).mockRejectedValue(
      new Error('device unsupported')
    );

    await expect(getAppleCredential()).rejects.toThrow('device unsupported');
  });
});
