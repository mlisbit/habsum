import stylelint, { type Plugin, type Rule } from 'stylelint';

import {
  collectCustomPropDecls,
  countMap,
  countMapsEqual,
  findTopLevelThemeRule,
  isTokensStylesheet,
  resolveTokensSubpath,
  themeRuleSelectorRange,
  type ThemeTokenSecondaryOptions,
} from './theme-token-blocks.mjs';

const ruleName = 'habsum/theme-token-order';

const messages = stylelint.utils.ruleMessages(ruleName, {
  wrongOrder: (position: number, expectedProp: string, actualProp: string) =>
    `Theme tokens must appear in the same order as dark theme: position ${String(position)} expected "${expectedProp}" but found "${actualProp}".`,
});

const meta = {
  url: 'https://github.com/mlisbit/habsum#stylelint-rules',
};

const ruleFunction: Rule<boolean, ThemeTokenSecondaryOptions> =
  (primary, secondaryOptions) => (root, result) => {
    const validOptions = stylelint.utils.validateOptions(result, ruleName, {
      actual: primary,
      possible: [true, false],
    });
    if (!validOptions || primary === false) return;

    const tokensSubpath = resolveTokensSubpath(secondaryOptions);
    const from = root.source?.input?.from;
    if (!isTokensStylesheet(from, tokensSubpath)) return;

    const darkRule = findTopLevelThemeRule(root, 'dark');
    const lightRule = findTopLevelThemeRule(root, 'light');

    if (!darkRule || !lightRule) return;

    const darkDecls = collectCustomPropDecls(darkRule);
    const lightDecls = collectCustomPropDecls(lightRule);
    const darkNames = darkDecls.map((d) => d.prop);
    const lightNames = lightDecls.map((d) => d.prop);

    const darkCounts = countMap(darkNames);
    const lightCounts = countMap(lightNames);
    if (!countMapsEqual(darkCounts, lightCounts)) return;

    if (darkNames.length !== lightNames.length) return;

    for (let i = 0; i < darkNames.length; i++) {
      const expected = darkNames[i]!;
      const actual = lightNames[i]!;
      if (expected === actual) continue;
      const { start, end } = themeRuleSelectorRange(lightRule);
      stylelint.utils.report({
        message: messages.wrongOrder(i + 1, expected, actual),
        node: lightRule,
        start,
        end,
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
