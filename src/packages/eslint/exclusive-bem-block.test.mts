import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { RuleTester } from 'eslint';
import { describe, it } from 'vitest';
import exclusiveBemBlock from './exclusive-bem-block.mjs';

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
    parserOptions: { ecmaFeatures: { jsx: true } },
  },
});

const webappRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../apps/webapp',
);
const barGraphTestFile = path.join(webappRoot, 'app/components/__tests__/BarGraph.test.tsx');

describe('exclusive-bem-block', () => {
  it('passes eslint RuleTester cases', () => {
    ruleTester.run('exclusive-bem-block', exclusiveBemBlock, {
      valid: [
        {
          filename: barGraphTestFile,
          code: `const fill = container.querySelector('.bar-graph__fill');`,
        },
        {
          filename: barGraphTestFile,
          code: `const fills = container.querySelectorAll('.bar-graph__fill');`,
        },
      ],
      invalid: [
        {
          filename: barGraphTestFile,
          code: `<div className="bar-graph__fill" />`,
          errors: [{ messageId: 'foreign' }],
        },
      ],
    });
  });
});
