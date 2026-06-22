import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import stylelint from 'stylelint';
import plugin from './index.mjs';

const ruleName = 'habsum/single-block-per-file';

const fixtureFile = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '_example-block.scss',
);

async function lintScss(code: string, codeFilename = fixtureFile) {
  return stylelint.lint({
    code,
    codeFilename,
    config: {
      plugins: [plugin],
      rules: {
        [ruleName]: true,
      },
    },
  });
}

describe('habsum/single-block-per-file', () => {
  it('allows a single BEM block namespace', async () => {
    const result = await lintScss(`
      .example-block {
        display: flex;
      }

      .example-block__item {
        gap: 1rem;
      }
    `);

    expect(result.results[0]?.warnings).toHaveLength(0);
  });

  it('rejects foreign BEM blocks', async () => {
    const result = await lintScss(`
      .example-block__preview {
        .card {
          margin: 0;
        }
      }
    `);

    expect(result.results[0]?.warnings).toHaveLength(1);
    expect(result.results[0]?.warnings[0]).toMatchObject({
      rule: ruleName,
      text: expect.stringContaining(
        'Foreign BEM block "card" is not allowed in a "example-block" stylesheet',
      ),
    });
  });

  it('rejects compound selectors that combine the file block with hover-layer', async () => {
    const result = await lintScss(`
      .example-block__tooltip.hover-layer__panel {
        margin: 0;
      }
    `);

    expect(result.results[0]?.warnings).toHaveLength(2);
    expect(result.results[0]?.warnings[0]).toMatchObject({
      rule: ruleName,
      text: expect.stringContaining(
        'Expected a single BEM primary block in this selector, found 2: "example-block", "hover-layer"',
      ),
    });
    expect(result.results[0]?.warnings[1]).toMatchObject({
      rule: ruleName,
      text: expect.stringContaining(
        'Foreign BEM block "hover-layer" is not allowed in a "example-block" stylesheet',
      ),
    });
  });

  it('rejects universal selectors such as > *', async () => {
    const result = await lintScss(`
      .example-block__preview-sample {
        > * {
          margin: 0;
        }
      }
    `);

    expect(result.results[0]?.warnings).toHaveLength(1);
    expect(result.results[0]?.warnings[0]).toMatchObject({
      rule: ruleName,
      text: expect.stringContaining(
        'Use only BEM class selectors from "example-block"; universal and type selectors are not allowed',
      ),
    });
  });

  it('rejects type selectors such as p', async () => {
    const result = await lintScss(`
      .example-block__option {
        p {
          margin: 0;
        }
      }
    `);

    expect(result.results[0]?.warnings).toHaveLength(1);
    expect(result.results[0]?.warnings[0]).toMatchObject({
      rule: ruleName,
      text: expect.stringContaining(
        'Use only BEM class selectors from "example-block"; universal and type selectors are not allowed',
      ),
    });
  });

  it('allows keyframe selectors', async () => {
    const result = await lintScss(`
      @keyframes example-block-spin {
        to {
          transform: rotate(1turn);
        }
      }
    `);

    expect(result.results[0]?.warnings).toHaveLength(0);
  });
});
