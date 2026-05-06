import js from '@eslint/js'
import tseslint from 'typescript-eslint'
import reactPlugin from 'eslint-plugin-react'

export default tseslint.config(
  { ignores: ['dist/', 'coverage/', 'node_modules/'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    },
  },
  // Ban React unsafe HTML injection — defense-in-depth against XSS
  {
    files: ['src/client/**/*.tsx'],
    plugins: { react: reactPlugin },
    rules: {
      'react/no-danger': 'error',
    },
  },
  // Import boundary: src/shared/ cannot import from client or server
  {
    files: ['src/shared/**/*.ts'],
    rules: {
      'no-restricted-imports': ['error', {
        patterns: [
          { group: ['@client/*', '@server/*', '../client/*', '../server/*', '../../client/*', '../../server/*'],
            message: 'src/shared/ must not import from src/client/ or src/server/.' },
        ],
      }],
    },
  },
  // Import boundary: src/client/ cannot import from server
  {
    files: ['src/client/**/*.ts', 'src/client/**/*.tsx'],
    rules: {
      'no-restricted-imports': ['error', {
        patterns: [
          { group: ['@server/*', '../../server/*', '../../../server/*'],
            message: 'src/client/ must not import from src/server/.' },
        ],
      }],
    },
  },
  // Import boundary: src/server/ cannot import from client
  {
    files: ['src/server/**/*.ts'],
    rules: {
      'no-restricted-imports': ['error', {
        patterns: [
          { group: ['@client/*', '../../client/*', '../../../client/*'],
            message: 'src/server/ must not import from src/client/.' },
        ],
      }],
      'no-restricted-properties': ['error', {
        object: 'Math',
        property: 'random',
        message: 'Math.random() banned in server code. Use crypto.getRandomValues().',
      }],
    },
  },
)
