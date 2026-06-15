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
const habitRendererFile = path.join(webappRoot, 'app/components/habit-renderer/HabitRenderer.tsx');

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
        {
          filename: habitRendererFile,
          code: `// exclusive-bem-block: habit\nexport function HabitRenderer() { return <div className="card habit" />; }`,
        },
        {
          filename: path.join(
            webappRoot,
            'app/components/habit-renderer/_private/heading-renderer-helpers/HabitHeadingRender.tsx',
          ),
          code: `// exclusive-bem-block: habit-heading\nexport function HabitHeadingRender() { return <div className="habit-heading"><div className="habit-heading__left" /></div>; }`,
        },
        {
          filename: path.join(
            webappRoot,
            'app/components/habit-renderer/_private/HabitHeaderAndActionRenderer.tsx',
          ),
          code: `function Header() { return <TogglePill className={dim ? 'habit-select__option habit-select__option--dim' : 'habit-select__option'} onToggle={() => onUpdate({ habit: habit.name, value: opt })} />; }`,
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
