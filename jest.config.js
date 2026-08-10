module.exports = {
  preset: 'jest-expo',
  // react-native-worklets ships native-only modules that throw when the
  // native part isn't initialized (as in Jest). Its own resolver strips
  // `.native.` extensions for requests inside the package so jest falls
  // back to the platform-agnostic (web-shim) implementation instead.
  // See node_modules/react-native-worklets/jest/resolver.js.
  resolver: 'react-native-worklets/jest/resolver.js',
  setupFilesAfterEnv: ['<rootDir>/jest-setup.ts'],
  testMatch: ['**/?(*.)+(spec|test).ts?(x)'],
  // Ignore nested git worktrees (created under .worktrees/) and the Stryker
  // mutation-testing sandbox (.stryker-tmp/), both of which hold whole copies
  // of the repo. Without this jest scans their duplicate test files and
  // collides on their haste module names.
  testPathIgnorePatterns: [
    '/node_modules/',
    '<rootDir>/.worktrees/',
    '<rootDir>/.stryker-tmp/',
  ],
  modulePathIgnorePatterns: ['<rootDir>/.worktrees/', '<rootDir>/.stryker-tmp/'],
  silent: true, // Suppress console output by default
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!**/coverage/**',
    '!**/node_modules/**',
    '!**/babel.config.js',
    '!**/jest.setup.js',
    '!**/docs/**',
    '!**/cli/**',
  ],
  moduleFileExtensions: ['js', 'ts', 'tsx'],
  transformIgnorePatterns: [
    `node_modules/(?!(?:.pnpm/)?((jest-)?react-native|@react-native(-community)?|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|@sentry/.*|native-base|react-native-svg|@dev-plugins/.*|@tanstack/.*|uuid))`,
  ],
  coverageReporters: ['json-summary', ['text', { file: 'coverage.txt' }]],
  reporters: [
    'default',
    'tdd-guard-jest',
    ['github-actions', { silent: false }],
    'summary',
    [
      'jest-junit',
      {
        outputDirectory: 'coverage',
        outputName: 'jest-junit.xml',
        ancestorSeparator: ' › ',
        uniqueOutputName: 'false',
        suiteNameTemplate: '{filepath}',
        classNameTemplate: '{classname}',
        titleTemplate: '{title}',
      },
    ],
  ],
  coverageDirectory: '<rootDir>/coverage/',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '\\.(jpg|jpeg|png|gif|webp|svg|lottie)$': '<rootDir>/__mocks__/fileMock.js',
  },
  setupFiles: ['<rootDir>/.jest/setEnvVars.js'],
};
