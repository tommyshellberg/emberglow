/**
 * Thrown by the native social sign-in wrappers (`getGoogleCredential`,
 * `getAppleCredential`) when the user dismisses the provider's sign-in UI
 * instead of completing it. Callers (e.g. the sign-in screen) should catch
 * this specifically to no-op instead of surfacing an error toast.
 */
export class SocialSignInCancelled extends Error {
  constructor() {
    super('Social sign-in was cancelled');
    this.name = 'SocialSignInCancelled';
  }
}
