import tseslint from 'typescript-eslint';
import habsum from 'eslint-plugin-habsum';

export default tseslint.config(
  { ignores: ['**/node_modules/**', 'dist/**'] },
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: { parser: tseslint.parser },
    plugins: { habsum },
    rules: {
      'habsum/exclusive-bem-block': 'error',
      'habsum/no-computed-classname': 'error',
    },
  },
);
