import fs from 'node:fs';
import type { Root } from 'postcss';
import stylelint from 'stylelint';

import {
  resolveConfiguredTokensFilePath,
  type TokensFileSecondaryOptions,
} from './theme-token-blocks.mjs';
import { resolveTokensPathBaseDir } from './stylelint-config-dir.mjs';

export type { TokensFileSecondaryOptions };

const missingFileReported = new Set<string>();

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === 'string' && value.trim().length > 0;

export function validateTokensFileConfig(
  result: stylelint.PostcssResult,
  ruleName: string,
  secondary: TokensFileSecondaryOptions | undefined,
): secondary is TokensFileSecondaryOptions & { tokensFile: string } {
  return stylelint.utils.validateOptions(result, ruleName, {
    actual: secondary?.tokensFile,
    possible: isNonEmptyString,
  });
}

export function tokensFileExists(tokensFile: string, baseDir: string): boolean {
  return fs.existsSync(resolveConfiguredTokensFilePath(tokensFile, baseDir));
}

export function reportTokensFileNotFound(
  result: stylelint.PostcssResult,
  ruleName: string,
  root: Root,
  tokensFile: string,
  baseDir: string,
): void {
  const resolved = resolveConfiguredTokensFilePath(tokensFile, baseDir);
  const key = `${ruleName}:${resolved}`;
  if (missingFileReported.has(key)) return;
  missingFileReported.add(key);

  stylelint.utils.report({
    message: `Tokens file not found at "${tokensFile}" (resolved to "${resolved}").`,
    node: root,
    result,
    ruleName,
  });
}

export function tokensPathBaseDir(root: Root): string {
  const lintedFile = root.source?.input?.from ?? root.source?.input?.file;
  return resolveTokensPathBaseDir(lintedFile);
}

/** Validates `tokensFile` and ensures the path exists; reports and returns `null` on failure. */
export function requireTokensFile(
  result: stylelint.PostcssResult,
  ruleName: string,
  root: Root,
  secondary: TokensFileSecondaryOptions | undefined,
): { tokensFile: string; baseDir: string } | null {
  if (!validateTokensFileConfig(result, ruleName, secondary)) return null;

  const { tokensFile } = secondary;
  const baseDir = tokensPathBaseDir(root);
  if (!tokensFileExists(tokensFile, baseDir)) {
    reportTokensFileNotFound(result, ruleName, root, tokensFile, baseDir);
    return null;
  }

  return { tokensFile, baseDir };
}
