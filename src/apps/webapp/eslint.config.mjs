import tseslint from 'typescript-eslint';
import habsum from 'eslint-plugin-habsum';

/** Webapp-only config (includes `habsum/exclusive-bem-block`). */
export default tseslint.config(
  {
    ignores: ['**/node_modules/**', '**/dist/**', 'build/**', '.cache/**', 'public/**'],
  },
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: 'module',
        ecmaFeatures: { jsx: true },
      },
    },
    plugins: { habsum },
    rules: {
      'habsum/exclusive-bem-block': 'error',
    },
  },
);
