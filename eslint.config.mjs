// eslint.config.mjs
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { FlatCompat } from '@eslint/eslintrc';

import nextPlugin from '@next/eslint-plugin-next';
import reactPlugin from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import importPlugin from 'eslint-plugin-import';
import securityPlugin from 'eslint-plugin-security';
import tsPlugin from '@typescript-eslint/eslint-plugin';
import promise from 'eslint-plugin-promise';
import prettierPlugin from 'eslint-plugin-prettier';
import testingLibraryPlugin from 'eslint-plugin-testing-library';
import nodePlugin from 'eslint-plugin-n';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
  recommendedConfig: true,
});

/** @type {import('eslint').Linter.FlatConfig[]} */
export default [
  {
    files: ['**/*.{js,jsx,ts,tsx}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        React: 'readonly',
        JSX: 'readonly',
        NodeJS: 'readonly',
      },
    },
    plugins: {
      react: reactPlugin,
      'react-hooks': reactHooks,
      'jsx-a11y': jsxA11y,
      import: importPlugin,
      security: securityPlugin,
      '@typescript-eslint': tsPlugin,
      promise,
      prettier: prettierPlugin,
      'testing-library': testingLibraryPlugin,
      node: nodePlugin,
      '@next/next': nextPlugin,
    },
    ignores: ['.next/', 'dist/', 'node_modules/', '*.config.*', '**/*.d.ts'],
  },

  // React
  {
    rules: {
      'react/jsx-props-no-spreading': 'off',
      'react/react-in-jsx-scope': 'off',
      'react/require-default-props': 'off',
      'react/destructuring-assignment': ['warn', 'always'],
      'react/function-component-definition': ['error', {
        namedComponents: 'arrow-function',
        unnamedComponents: 'arrow-function',
      }],
      'react/jsx-key': 'error',
      'react/no-array-index-key': 'warn',
      'react/self-closing-comp': ['error', { component: true, html: true }],
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
    },
  },

  // TypeScript
  ...compat.config({
    extends: [
      'plugin:@typescript-eslint/recommended',
      'plugin:@typescript-eslint/recommended-requiring-type-checking',
    ],
    parser: '@typescript-eslint/parser',
    parserOptions: {
      project: './tsconfig.json',
      tsconfigRootDir: __dirname,
      sourceType: 'module',
      ecmaFeatures: { jsx: true },
    },
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/consistent-type-definitions': ['error', 'type'],
      '@typescript-eslint/consistent-indexed-object-style': ['error', 'record'],
      '@typescript-eslint/consistent-type-exports': 'error',
      '@typescript-eslint/no-misused-promises': 'error',
      '@typescript-eslint/no-floating-promises': ['error', { ignoreVoid: false }],
      '@typescript-eslint/no-unsafe-argument': 'error',
      '@typescript-eslint/no-unsafe-assignment': 'error',
      '@typescript-eslint/no-unsafe-member-access': 'warn',
      '@typescript-eslint/no-unsafe-call': 'warn',
      '@typescript-eslint/no-unsafe-return': 'error',
      '@typescript-eslint/no-confusing-void-expression': 'error',
      '@typescript-eslint/explicit-function-return-type': ['warn', { allowExpressions: true }],
      '@typescript-eslint/naming-convention': [
        'error',
        { selector: 'typeLike', format: ['PascalCase'] },
        { selector: 'variable', format: ['camelCase', 'UPPER_CASE'] },
        { selector: 'function', format: ['camelCase'] },
        { selector: 'parameter', format: ['camelCase'], leadingUnderscore: 'allow' },
      ],
      '@typescript-eslint/ban-ts-comment': 'warn',
    },
  }),

  // Next.js
  {
    files: ['app/**/*.tsx', 'pages/**/*.tsx'],
    rules: {
      ...nextPlugin.configs.recommended.rules,
      '@next/next/no-html-link-for-pages': 'off',
      '@next/next/no-img-element': 'warn',
      '@next/next/no-sync-scripts': 'error',
      '@next/next/no-server-import-in-page': 'error',
    },
  },

  // A11y
  {
    rules: {
      'jsx-a11y/anchor-is-valid': 'warn',
      'jsx-a11y/alt-text': 'error',
      'jsx-a11y/label-has-associated-control': 'error',
      'jsx-a11y/no-autofocus': 'error',
      'jsx-a11y/no-noninteractive-element-interactions': 'error',
      'jsx-a11y/no-static-element-interactions': 'warn',
    },
  },

  // Security
  {
    rules: {
      'security/detect-possible-timing-attacks': 'error',
      'security/detect-object-injection': 'warn',
      'security/detect-child-process': 'error',
      'security/detect-disable-mustache-escape': 'error',
      'security/detect-non-literal-fs-filename': 'error',
      'security/detect-non-literal-regexp': 'error',
      'security/detect-non-literal-require': 'error',
      'security/detect-eval-with-expression': 'error',
      'security/detect-bidi-characters': 'warn',
      'security/detect-unsafe-regex': 'error',
      'security/detect-buffer-noassert': 'warn',
    },
  },

  // Testing Library
  {
    files: ['**/__tests__/**/*.tsx', '**/*.test.{ts,tsx}'],
    rules: {
      ...testingLibraryPlugin.configs.react.rules,
      'testing-library/prefer-screen-queries': 'error',
      'testing-library/no-node-access': 'error',
      'testing-library/no-unnecessary-act': 'warn',
      'testing-library/no-manual-cleanup': 'error',
    },
  },

  // Node.js
  {
    files: ['src/server/**/*.ts'],
    rules: {
      'node/no-unpublished-import': 'error',
      'node/no-sync': 'error',
      'node/prefer-global/buffer': 'error',
      'node/handle-callback-err': 'error',
    },
  },

  // Import & Promise
  {
    rules: {
      'import/prefer-default-export': 'off',
      'import/no-anonymous-default-export': 'error',
      'import/no-cycle': 'warn',
      'import/no-default-export': 'off',
      'import/no-extraneous-dependencies': ['error'],
      'import/order': [
        'error',
        {
          groups: ['builtin', 'external', 'internal', 'parent', 'sibling', 'index'],
          'newlines-between': 'always',
          alphabetize: { order: 'asc', caseInsensitive: true },
        },
      ],
      'promise/always-return': 'warn',
      'promise/no-return-wrap': 'error',
      'promise/param-names': 'error',
      'promise/catch-or-return': ['error', { allowFinally: true }],
      'promise/no-nesting': 'warn',
    },
  },

  // Prettier
  {
    rules: {
      'prettier/prettier': ['error', {
        printWidth: 100,
        singleQuote: true,
        trailingComma: 'all',
        endOfLine: 'auto',
        arrowParens: 'always',
        bracketSpacing: true,
        jsxSingleQuote: false,
        proseWrap: 'preserve',
        quoteProps: 'as-needed',
        semi: true,
        tabWidth: 2,
        useTabs: false,
      }],
    },
  },

  // Config file exceptions
  {
    files: ['*.config.{js,mjs,cjs}'],
    rules: {
      'security/detect-non-literal-fs-filename': 'off',
      'import/no-default-export': 'off',
      '@typescript-eslint/no-var-requires': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      'node/no-unpublished-import': 'off',
    },
  },
];

