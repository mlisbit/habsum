import stylelint, { type Plugin, type Rule } from 'stylelint';
import type { Rule as PostcssRule } from 'postcss';

const ruleName = 'habsum/no-multiple-bem-blocks';

const messages = stylelint.utils.ruleMessages(ruleName, {
  multiple: (blocks: string[]) =>
    `Expected a single BEM block per file, found ${blocks.length}: ${blocks
      .map((b) => `"${b}"`)
      .join(', ')}`,
});

const meta = {
  url: 'https://github.com/mlisbit/habsum#stylelint-rules',
};

const CLASS_RE = /\.([a-zA-Z_][\w-]*)/;

function blockOf(className: string): string {
  return className.split(/__|--/)[0]!;
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

    for (const selector of rule.selectors) {
      const match = selector.match(CLASS_RE);
      if (!match) continue;
      const block = blockOf(match[1]!);
      ruleBlocks.push({ block, node: rule });
      if (!seenBlocks.has(block)) {
        seenBlocks.add(block);
        blocksInOrder.push(block);
      }
      break;
    }
  });

  if (blocksInOrder.length <= 1) return;

  const primaryBlock = blocksInOrder[0]!;

  for (const { block, node } of ruleBlocks) {
    if (block === primaryBlock) continue;
    stylelint.utils.report({
      message: messages.multiple(blocksInOrder),
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
