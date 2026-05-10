import stylelint, { type Plugin, type Rule } from 'stylelint';
import type { Rule as PostcssRule } from 'postcss';

/**
 * Enforces one BEM “primary namespace” per stylesheet (from top-level rules’ first-class),
 * and forbids unrelated BEM blocks combined in one top-level selector (e.g. `.block__inner .other-block`).
 */
const ruleName = 'habsum/single-block-per-file';

const messages = stylelint.utils.ruleMessages(ruleName, {
  rejectedFile: (blocks: string[]) =>
    `Expected only one BEM block in this file (from top-level rules), found ${blocks.length}: ${blocks
      .map((b) => `"${b}"`)
      .join(', ')}`,
  rejectedMixedSelector: (parts: string[]) =>
    `Expected a single BEM primary block in this selector, found ${parts.length}: ${parts
      .map((p) => `"${p}"`)
      .join(', ')}`,
});

const meta = {
  url: 'https://github.com/mlisbit/habsum#stylelint-rules',
};

const CLASS_RE_GLOBAL = /\.([a-zA-Z_][\w-]*)/g;

function bemBlock(className: string): string {
  return className.split(/__|--/)[0]!;
}

/** Normalize atomic / vendor classes so they don’t collide with unrelated BEM bases. */
function primaryNamespace(className: string): string {
  if (
    className.startsWith('text-') ||
    className === 'text-bold' ||
    className === 'text-light' ||
    className === 'warn'
  ) {
    return '__text_atomic__';
  }
  return bemBlock(className);
}

function isAllowedCompanion(className: string): boolean {
  if (className === 'progress') return true;
  if (className.startsWith('cm-')) return true;
  if (bemBlock(className) === 'hover-layer') return true;
  return false;
}

const ruleFunction: Rule<boolean> = (primary) => (root, result) => {
  const validOptions = stylelint.utils.validateOptions(result, ruleName, {
    actual: primary,
    possible: [true, false],
  });
  if (!validOptions || primary === false) return;

  const ruleBlocks: Array<{ block: string; node: PostcssRule }> = [];
  const blocksInOrder: string[] = [];
  const seenBlocks = new Set<string>();

  root.walkRules((rule) => {
    if (!rule.parent || rule.parent.type !== 'root') return;

    let countedForFilePrimary = false;

    let mixedReported = false;

    for (const selector of rule.selectors) {
      const classes = [...selector.matchAll(CLASS_RE_GLOBAL)].map((m) => m[1]!).filter(Boolean);
      const firstMatch = [...selector.matchAll(CLASS_RE_GLOBAL)][0]?.[1];
      if (!firstMatch && classes.length <= 1) continue;

      if (classes.length > 1 && firstMatch) {
        const anchorNs = primaryNamespace(classes[0]!);
        const intruders = new Set<string>();

        for (let i = 1; i < classes.length; i++) {
          const cls = classes[i]!;
          if (isAllowedCompanion(cls)) continue;
          const ns = primaryNamespace(cls);
          if (ns === '__text_atomic__') continue;
          if (ns === anchorNs) continue;
          intruders.add(ns);
        }

        if (intruders.size > 0 && !mixedReported) {
          stylelint.utils.report({
            message: messages.rejectedMixedSelector([anchorNs, ...intruders]),
            node: rule,
            result,
            ruleName,
          });
          mixedReported = true;
        }
      }

      if (!countedForFilePrimary && firstMatch) {
        const block = bemBlock(firstMatch);
        ruleBlocks.push({ block, node: rule });
        if (!seenBlocks.has(block)) {
          seenBlocks.add(block);
          blocksInOrder.push(block);
        }
        countedForFilePrimary = true;
      }
    }
  });

  if (blocksInOrder.length <= 1) return;

  const primaryBlock = blocksInOrder[0]!;

  for (const { block, node } of ruleBlocks) {
    if (block === primaryBlock) continue;
    stylelint.utils.report({
      message: messages.rejectedFile(blocksInOrder),
      node,
      result,
      ruleName,
    });
  }
};

ruleFunction.ruleName = ruleName;
ruleFunction.messages = messages;
ruleFunction.meta = meta;

const plugin: Plugin = stylelint.createPlugin(ruleName, ruleFunction);

export default plugin;
