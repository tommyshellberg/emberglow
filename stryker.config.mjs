// @ts-check
/** @type {import('@stryker-mutator/api/core').PartialStrykerOptions} */
const config = {
  packageManager: 'pnpm',
  testRunner: 'jest',
  jest: {
    projectType: 'custom',
    configFile: 'jest.mutation.config.js',
    enableFindRelatedTests: true,
  },
  // Run only the tests that cover each mutant. Without this every mutant
  // runs the whole suite, turning a minutes-long run into an hours-long one.
  coverageAnalysis: 'perTest',
  // The audit set (Task 3). Override per-file with `--mutate <path>`.
  mutate: [
    'src/store/settings-store.ts',
    'src/store/user-store.ts',
    'src/store/scheduled-quests-store.ts',
    'src/lib/services/revenuecat-service.ts',
    'src/lib/services/quest-timer.ts',
  ],
  // Keep the sandbox small — ios/ and android/ are large native trees that
  // no mutation run needs.
  ignorePatterns: ['ios', 'android', '.worktrees', 'coverage', 'reports'],
  disableTypeChecks: 'src/**/*.{ts,tsx}',
  // 'json' is what makes a run's survivors queryable afterwards. Without it
  // the only artifact is a 2 MB HTML file whose embedded `app.report` object
  // has to be hand-extracted before it can be read.
  reporters: ['html', 'json', 'clear-text', 'progress'],
  htmlReporter: { fileName: 'reports/mutation/index.html' },
  jsonReporter: { fileName: 'reports/mutation/report.json' },
  concurrency: 12,
  // Overhead allowance on top of the measured dry-run time (Stryker adds
  // timeoutFactor * dryRunTime itself). jest-expo startup is ~1.7s for a
  // single small file, so 10s is already generous.
  //
  // Do NOT raise this back to 60s. quest-timer.test.ts runs on fake timers, so
  // a mutant that reaches an `await new Promise(r => setTimeout(r, delay))`
  // — the cooperative lock-status retry ladder — hangs rather than resolving.
  // Those are real kills (the mutant that forces `retryCount < maxRetries`
  // true is a genuine infinite loop), but at 60s each they took the audit from
  // 50 minutes to over four hours. Report the TimedOut column alongside the
  // score: Stryker counts timeouts as killed.
  timeoutMS: 10000,
};

export default config;
