import fs from 'node:fs';

import type { Root } from 'postcss';
import scssSyntax from 'postcss-scss';

import {
  collectAllKnownTokenNames,
  resolveConfiguredTokensFilePath,
} from './theme-token-blocks.mjs';

type TokenCache = { path: string; mtimeMs: number; names: Set<string> };

let cache: TokenCache | null = null;

export function loadKnownTokenNames(
  tokensFile: string,
  baseDir: string,
): Set<string> | null {
  const tokensPath = resolveConfiguredTokensFilePath(tokensFile, baseDir);
  if (!fs.existsSync(tokensPath)) return null;

  const mtimeMs = fs.statSync(tokensPath).mtimeMs;
  if (cache?.path === tokensPath && cache.mtimeMs === mtimeMs) {
    return cache.names;
  }

  const source = fs.readFileSync(tokensPath, 'utf8');
  const root = scssSyntax.parse(source) as Root;
  const names = collectAllKnownTokenNames(root);
  cache = { path: tokensPath, mtimeMs, names };
  return names;
}

/** First custom-property name in `var(--name, …)`; `null` when not a simple token reference. */
export function customPropFromVarFunction(nodes: import('postcss-value-parser').Node[]): string | null {
  let i = 0;
  while (i < nodes.length && (nodes[i]?.type === 'div' || nodes[i]?.type === 'space')) {
    i += 1;
  }
  const first = nodes[i];
  if (first?.type === 'word' && first.value.startsWith('--')) {
    return first.value;
  }
  return null;
}
