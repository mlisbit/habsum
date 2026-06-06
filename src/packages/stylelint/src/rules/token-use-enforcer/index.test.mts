import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import stylelint from 'stylelint';
import plugin from './index.mjs';

const ruleName = 'habsum/token-use-enforcer';

const fixtureDir = path.dirname(fileURLToPath(import.meta.url));
const tokensFile = path.resolve(fixtureDir, '../../../../ui/src/styles/_tokens.scss');

async function lintScss(
  code: string,
  options: { tokensFile?: string } = { tokensFile },
) {
  return stylelint.lint({
    code,
    codeFilename: path.join(fixtureDir, '_test.scss'),
    config: {
      plugins: [plugin],
      rules: {
        [ruleName]: [true, options],
      },
    },
  });
}

describe('habsum/token-use-enforcer', () => {
  it('rejects hex colors', async () => {
    const result = await lintScss('.a { color: #fff; }');
    expect(result.results[0]?.warnings).toHaveLength(1);
    expect(result.results[0]?.warnings[0]?.text).toContain('#fff');
  });

  it('rejects color functions', async () => {
    const result = await lintScss('.a { color: rgb(0, 0, 0); }');
    expect(result.results[0]?.warnings).toHaveLength(1);
    expect(result.results[0]?.warnings[0]?.text).toContain('rgb()');
  });

  it('allows tokens defined in _tokens.scss', async () => {
    const result = await lintScss('.a { color: var(--text-color); }');
    expect(result.results[0]?.warnings).toHaveLength(0);
  });

  it('allows :root tokens defined in _tokens.scss', async () => {
    const result = await lintScss('.a { border-radius: var(--border-radius-m); }');
    expect(result.results[0]?.warnings).toHaveLength(0);
  });

  it('rejects unknown tokens', async () => {
    const result = await lintScss('.a { color: var(--not-a-real-token); }');
    expect(result.results[0]?.warnings).toHaveLength(1);
    expect(result.results[0]?.warnings[0]?.text).toContain('--not-a-real-token');
  });

  it('rejects inline color-mix even with design tokens', async () => {
    const result = await lintScss(
      '.a { background: color-mix(in srgb, var(--text-color) 6%, transparent); }',
    );
    expect(result.results[0]?.warnings).toHaveLength(1);
    expect(result.results[0]?.warnings[0]?.text).toContain('color-mix()');
  });

  it('rejects hex colors inside color-mix', async () => {
    const result = await lintScss(
      '.a { background: color-mix(in srgb, #fff 50%, transparent); }',
    );
    expect(result.results[0]?.warnings).toHaveLength(1);
    expect(result.results[0]?.warnings[0]?.text).toContain('color-mix()');
  });

  it('errors when tokensFile is not configured', async () => {
    const result = await lintScss('.a { color: #fff; }', {});
    expect(result.results[0]?.invalidOptionWarnings).toHaveLength(1);
    expect(result.results[0]?.invalidOptionWarnings[0]?.text).toContain(
      'habsum/token-use-enforcer',
    );
  });

  it('allows box-shadow via token', async () => {
    const result = await lintScss('.a { box-shadow: var(--elevation-shadow); }');
    expect(result.results[0]?.warnings).toHaveLength(0);
  });

  it('allows box-shadow: none', async () => {
    const result = await lintScss('.a { box-shadow: none; }');
    expect(result.results[0]?.warnings).toHaveLength(0);
  });

  it('rejects manual box-shadow offsets', async () => {
    const result = await lintScss('.a { box-shadow: 0 0 0 3px var(--accent-selected); }');
    expect(result.results[0]?.warnings).toHaveLength(1);
    expect(result.results[0]?.warnings[0]?.text).toContain('manual box-shadow');
  });

  it('resolves tokensFile relative to the stylelint config, not process cwd', async () => {
    const repoRoot = path.resolve(fixtureDir, '../../../../../..');
    const buttonFile = path.join(
      repoRoot,
      'src/packages/ui/src/styles/core-components/_button.scss',
    );

    const result = await stylelint.lint({
      files: buttonFile,
      cwd: path.join(repoRoot, 'src/packages/ui'),
      configFile: path.join(repoRoot, '.stylelintrc.json'),
      config: {
        rules: {
          [ruleName]: [true, { tokensFile: 'src/packages/ui/src/styles/_tokens.scss' }],
        },
      },
    });

    const texts = result.results[0]?.warnings.map((w) => w.text) ?? [];
    expect(texts.some((t) => t.includes('Tokens file not found'))).toBe(false);
  });

  it('errors when the configured tokens file does not exist', async () => {
    const result = await lintScss('.a { color: #fff; }', {
      tokensFile: path.join(fixtureDir, '_missing-tokens.scss'),
    });
    expect(result.results[0]?.warnings).toHaveLength(1);
    expect(result.results[0]?.warnings[0]?.text).toContain('Tokens file not found');
  });
});
