import path from 'node:path';
import stylelint, { type Plugin, type Rule } from 'stylelint';

const ruleName = 'habsum/atomic-class-enforcer';

const TYPOGRAPHY_PROPS = new Set(['font-size', 'line-height', 'font-weight']);
const COLOR_PROP = 'color';

/** Normalized declaration → atomic class in foundation/_atomic.scss */
const ATOMIC_LAYOUT_UTILITIES = new Map<string, string>([
  ['display:flex', '.flex'],
  ['align-items:center', '.align-items-center'],
  ['padding:functions.spacing(2, 3)', '.card-padding'],
  ['gap:functions.spacing(2)', '.gap-2'],
]);

const messages = stylelint.utils.ruleMessages(ruleName, {
  rejectedTypography: (prop: string) =>
    `Unexpected property "${prop}". Use atomic typography classes (.text-h-*, .text-b-*, .text-light, .text-bold) defined in foundation/_text.scss`,
  rejectedColor: () =>
    `Unexpected property "color". Use atomic text color classes (.text-light, .text-link, .text-error, .text-success) defined in foundation/_text.scss`,
  rejectedLayoutBlock: (classes: string[]) =>
    `Use atomic layout class${classes.length > 1 ? 'es' : ''} ${classes.join(', ')} from foundation/_atomic.scss instead of declaring them here`,
});

const meta = {
  url: 'https://github.com/mlisbit/habsum#stylelint-rules',
};

/** Basename without extension or leading underscore (e.g. `_reset.scss` → `reset`). */
function normalizedStem(filePath: string): string {
  const base = path.basename(filePath, path.extname(filePath));
  return base.replace(/^_/, '');
}

function normalizeDecl(prop: string, value: string): string {
  return `${prop.trim().toLowerCase()}:${value.trim().replace(/\s+/g, ' ')}`;
}

/** Stylesheets that define or reset global typography/color — skip the rule entirely. */
const IGNORED_STEMS = new Set(['reset', 'text', 'theme', 'tokens']);

/** Stylesheets that define layout atomic utilities — skip layout-block checks only. */
const LAYOUT_DEFINITION_STEMS = new Set(['atomic']);

/** Stylesheets that may set `color` directly but must still use atomic typography classes. */
const TYPOGRAPHY_ONLY_STEMS = new Set(['button']);

function disallowedPropsForFile(filePath: string | undefined): Set<string> | null {
  if (!filePath) return new Set([...TYPOGRAPHY_PROPS, COLOR_PROP]);

  const stem = normalizedStem(filePath);
  if (IGNORED_STEMS.has(stem)) return null;
  if (TYPOGRAPHY_ONLY_STEMS.has(stem)) return new Set(TYPOGRAPHY_PROPS);

  return new Set([...TYPOGRAPHY_PROPS, COLOR_PROP]);
}

const ruleFunction: Rule<boolean> = (primary) => (root, result) => {
  const validOptions = stylelint.utils.validateOptions(result, ruleName, {
    actual: primary,
    possible: [true, false],
  });
  if (!validOptions || primary === false) return;

  const sourceFile = root.source?.input.file;
  const stem = sourceFile ? normalizedStem(sourceFile) : null;
  const skipAll = stem !== null && IGNORED_STEMS.has(stem);
  const skipLayout = skipAll || (stem !== null && LAYOUT_DEFINITION_STEMS.has(stem));

  if (!skipAll) {
    const disallowed = disallowedPropsForFile(sourceFile);
    if (disallowed && disallowed.size > 0) {
      root.walkDecls((decl) => {
        const prop = decl.prop.toLowerCase();
        if (!disallowed.has(prop)) return;

        stylelint.utils.report({
          message: prop === COLOR_PROP ? messages.rejectedColor() : messages.rejectedTypography(prop),
          node: decl,
          result,
          ruleName,
          word: prop,
        });
      });
    }
  }

  if (!skipLayout) {
    root.walkRules((rule) => {
      if (rule.parent?.type === 'atrule' && rule.parent.name === 'keyframes') return;

      const decls: string[] = [];
      rule.walkDecls((decl) => {
        if (decl.parent !== rule) return;
        decls.push(normalizeDecl(decl.prop, decl.value));
      });
      if (decls.length === 0) return;

      const atomicClasses: string[] = [];
      for (const decl of decls) {
        const atomicClass = ATOMIC_LAYOUT_UTILITIES.get(decl);
        if (!atomicClass) return;
        atomicClasses.push(atomicClass);
      }

      stylelint.utils.report({
        message: messages.rejectedLayoutBlock(atomicClasses),
        node: rule,
        result,
        ruleName,
      });
    });
  }
};

ruleFunction.ruleName = ruleName;
ruleFunction.messages = messages;
ruleFunction.meta = meta;

const plugin: Plugin = stylelint.createPlugin(ruleName, ruleFunction);

export default plugin;
