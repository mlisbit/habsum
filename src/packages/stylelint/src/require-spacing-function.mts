import stylelint, { type Plugin, type Rule } from 'stylelint';
import valueParser from 'postcss-value-parser';

const ruleName = 'habsum/require-spacing-function';

const messages = stylelint.utils.ruleMessages(ruleName, {
  rejected: (prop: string, value: string) =>
    `Unexpected raw length in "${prop}: ${value}". Use the spacing() function instead.`,
});

const meta = {
  url: 'https://github.com/mlisbit/habsum#stylelint-rules',
};

const SPACING_PROPS = new Set([
  'margin',
  'margin-top',
  'margin-right',
  'margin-bottom',
  'margin-left',
  'padding',
  'padding-top',
  'padding-right',
  'padding-bottom',
  'padding-left',
  'gap',
  'row-gap',
  'column-gap',
]);

// Units that constitute a raw length value
const LENGTH_UNITS = new Set(['px', 'rem', 'em', 'ex', 'ch', 'vw', 'vh', 'vmin', 'vmax']);

// Allowed CSS functions whose arguments should not be inspected.
// Spacing must be namespaced (e.g. `functions.spacing(...)`); bare `spacing(...)` is rejected.
const ALLOWED_FUNCTIONS = new Set(['var', 'env', 'min', 'max', 'clamp', 'calc']);

function isAllowedFunction(name: string): boolean {
  const lower = name.toLowerCase();
  if (ALLOWED_FUNCTIONS.has(lower)) return true;
  if (lower.endsWith('.spacing')) return true;
  return false;
}

function hasRawLength(value: string): boolean {
  let found = false;
  valueParser(value).walk((node) => {
    if (node.type === 'function' && isAllowedFunction(node.value)) {
      return false; // skip subtree
    }
    if (node.type === 'word') {
      const parsed = valueParser.unit(node.value);
      if (parsed !== false && LENGTH_UNITS.has(parsed.unit)) {
        found = true;
        return false;
      }
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

  root.walkDecls((decl) => {
    if (!SPACING_PROPS.has(decl.prop.toLowerCase())) return;
    if (!hasRawLength(decl.value)) return;

    stylelint.utils.report({
      message: messages.rejected(decl.prop, decl.value),
      node: decl,
      result,
      ruleName,
    });
  });
};

ruleFunction.ruleName = ruleName;
ruleFunction.messages = messages;
ruleFunction.meta = meta;

const plugin: Plugin = stylelint.createPlugin(ruleName, ruleFunction);

export default plugin;
