import type { Declaration, Root, Rule } from 'postcss';

/** Default path suffix used to detect the design tokens stylesheet. */
export const DEFAULT_TOKENS_SUBPATH = '_tokens.scss';

export type ThemeTokenSecondaryOptions = {
  /** Match stylesheets whose normalized path ends with this string (default `_tokens.scss`). */
  tokensSubpath?: string;
};

export function resolveTokensSubpath(
  secondary: ThemeTokenSecondaryOptions | undefined,
): string {
  const sub = secondary?.tokensSubpath;
  if (typeof sub === 'string' && sub.length > 0) return sub;
  return DEFAULT_TOKENS_SUBPATH;
}

export function isTokensStylesheet(from: string | undefined, tokensSubpath: string): boolean {
  if (!from || from.startsWith('<')) return false;
  const normalized = from.replace(/\\/g, '/');
  return normalized.endsWith(tokensSubpath);
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
