import * as AppleAuthentication from 'expo-apple-authentication';
import * as Crypto from 'expo-crypto';

import { SocialSignInCancelled } from './errors';

/**
 * Runs the native Sign in with Apple flow and returns the credential the
 * server needs to verify the user.
 *
 * A random nonce is generated per attempt: the SHA-256 hash of it is sent to
 * Apple (`signInAsync`'s `nonce` option), while the RAW value is returned
 * here so the caller can forward it to the server, which hashes it the same
 * way to verify it matches the nonce embedded in Apple's identity token.
 */
export async function getAppleCredential() {
  const rawNonce = Crypto.randomUUID();
  const hashedNonce = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    rawNonce
  );

  try {
    const credential = await AppleAuthentication.signInAsync({
      requestedScopes: [AppleAuthentication.AppleAuthenticationScope.EMAIL],
      nonce: hashedNonce,
    });

    if (!credential.identityToken) {
      throw new Error('Apple returned no identity token');
    }

    return {
      provider: 'apple' as const,
      idToken: credential.identityToken,
      nonce: rawNonce,
    };
  } catch (e: any) {
    if (e?.code === 'ERR_REQUEST_CANCELED') {
      throw new SocialSignInCancelled();
    }
    throw e;
  }
}
