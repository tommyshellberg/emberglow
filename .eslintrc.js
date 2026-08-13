const path = require('path');

module.exports = {
  root: true,
  extends: ['expo', 'plugin:tailwindcss/recommended', 'prettier'],
  plugins: [
    'prettier',
    'unicorn',
    '@typescript-eslint',
    'unused-imports',
    'tailwindcss',
    'simple-import-sort',
    'eslint-plugin-react-compiler',
  ],
  parserOptions: {
    project: './tsconfig.json',
  },
  rules: {
    'prettier/prettier': 'warn',
    'unicorn/filename-case': [
      'error',
      {
        case: 'kebabCase',
        ignore: ['/android', '/ios'],
      },
    ],
    'max-params': ['error', 3], // Limit the number of parameters in a function to use object instead
    'max-lines-per-function': ['error', 500],
    'react/display-name': 'off',
    'react/no-inline-styles': 'off',
    'react/destructuring-assignment': 'off', // Vscode doesn't support automatically destructuring, it's a pain to add a new variable
    'react/require-default-props': 'off', // Allow non-defined react props as undefined
    '@typescript-eslint/comma-dangle': 'off', // Avoid conflict rule between Eslint and Prettier
    '@typescript-eslint/consistent-type-imports': [
      'warn',
      {
        prefer: 'type-imports',
        fixStyle: 'inline-type-imports',
        disallowTypeAnnotations: true,
      },
    ], // Ensure `import type` is used when it's necessary
    'import/prefer-default-export': 'off', // Named export is easier to refactor automatically
    'import/no-cycle': ['error', { maxDepth: '∞' }],
    'tailwindcss/classnames-order': [
      'warn',
      {
        officialSorting: true,
      },
    ], // Follow the same ordering as the official plugin `prettier-plugin-tailwindcss`
    'simple-import-sort/imports': 'error', // Import configuration for `eslint-plugin-simple-import-sort`
    'simple-import-sort/exports': 'error', // Export configuration for `eslint-plugin-simple-import-sort`
    '@typescript-eslint/no-unused-vars': 'off',
    // Every bottom sheet in this app must go through one of the two wrappers
    // listed in the override at the bottom of this file.
    //
    // Why: @gorhom/bottom-sheet turns `accessible` on by default on the single
    // view that wraps a sheet's children. On iOS that makes the whole sheet one
    // accessibility element, so everything inside it disappears from the
    // accessibility tree — VoiceOver reads only "Bottom Sheet" and no testID
    // inside a sheet can be found. Both wrappers pass `accessible={false}` to
    // switch that off. A third wrapper built straight on `BottomSheetModal`
    // would ship the bug again, and nothing on screen would look wrong.
    //
    // Type-only imports are fine. Consumers legitimately write
    // `useRef<BottomSheetModal>(null)` to hold a ref to a wrapper.
    '@typescript-eslint/no-restricted-imports': [
      'error',
      {
        paths: [
          {
            name: '@gorhom/bottom-sheet',
            importNames: ['BottomSheetModal'],
            allowTypeImports: true,
            message:
              'Render a sheet with `BottomSheet` from @/components/emberglow/overlay/bottom-sheet, or `Modal` from @/components/ui/modal. Using `BottomSheetModal` directly hides the sheet contents from the iOS accessibility tree, because the library sets `accessible` to true on the view wrapping the children. Both wrappers already pass `accessible={false}`. A type-only import (`import type { BottomSheetModal }`) is allowed.',
          },
        ],
      },
    ],
    'tailwindcss/no-custom-classname': 'off',
    'unused-imports/no-unused-imports': 'error',
    'unused-imports/no-unused-vars': [
      'error',
      {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        caughtErrorsIgnorePattern: '^_',
      },
    ],
  },
  overrides: [
    // Configuration for  translations files (i18next)
    {
      files: ['src/translations/*.json'],
      extends: ['plugin:i18n-json/recommended'],
      rules: {
        'i18n-json/valid-message-syntax': [
          2,
          {
            syntax: path.resolve('./scripts/i18next-syntax-validation.js'),
          },
        ],
        'i18n-json/valid-json': 2,
        'i18n-json/sorted-keys': [
          2,
          {
            order: 'asc',
            indentSpaces: 2,
          },
        ],
        'i18n-json/identical-keys': [
          2,
          {
            filePath: path.resolve('./src/translations/en.json'),
          },
        ],
        'prettier/prettier': [
          0,
          {
            singleQuote: true,
            endOfLine: 'auto',
          },
        ],
      },
    },
    {
      // The two sheet wrappers. These are the only files allowed to render
      // `BottomSheetModal` directly — see the rule's comment above.
      files: [
        'src/components/emberglow/overlay/bottom-sheet.tsx',
        'src/components/ui/modal.tsx',
      ],
      rules: {
        '@typescript-eslint/no-restricted-imports': 'off',
      },
    },
    {
      // Configuration for testing files
      files: ['**/__tests__/**/*.[jt]s?(x)', '**/?(*.)+(spec|test).[jt]s?(x)'],
      extends: ['plugin:testing-library/react'],
      rules: {
        'max-lines-per-function': 'off', // Test files can have long test suites
      },
    },
  ],
};
