import type { ESLint } from 'eslint';
import exclusiveBemBlock from './exclusive-bem-block.mjs';

const plugin: ESLint.Plugin = {
  meta: {
    name: 'eslint-plugin-habsum',
    version: '0.1.0',
  },
  rules: {
    'exclusive-bem-block': exclusiveBemBlock,
  },
};

export default plugin;
