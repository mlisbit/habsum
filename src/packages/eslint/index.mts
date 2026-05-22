import type { ESLint } from 'eslint';
import exclusiveBemBlock from './exclusive-bem-block.mjs';
import noComputedClassname from './no-computed-classname.mjs';

const plugin: ESLint.Plugin = {
  meta: {
    name: 'eslint-plugin-habsum',
    version: '0.1.0',
  },
  rules: {
    'exclusive-bem-block': exclusiveBemBlock,
    'no-computed-classname': noComputedClassname,
  },
};

export default plugin;
