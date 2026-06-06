import stylelint, { type Plugin, type Rule } from 'stylelint';

import {
  collectCustomPropDecls,
  countMap,
  findTopLevelThemeRule,
  isTokensStylesheet,
  themeRuleSelectorRange,
  type TokensFileSecondaryOptions,
} from '../../lib/theme-token-blocks.mjs';
import { requireTokensFile } from '../../lib/tokens-config.mjs';

const ruleName = 'habsum/theme-token-parity';

const messages = stylelint.utils.ruleMessages(ruleName, {
  missingDarkBlock: () =>
    'Expected a top-level html[data-theme="dark"] (or single quotes) rule with theme tokens.',
  missingLightBlock: () =>
    'Expected a top-level html[data-theme="light"] (or single quotes) rule with theme tokens.',
  missingInLight: (names: string[]) =>
    `Light theme is missing custom properties that appear in dark theme: ${names.sort().join(', ')}.`,
  missingInDark: (names: string[]) =>
    `Dark theme is missing custom properties that appear in light theme: ${names.sort().join(', ')}.`,
  duplicateMismatch: (prop: string, darkCount: number, lightCount: number) =>
    `Custom property "${prop}" appears ${String(darkCount)} time(s) in dark theme but ${String(lightCount)} time(s) in light theme.`,
});

const meta = {
  url: 'https://github.com/mlisbit/habsum#stylelint-rules',
};

const ruleFunction: Rule<boolean, TokensFileSecondaryOptions> =
  (primary, secondaryOptions) => (root, result) => {
    const validOptions = stylelint.utils.validateOptions(result, ruleName, {
      actual: primary,
      possible: [true, false],
    });
    if (!validOptions || primary === false) return;

    const tokensContext = requireTokensFile(result, ruleName, root, secondaryOptions);
    if (!tokensContext) return;

    const { tokensFile, baseDir } = tokensContext;
    const from = root.source?.input?.from;
    if (!isTokensStylesheet(from, tokensFile, baseDir)) return;

    const darkRule = findTopLevelThemeRule(root, 'dark');
    const lightRule = findTopLevelThemeRule(root, 'light');

    if (!darkRule) {
      stylelint.utils.report({
        message: messages.missingDarkBlock(),
        node: root,
        result,
        ruleName,
      });
      return;
    }

    if (!lightRule) {
      stylelint.utils.report({
        message: messages.missingLightBlock(),
        node: root,
        result,
        ruleName,
      });
      return;
    }

    const darkDecls = collectCustomPropDecls(darkRule);
    const lightDecls = collectCustomPropDecls(lightRule);
    const darkNames = darkDecls.map((d) => d.prop);
    const lightNames = lightDecls.map((d) => d.prop);
    const darkCounts = countMap(darkNames);
    const lightCounts = countMap(lightNames);

    const allProps = new Set<string>([...darkCounts.keys(), ...lightCounts.keys()]);
    const missingInLight: string[] = [];
    const missingInDark: string[] = [];
    const mismatchCounts: Array<{ prop: string; darkCount: number; lightCount: number }> = [];

    for (const prop of allProps) {
      const dc = darkCounts.get(prop) ?? 0;
      const lc = lightCounts.get(prop) ?? 0;
      if (dc === 0 && lc > 0) missingInDark.push(prop);
      else if (lc === 0 && dc > 0) missingInLight.push(prop);
      else if (dc !== lc) mismatchCounts.push({ prop, darkCount: dc, lightCount: lc });
    }

    if (missingInLight.length > 0) {
      const { start, end } = themeRuleSelectorRange(darkRule);
      stylelint.utils.report({
        message: messages.missingInLight(missingInLight),
        node: darkRule,
        start,
        end,
        result,
        ruleName,
      });
    }

    if (missingInDark.length > 0) {
      const { start, end } = themeRuleSelectorRange(darkRule);
      stylelint.utils.report({
        message: messages.missingInDark(missingInDark),
        node: darkRule,
        start,
        end,
        result,
        ruleName,
      });
    }

    for (const { prop, darkCount, lightCount } of mismatchCounts) {
      const { start, end } = themeRuleSelectorRange(darkRule);
      stylelint.utils.report({
        message: messages.duplicateMismatch(prop, darkCount, lightCount),
        node: darkRule,
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
