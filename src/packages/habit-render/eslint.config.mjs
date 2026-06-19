import tseslint from 'typescript-eslint';
import habsum from 'eslint-plugin-habsum';

/** Matches the webapp config so renderer components obey the same BEM/class rules. */
export default tseslint.config(
  {
    ignores: ['**/node_modules/**', '**/dist/**'],
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
      'habsum/no-computed-classname': 'error',
    },
  },
);
