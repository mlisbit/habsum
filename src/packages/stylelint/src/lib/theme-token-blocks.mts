import path from 'node:path';

import type { Declaration, Root, Rule } from 'postcss';

export type TokensFileSecondaryOptions = {
  /** Absolute or cwd-relative path to the design tokens stylesheet. */
  tokensFile?: string;
};

export function resolveConfiguredTokensFilePath(
  tokensFile: string,
  baseDir: string,
): string {
  return path.isAbsolute(tokensFile) ? tokensFile : path.join(baseDir, tokensFile);
}

export function isTokensStylesheet(
  from: string | undefined,
  tokensFile: string,
  baseDir: string,
): boolean {
  if (!from || from.startsWith('<')) return false;
  const resolvedTokens = path.resolve(resolveConfiguredTokensFilePath(tokensFile, baseDir));
  const resolvedFrom = path.resolve(from);
  return resolvedFrom === resolvedTokens;
}

/** Top-level `html[data-theme='dark'|'light']` selectors only (quotes flexible). */
export function isExactThemeSelector(selector: string, theme: 'dark' | 'light'): boolean {
  const s = selector.trim().replace(/\s+/g, ' ');
  if (theme === 'dark') {
    return /^html\[data-theme=['"]dark['"]\]$/i.test(s);
  }
  return /^html\[data-theme=['"]light['"]\]$/i.test(s);
}

export function findTopLevelThemeRule(root: Root, theme: 'dark' | 'light'): Rule | undefined {
  let found: Rule | undefined;
  root.walkRules((rule) => {
    if (rule.parent?.type !== 'root') return;
    if (!isExactThemeSelector(rule.selector, theme)) return;
    found = rule;
  });
  return found;
}

/**
 * Range covering only the rule's selector (not the whole `{ ... }` block).
 * Passing this as `start`/`end` to `stylelint.utils.report` avoids editors squiggling
 * arbitrary lines inside the block when the report `node` is the `Rule`.
 */
export function themeRuleSelectorRange(rule: Rule): {
  start: { line: number; column: number };
  end: { line: number; column: number };
} {
  const { start, end } = rule.rangeBy({ word: rule.selector });
  return { start, end };
}

/** Direct children only — ignores nested rules inside the theme block. */
export function collectCustomPropDecls(rule: Rule): Declaration[] {
  const decls: Declaration[] = [];
  for (const node of rule.nodes ?? []) {
    if (node.type === 'decl' && node.prop.startsWith('--')) {
      decls.push(node);
    }
  }
  return decls;
}

/** Top-level `:root { … }` only. */
export function findTopLevelRootRule(root: Root): Rule | undefined {
  let found: Rule | undefined;
  root.walkRules((rule) => {
    if (rule.parent?.type !== 'root') return;
    if (rule.selector.trim() !== ':root') return;
    found = rule;
  });
  return found;
}

/** Union of custom properties declared in dark, light, and `:root` theme blocks. */
export function collectAllKnownTokenNames(tokensRoot: Root): Set<string> {
  const names = new Set<string>();
  for (const rule of [
    findTopLevelThemeRule(tokensRoot, 'dark'),
    findTopLevelThemeRule(tokensRoot, 'light'),
    findTopLevelRootRule(tokensRoot),
  ]) {
    if (!rule) continue;
    for (const decl of collectCustomPropDecls(rule)) {
      names.add(decl.prop);
    }
  }
  return names;
}

export function countMap(names: string[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const n of names) {
    m.set(n, (m.get(n) ?? 0) + 1);
  }
  return m;
}

export function countMapsEqual(a: Map<string, number>, b: Map<string, number>): boolean {
  if (a.size !== b.size) return false;
  for (const [k, v] of a) {
    if (b.get(k) !== v) return false;
  }
  return true;
}
