import type { ConfigContext } from '@expo/config';

import appConfig from './app.config';

/**
 * Guards the OTA update configuration.
 *
 * `UpdateNotificationBar` used to be a second, visible update pipeline. It was
 * removed on 2026-07-28 (see
 * docs/superpowers/specs/2026-07-28-ota-background-updates-design.md), which
 * makes the `updates` block in app.config.ts the *only* mechanism delivering JS
 * bundles to users — and it is completely invisible. Nothing renders it,
 * nothing logs it, no screen reflects it.
 *
 * Each assertion below covers a distinct way OTA delivery can die in total
 * silence: never checking, blocking the splash instead, pointing at the wrong
 * endpoint, or publishing under a runtime no installed binary matches. None of
 * these produce a symptom until someone notices a shipped update reached
 * nobody.
 */
describe('app.config OTA updates', () => {
  const config = appConfig({ config: {} } as unknown as ConfigContext);

  it('checks for an update on every cold boot', () => {
    // 'NEVER' is the tempting local-debugging value. Committing it stops all
    // OTA delivery permanently, for every user, with no other symptom.
    expect(config.updates?.checkAutomatically).toBe('ON_LOAD');
  });

  it('never blocks the splash screen waiting on the network', () => {
    // Any value > 0 makes startup wait on a network round trip. Expo's own
    // guidance calls that user experience "extremely poor". 0 means: launch
    // from cache immediately, download in the background, apply next boot.
    expect(config.updates?.fallbackToCacheTimeout).toBe(0);
  });

  it('points at the Emberglow EAS update endpoint', () => {
    // A wrong or typo'd project URL sends every client to a dead endpoint.
    // Changing this should be a deliberate act, so it costs a test edit.
    expect(config.updates?.url).toBe(
      'https://u.expo.dev/30766cfb-793b-416b-ac27-d37f2e0dff9a'
    );
  });

  it('keeps runtimeVersion in lockstep with the app version', () => {
    // Updates are only served to binaries whose runtimeVersion matches the one
    // they were published under. If these two drift, updates are published
    // under a runtime no installed binary has, and they reach nobody.
    //
    // The stringMatching guard is load-bearing: `expect(undefined).toBe(
    // undefined)` passes, so without it this test would stay green if both
    // fields disappeared.
    expect(config.version).toEqual(expect.stringMatching(/^\d+\.\d+\.\d+$/));
    expect(config.runtimeVersion).toBe(config.version);
  });
});
