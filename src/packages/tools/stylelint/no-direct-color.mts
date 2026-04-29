import stylelint, { type Plugin, type Rule } from 'stylelint';
import valueParser from 'postcss-value-parser';

const ruleName = 'habsum/no-direct-color';

const messages = stylelint.utils.ruleMessages(ruleName, {
  rejectedHex: (prop: string, value: string) =>
    `Unexpected hex color "${value}" in "${prop}". Use a token via var(--…) instead.`,
  rejectedFunction: (prop: string, name: string) =>
    `Unexpected color function "${name}()" in "${prop}". Use a token via var(--…) instead.`,
});

const meta = {
  url: 'https://github.com/mlisbit/habsum#stylelint-rules',
};

const COLOR_FUNCTIONS = new Set([
  'rgb',
  'rgba',
  'hsl',
  'hsla',
  'hwb',
  'lab',
  'lch',
  'oklab',
  'oklch',
  'color',
]);

const HEX_RE = /^#([0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i;

const ruleFunction: Rule<boolean> = (primary) => (root, result) => {
  const validOptions = stylelint.utils.validateOptions(result, ruleName, {
    actual: primary,
    possible: [true, false],
  });
  if (!validOptions || primary === false) return;

  root.walkDecls((decl) => {
    valueParser(decl.value).walk((node) => {
      if (node.type === 'function') {
        const name = node.value.toLowerCase();
        if (COLOR_FUNCTIONS.has(name)) {
          stylelint.utils.report({
            message: messages.rejectedFunction(decl.prop, name),
            node: decl,
            result,
            ruleName,
            word: name,
          });
          return false;
        }
      }
      if (node.type === 'word' && HEX_RE.test(node.value)) {
        stylelint.utils.report({
          message: messages.rejectedHex(decl.prop, node.value),
          node: decl,
          result,
          ruleName,
          word: node.value,
        });
      }
    });
  });
};

ruleFunction.ruleName = ruleName;
ruleFunction.messages = messages;
ruleFunction.meta = meta;

const plugin: Plugin = stylelint.createPlugin(ruleName, ruleFunction);

export default plugin;
