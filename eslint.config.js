import { defineConfig } from 'eslint/config'
import * as config from '@lvce-editor/eslint-config'

export default defineConfig([
  { ignores: ['**/playwright-report/**', '**/test-results/**'] },
  ...config.default,
  ...config.recommendedActions,
  {
    rules: {
      '@typescript-eslint/ban-ts-comment': 'off',
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/no-dynamic-delete': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
      '@typescript-eslint/prefer-readonly-parameter-types': 'off',
      '@typescript-eslint/restrict-plus-operands': 'off',
      '@typescript-eslint/restrict-template-expressions': 'off',
      'jest/no-conditional-expect': 'off',
      'no-case-declarations': 'off',
      'no-console': 'off',
      'unicorn/consistent-function-scoping': 'off',
      'unicorn/no-process-exit': 'off',
      '@cspell/spellchecker': 'off',
      'e2e/prefer-filesystem-set-files': 'off',
      'sonarjs/no-empty-collection': 'off',
      'unicorn/no-top-level-assignment-in-function': 'off',
      'unicorn/no-unnecessary-splice': 'off',
      'unicorn/no-unreadable-object-destructuring': 'off',
    },
  },
  {
    files: ['packages/e2e/**/*.ts'],
    rules: {
      'e2e/no-imports': 'off',
    },
  },
  {
    files: [
      'packages/playground/image/workspace/.devcontainer/devcontainer.json',
    ],
    rules: {
      // This downloadable browser fixture intentionally uses a minimal shell image.
      'devcontainer/require-desktop-lite-feature': 'off',
      'devcontainer/allowed-image': 'off',
    },
  },
])
