import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';
import clearstrataPalette from './eslint-rules/clearstrata-no-green-utilities.mjs';
import clearstrataRiskSurface from './eslint-rules/clearstrata-risk-surface.mjs';

export default tseslint.config(
  {
    ignores: [
      '**/node_modules/**',
      'dist/**',
      'supabase/**',
      'api/**',
    ],
  },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    /** 仅扫描项目源码，不扫描依赖与 tailwind 等包内文件 */
    files: ['src/**/*.{ts,tsx,js,jsx}'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
      'clearstrata-palette': clearstrataPalette,
      'clearstrata-risk-surface': clearstrataRiskSurface,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
      'clearstrata-palette/no-tailwind-green-family': 'error',
      'clearstrata-risk-surface/no-brand-in-risk-surface': 'error',
    },
  }
);
