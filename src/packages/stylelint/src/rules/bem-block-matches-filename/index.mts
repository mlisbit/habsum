import path from 'node:path';
import stylelint, { type Plugin, type Rule } from 'stylelint';

const ruleName = 'habsum/bem-block-matches-filename';

const messages = stylelint.utils.ruleMessages(ruleName, {
  mismatch: (block: string, expected: string) =>
    `Expected BEM block ".${expected}" to match the filename, found ".${block}"`,
});

const meta = {
  url: 'https://github.com/mlisbit/habsum#stylelint-rules',
};

const CLASS_RE = /\.([a-zA-Z_][\w-]*)/;

function blockOf(className: string): string {
  return className.split(/__|--/)[0]!;
}

function expectedBlockFromPath(file: string): string {
  const base = path.basename(file, path.extname(file));
  return base.replace(/^_/, '');
}

const ruleFunction: Rule<boolean> = (primary) => (root, result) => {
  const validOptions = stylelint.utils.validateOptions(result, ruleName, {
    actual: primary,
    possible: [true, false],
  });
  if (!validOptions || primary === false) return;

  const sourceFile = root.source?.input.file;
  if (!sourceFile) return;
  const expected = expectedBlockFromPath(sourceFile);

  root.walkRules((rule) => {
    if (!rule.parent || rule.parent.type !== 'root') return;
    for (const selector of rule.selectors) {
      const match = selector.match(CLASS_RE);
      if (!match) continue;
      const block = blockOf(match[1]!);
      if (block !== expected) {
        stylelint.utils.report({
          message: messages.mismatch(block, expected),
          node: rule,
          result,
          ruleName,
        });
        break;
      }
    }
  });
};

ruleFunction.ruleName = ruleName;
ruleFunction.messages = messages;
ruleFunction.meta = meta;

const plugin: Plugin = stylelint.createPlugin(ruleName, ruleFunction);

export default plugin;
