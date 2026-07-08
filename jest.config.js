module.exports = {
  preset: 'jest-expo',
  setupFilesAfterEnv: ['<rootDir>/jest-setup.ts'],
  testMatch: ['**/?(*.)+(spec|test).ts?(x)'],
  // Ignore nested git worktrees (created under .worktrees/) so jest doesn't
  // scan their duplicate test files or collide on their haste module names.
  testPathIgnorePatterns: ['/node_modules/', '<rootDir>/.worktrees/'],
  modulePathIgnorePatterns: ['<rootDir>/.worktrees/'],
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
    [
      'tdd-guard-jest',
      {
        projectRoot: '/Users/thomasshellberg/Projects/unquest/unquest/',
      },
    ],
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
