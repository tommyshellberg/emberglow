type AppEnv = 'development' | 'staging' | 'production';

export type SentryEnvConfig = {
  enabled: boolean;
  replaysSessionSampleRate: number;
  replaysOnErrorSampleRate: number;
  tracesSampleRate: number;
};

const CONFIGS: Record<AppEnv, SentryEnvConfig> = {
  production: {
    enabled: true,
    replaysSessionSampleRate: 0.05,
    replaysOnErrorSampleRate: 1.0,
    tracesSampleRate: 0.15,
  },
  staging: {
    enabled: true,
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 1.0,
    tracesSampleRate: 1.0,
  },
  development: {
    enabled: false,
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 0,
    tracesSampleRate: 0,
  },
};

export function getSentryConfig(appEnv: string): SentryEnvConfig {
  return CONFIGS[appEnv as AppEnv] ?? CONFIGS.development;
}
