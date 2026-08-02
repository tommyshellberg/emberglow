import { getSentryConfig } from './sentry-config';

describe('getSentryConfig', () => {
  it('production: enabled, 5% session replays, 100% error replays, 15% traces', () => {
    expect(getSentryConfig('production')).toEqual({
      enabled: true,
      replaysSessionSampleRate: 0.05,
      replaysOnErrorSampleRate: 1.0,
      tracesSampleRate: 0.15,
    });
  });

  it('staging: enabled, no session replays, full traces', () => {
    expect(getSentryConfig('staging')).toEqual({
      enabled: true,
      replaysSessionSampleRate: 0,
      replaysOnErrorSampleRate: 1.0,
      tracesSampleRate: 1.0,
    });
  });

  it('development: fully disabled', () => {
    expect(getSentryConfig('development')).toEqual({
      enabled: false,
      replaysSessionSampleRate: 0,
      replaysOnErrorSampleRate: 0,
      tracesSampleRate: 0,
    });
  });

  it('unknown env falls back to the disabled development config', () => {
    expect(getSentryConfig('e2e').enabled).toBe(false);
  });
});
