import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import stylelint from 'stylelint';
import plugin from './atomic-class-enforcer.mjs';

const ruleName = 'habsum/atomic-class-enforcer';

const fixtureDir = path.dirname(fileURLToPath(import.meta.url));

async function lintScss(code: string, filename: string) {
  return stylelint.lint({
    code,
    codeFilename: path.join(fixtureDir, filename),
    config: {
      plugins: [plugin],
      rules: {
        [ruleName]: true,
      },
    },
  });
}

describe('habsum/atomic-class-enforcer', () => {
  it('rejects typography and color properties in component stylesheets', async () => {
    const result = await lintScss(
      `
      .card {
        font-size: 1rem;
        line-height: 1.5;
        font-weight: 600;
        color: var(--text-color);
      }
    `,
      '_card.scss',
    );

    expect(result.results[0]?.warnings).toHaveLength(4);
    expect(result.results[0]?.warnings.map((w) => w.text)).toEqual(
      expect.arrayContaining([
        expect.stringContaining('font-size'),
        expect.stringContaining('line-height'),
        expect.stringContaining('font-weight'),
        expect.stringContaining('color'),
      ]),
    );
  });

  it('ignores reset stylesheets', async () => {
    const result = await lintScss(
      `
      body {
        font-size: 100%;
        line-height: 1;
      }
    `,
      '_reset.scss',
    );

    expect(result.results[0]?.warnings).toHaveLength(0);
  });

  it('ignores typography definition stylesheets', async () => {
    const result = await lintScss(
      `
      .text-h-m {
        font-size: 1.125rem;
        line-height: 1.3;
        font-weight: 600;
        color: var(--text-color);
      }
    `,
      'foundation/_text.scss',
    );

    expect(result.results[0]?.warnings).toHaveLength(0);
  });

  it('ignores theme stylesheets', async () => {
    const result = await lintScss(
      `
      a {
        color: var(--text-link);
      }
    `,
      '_theme.scss',
    );

    expect(result.results[0]?.warnings).toHaveLength(0);
  });

  it('allows color but rejects typography in button stylesheets', async () => {
    const result = await lintScss(
      `
      .button {
        color: var(--cta-base-text-color);
        font-size: var(--font-size-s);
      }
    `,
      'core-components/_button.scss',
    );

    expect(result.results[0]?.warnings).toHaveLength(1);
    expect(result.results[0]?.warnings[0]).toMatchObject({
      rule: ruleName,
      text: expect.stringContaining('font-size'),
    });
  });

  it('does not flag non-text color properties', async () => {
    const result = await lintScss(
      `
      .input {
        border-color: var(--border-color-faint);
        background-color: var(--background-secondary);
      }
    `,
      '_input.scss',
    );

    expect(result.results[0]?.warnings).toHaveLength(0);
  });

  it('rejects rule blocks fully covered by layout atomic classes', async () => {
    const result = await lintScss(
      `
      .card--test {
        align-items: center;
      }
    `,
      'foundation/_card.scss',
    );

    expect(result.results[0]?.warnings).toHaveLength(1);
    expect(result.results[0]?.warnings[0]).toMatchObject({
      rule: ruleName,
      text: expect.stringContaining('.align-items-center'),
    });
  });

  it('does not reject layout atomic declarations inside larger rule blocks', async () => {
    const result = await lintScss(
      `
      .card {
        background: var(--background-secondary);
        padding: functions.spacing(2, 3);
      }
    `,
      'foundation/_card.scss',
    );

    expect(result.results[0]?.warnings).toHaveLength(0);
  });

  it('ignores layout atomic definitions', async () => {
    const result = await lintScss(
      `
      .align-items-center {
        align-items: center;
      }
    `,
      'foundation/_atomic.scss',
    );

    expect(result.results[0]?.warnings).toHaveLength(0);
  });
});
