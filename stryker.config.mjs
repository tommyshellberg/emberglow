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
  reporters: ['html', 'clear-text', 'progress'],
  htmlReporter: { fileName: 'reports/mutation/index.html' },
  concurrency: 12,
  // jest-expo startup is ~1.7s for a single small file; the 5000ms default
  // would flag slow-but-correct runs as timeouts.
  timeoutMS: 60000,
};

export default config;
