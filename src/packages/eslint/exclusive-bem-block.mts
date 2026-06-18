/**
 * Enforces `// exclusive-bem-block: name`:
 * - valid / unused / duplicate declarations;
 * - no use of another file’s exclusive block in this package (sync scan of webapp).
 */

import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import type { Rule } from 'eslint';

const BLOCK_NAME_RE = /^[a-z][a-z0-9-]*$/;

/** Line or block comment body (no slashes). */
const DIRECTIVE_RE = /^\s*exclusive-bem-block:\s*([a-z][a-z0-9-]*)\s*$/i;

/** Cached scan (one ESLint process, webapp root resolved from first linted file). */
let cachedWebappRoot: string | null = null;
let cachedDeclarations: Map<string, string[]> | null = null;

function findWebappRoot(startFile: string): string {
  let dir = path.dirname(path.resolve(startFile));
  const fsRoot = path.parse(dir).root;
  while (dir !== fsRoot) {
    if (existsSync(path.join(dir, 'eslint.config.mjs'))) {
      return dir;
    }
    dir = path.dirname(dir);
  }
  return path.dirname(path.resolve(startFile));
}

function walkFiles(dir: string, exts: Set<string>, out: string[] = []): string[] {
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const ent of entries) {
    if (ent.name.startsWith('.')) continue;
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      if (
        ent.name === 'node_modules' ||
        ent.name === 'dist' ||
        ent.name === 'build'
      )
        continue;
      walkFiles(p, exts, out);
    } else if (ent.isFile()) {
      const x = path.extname(ent.name);
      if (exts.has(x)) out.push(p);
    }
  }
  return out;
}

function extractDirectiveFromSource(src: string): string | null {
  for (const line of src.split('\n').slice(0, 80)) {
    const m = line.match(
      /^\s*\/\/\s*exclusive-bem-block:\s*([a-z][a-z0-9-]*)\s*$/i,
    );
    if (m?.[1] && BLOCK_NAME_RE.test(m[1])) return m[1].toLowerCase();
  }
  const blockMatch = src.match(
    /\/\*\s*exclusive-bem-block:\s*([a-z][a-z0-9-]*)\s*\*\//i,
  );
  if (blockMatch?.[1] && BLOCK_NAME_RE.test(blockMatch[1])) {
    return blockMatch[1].toLowerCase();
  }
  return null;
}

function getDeclarationsByBlock(fromFile: string): Map<string, string[]> {
  const root = findWebappRoot(fromFile);
  if (cachedDeclarations && cachedWebappRoot === root) {
    return cachedDeclarations;
  }
  const byBlock = new Map<string, string[]>();
  const ext = new Set(['.tsx', '.jsx']);
  for (const abs of walkFiles(root, ext)) {
    const block = extractDirectiveFromSource(readFileSync(abs, 'utf8'));
    if (!block) continue;
    const list = byBlock.get(block) ?? [];
    list.push(abs);
    byBlock.set(block, list);
  }
  cachedWebappRoot = root;
  cachedDeclarations = byBlock;
  return byBlock;
}

function stripTsComments(source: string): string {
  let s = source.replace(/\/\*[\s\S]*?\*\//g, ' ');
  s = s.replace(/\/\/[^\n]*/g, ' ');
  return s;
}

/** Test/DOM queries — not markup; must not count as using an exclusive BEM block. */
function stripDomQuerySelectors(source: string): string {
  return source.replace(/\.querySelector(?:All)?\s*\(\s*['"][^'"]*['"]/g, '.querySelector(');
}

function stripForBlockUsageScan(source: string): string {
  return stripDomQuerySelectors(stripTsComments(source));
}

function blockUsagePatterns(block: string): string[] {
  const esc = block.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const quoteClass = '["\'`]';
  const notQuoteClass = '[^"\'`]';
  const notBraceOrQuoteClass = '[^}"\'`]';
  return [
    `(?<![\\w-])${esc}(__|--)`,
    `(?<![\\w$-])\\.${esc}(?![\\w-])`,
    `(?:className|class)\\s*=\\s*${quoteClass}${notQuoteClass}*(?<![\\w-])${esc}(?![\\w-])${notQuoteClass}*${quoteClass}`,
    `(?:className|class)\\s*=\\s*\\{(?:${notBraceOrQuoteClass}*${quoteClass}${notQuoteClass}*${quoteClass})*${notBraceOrQuoteClass}*${quoteClass}${notQuoteClass}*(?<![\\w-])${esc}(?![\\w-])${notQuoteClass}*${quoteClass}`,
  ];
}

function blockUsedInCode(sourceWithoutComments: string, block: string): boolean {
  return blockUsagePatterns(block).some((p) => new RegExp(p).test(sourceWithoutComments));
}

function firstIndexOfBlockUsage(text: string, block: string): number {
  let best = -1;
  for (const p of blockUsagePatterns(block)) {
    const m = new RegExp(p).exec(text);
    if (m?.index !== undefined && m.index >= 0) {
      best = best === -1 ? m.index : Math.min(best, m.index);
    }
  }
  return best;
}

type Directive = {
  name: string;
  rawName: string;
  loc: import('estree').SourceLocation | null | undefined;
};

function parseDirectives(context: Rule.RuleContext): { text: string; directives: Directive[] } {
  const sourceCode = context.sourceCode ?? context.getSourceCode();
  const text = sourceCode.getText();
  const found: Directive[] = [];
  for (const c of sourceCode.getAllComments()) {
    const body =
      c.type === 'Line'
        ? c.value.replace(/^\s+/, '')
        : c.value.replace(/^\s+|\s+$/g, '');
    const m = body.match(DIRECTIVE_RE);
    if (m?.[1]) {
      const rawName = m[1];
      found.push({
        name: rawName.toLowerCase(),
        rawName,
        loc: c.loc,
      });
    }
  }
  return { text, directives: found };
}

const rule: Rule.RuleModule = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Validate exclusive-bem-block comments and forbid using another file’s exclusive block',
    },
    schema: [],
    messages: {
      invalidName:
        'exclusive-bem-block "{{name}}" is not a valid BEM block (use kebab-case starting with a letter).',
      multiple:
        'Only one exclusive-bem-block directive per file (found: {{names}}).',
      unused:
        'exclusive-bem-block "{{name}}" is not used in this file (expect "{{name}}", "{{name}}__*", "{{name}}--*", or ".{{name}}" in code).',
      duplicate:
        'exclusive-bem-block "{{name}}" is also declared in: {{others}}.',
      foreign:
        'Uses exclusive BEM block "{{name}}" which belongs to {{other}} (add it only in that file’s markup).',
    },
  },

  create(context) {
    const filename = path.normalize(
      context.filename ?? context.getFilename?.() ?? '',
    );
    const sourceCode = context.sourceCode ?? context.getSourceCode();

    return {
      Program() {
        const { text, directives } = parseDirectives(context);
        const stripped = stripForBlockUsageScan(text);
        const byBlock = getDeclarationsByBlock(filename);

        // --- Another component’s exclusive block used here ---
        for (const [block, files] of byBlock) {
          if (files.length !== 1) continue;
          const owner = path.normalize(files[0]!);
          if (owner === filename) continue;
          if (!blockUsedInCode(stripped, block)) continue;
          const idx = firstIndexOfBlockUsage(text, block);
          const loc =
            idx >= 0
              ? sourceCode.getLocFromIndex(idx)
              : { start: { line: 1, column: 0 }, end: { line: 1, column: 0 } };
          const root = findWebappRoot(filename);
          context.report({
            loc,
            messageId: 'foreign',
            data: {
              name: block,
              other: path.relative(root, owner),
            },
          });
        }

        // --- Duplicate declarations of the same block across files ---
        for (const [block, files] of byBlock) {
          if (files.length <= 1) continue;
          if (!files.some((f) => path.normalize(f) === filename)) continue;
          const mine = directives.find((d) => d.name === block);
          if (!mine?.loc) continue;
          const others = files
            .filter((f) => path.normalize(f) !== filename)
            .map((f) => path.relative(findWebappRoot(filename), f))
            .join(', ');
          context.report({
            loc: mine.loc,
            messageId: 'duplicate',
            data: { name: block, others },
          });
        }

        if (directives.length === 0) return;

        if (directives.length > 1) {
          const names = [...new Set(directives.map((d) => d.rawName))].join(', ');
          const dupDirective = directives[1];
          const loc =
            dupDirective?.loc ?? {
              start: { line: 1, column: 0 },
              end: { line: 1, column: 0 },
            };
          context.report({
            loc,
            messageId: 'multiple',
            data: { names },
          });
          return;
        }

        const first = directives[0];
        if (!first) return;

        const { name: ownBlock, rawName, loc } = first;
        const reportLoc =
          loc ?? { start: { line: 1, column: 0 }, end: { line: 1, column: 0 } };

        if (!BLOCK_NAME_RE.test(rawName)) {
          context.report({
            loc: reportLoc,
            messageId: 'invalidName',
            data: { name: rawName },
          });
          return;
        }

        if (!blockUsedInCode(stripped, ownBlock)) {
          context.report({
            loc: reportLoc,
            messageId: 'unused',
            data: { name: rawName },
          });
        }
      },
    };
  },
};

export default rule;
