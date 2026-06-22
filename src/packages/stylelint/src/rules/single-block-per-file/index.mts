import path from 'node:path';
import postcssSelectorParser from 'postcss-selector-parser';
import stylelint, { type Plugin, type Rule } from 'stylelint';

/**
 * Enforces one BEM “primary namespace” per stylesheet (from the filename), forbids
 * unrelated BEM blocks anywhere in the file (including nested rules), forbids
 * unrelated BEM blocks combined in one selector, and forbids universal/type selectors.
 */
const ruleName = 'habsum/single-block-per-file';

const messages = stylelint.utils.ruleMessages(ruleName, {
  rejectedForeignBlock: (foreign: string, expected: string) =>
    `Foreign BEM block "${foreign}" is not allowed in a "${expected}" stylesheet`,
  rejectedMixedSelector: (parts: string[]) =>
    `Expected a single BEM primary block in this selector, found ${parts.length}: ${parts
      .map((p) => `"${p}"`)
      .join(', ')}`,
  rejectedNonClassSelector: (expected: string) =>
    `Use only BEM class selectors from "${expected}"; universal and type selectors are not allowed`,
});

const meta = {
  url: 'https://github.com/mlisbit/habsum#stylelint-rules',
};

const CLASS_RE_GLOBAL = /\.([a-zA-Z_][\w-]*)/g;

function bemBlock(className: string): string {
  return className.split(/__|--/)[0]!;
}

function expectedBlockFromPath(file: string): string {
  const base = path.basename(file, path.extname(file));
  return base.replace(/^_/, '');
}

/** Normalize atomic / vendor / utility classes so they don’t count as foreign BEM blocks. */
function primaryNamespace(className: string): string {
  if (
    className.startsWith('text-') ||
    className === 'text-bold' ||
    className === 'text-light' ||
    className === 'warn'
  ) {
    return '__text_atomic__';
  }
  if (/^[mp][trblxy]?-\d+$/.test(className)) {
    return '__spacing_atomic__';
  }
  return bemBlock(className);
}

function isAllowedCompanion(className: string): boolean {
  if (className === 'progress') return true;
  if (className.startsWith('cm-')) return true;
  /** Core input innards styled from component blocks (e.g. count-control). */
  if (bemBlock(className) === 'input') return true;
  return false;
}

function selectorUsesUniversalOrType(selector: string): boolean {
  let found = false;
  const parsed = postcssSelectorParser().astSync(selector);
  parsed.walk((node) => {
    if (node.type === 'universal' || node.type === 'tag') {
      found = true;
    }
  });
  return found;
}

const ruleFunction: Rule<boolean> = (primary) => (root, result) => {
  const validOptions = stylelint.utils.validateOptions(result, ruleName, {
    actual: primary,
    possible: [true, false],
  });
  if (!validOptions || primary === false) return;

  const sourceFile = root.source?.input.file;
  const expectedBlock = sourceFile ? expectedBlockFromPath(sourceFile) : null;
  if (!expectedBlock) return;

  const reportedForeign = new Set<string>();
  const reportedMixed = new Set<string>();
  const reportedNonClass = new Set<string>();

  root.walkRules((rule) => {
    if (rule.parent?.type === 'atrule' && rule.parent.name === 'keyframes') return;

    for (const selector of rule.selectors) {
      if (selector.includes('#{')) continue;

      if (selectorUsesUniversalOrType(selector) && !reportedNonClass.has(selector)) {
        reportedNonClass.add(selector);
        stylelint.utils.report({
          message: messages.rejectedNonClassSelector(expectedBlock),
          node: rule,
          result,
          ruleName,
        });
      }

      const classes = [...selector.matchAll(CLASS_RE_GLOBAL)].map((m) => m[1]!).filter(Boolean);
      if (classes.length === 0) continue;

      if (classes.length > 1) {
        const anchorNs = primaryNamespace(classes[0]!);
        const intruders = new Set<string>();

        for (let i = 1; i < classes.length; i++) {
          const cls = classes[i]!;
          if (isAllowedCompanion(cls)) continue;
          const ns = primaryNamespace(cls);
          if (ns === '__text_atomic__') continue;
          if (ns === '__spacing_atomic__') continue;
          if (ns === anchorNs) continue;
          intruders.add(ns);
        }

        if (intruders.size > 0 && !reportedMixed.has(selector)) {
          reportedMixed.add(selector);
          stylelint.utils.report({
            message: messages.rejectedMixedSelector([anchorNs, ...intruders]),
            node: rule,
            result,
            ruleName,
          });
        }
      }

      for (const cls of classes) {
        if (isAllowedCompanion(cls)) continue;
        const ns = primaryNamespace(cls);
        if (ns === '__text_atomic__') continue;
        if (ns === '__spacing_atomic__') continue;
        if (ns === expectedBlock) continue;
        if (reportedForeign.has(ns)) continue;

        reportedForeign.add(ns);
        stylelint.utils.report({
          message: messages.rejectedForeignBlock(ns, expectedBlock),
          node: rule,
          result,
          ruleName,
        });
      }
    }
  });
};

ruleFunction.ruleName = ruleName;
ruleFunction.messages = messages;
ruleFunction.meta = meta;

const plugin: Plugin = stylelint.createPlugin(ruleName, ruleFunction);

export default plugin;
