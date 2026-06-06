import type { Declaration } from 'postcss';
import stylelint, { type Plugin, type Rule } from 'stylelint';
import valueParser, { type Node } from 'postcss-value-parser';

import {
  customPropFromVarFunction,
  loadKnownTokenNames,
} from '../../lib/token-registry.mjs';
import { isTokensStylesheet, type TokensFileSecondaryOptions } from '../../lib/theme-token-blocks.mjs';
import { requireTokensFile } from '../../lib/tokens-config.mjs';

const ruleName = 'habsum/token-use-enforcer';

const messages = stylelint.utils.ruleMessages(ruleName, {
  rejectedHex: (prop: string, value: string) =>
    `Unexpected hex color "${value}" in "${prop}". Use a token via var(--…) instead.`,
  rejectedFunction: (prop: string, name: string) =>
    `Unexpected color function "${name}()" in "${prop}". Use a token via var(--…) instead.`,
  rejectedColorMix: (prop: string) =>
    `Unexpected color-mix() in "${prop}". Define the mix in the configured tokens file and use var(--…) instead.`,
  rejectedUnknownToken: (prop: string, token: string) =>
    `Unknown token "${token}" in "${prop}". Define it in the configured tokens file first.`,
  rejectedManualBoxShadow: (prop: string) =>
    `Unexpected manual box-shadow in "${prop}". Use a shadow token via var(--…) instead.`,
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

function trimSpaceNodes(nodes: Node[]): Node[] {
  let start = 0;
  let end = nodes.length;
  while (start < end && nodes[start]?.type === 'space') start += 1;
  while (end > start && nodes[end - 1]?.type === 'space') end -= 1;
  return nodes.slice(start, end);
}

function splitTopLevelComma(nodes: Node[]): Node[][] {
  const layers: Node[][] = [];
  let current: Node[] = [];
  for (const node of nodes) {
    if (node.type === 'div' && node.value === ',') {
      layers.push(current);
      current = [];
      continue;
    }
    current.push(node);
  }
  layers.push(current);
  return layers;
}

function isTokenOnlyBoxShadowLayer(nodes: Node[]): boolean {
  const trimmed = trimSpaceNodes(nodes);
  if (trimmed.length === 0) return false;
  if (trimmed.length === 1 && trimmed[0]?.type === 'word' && trimmed[0].value === 'none') {
    return true;
  }
  if (trimmed.length === 1 && trimmed[0]?.type === 'function' && trimmed[0].value === 'var') {
    return true;
  }
  return false;
}

/** `box-shadow` must be `none` and/or comma-separated `var(--…)` layers only — no inline offsets. */
function isTokenOnlyBoxShadow(nodes: Node[]): boolean {
  const layers = splitTopLevelComma(nodes);
  if (layers.length === 0) return false;
  return layers.every(isTokenOnlyBoxShadowLayer);
}

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
    if (isTokensStylesheet(from, tokensFile, baseDir)) return;

    const knownTokens = loadKnownTokenNames(tokensFile, baseDir);
    if (!knownTokens) return;

    const reportHex = (decl: Declaration, value: string) => {
      stylelint.utils.report({
        message: messages.rejectedHex(decl.prop, value),
        node: decl,
        result,
        ruleName,
        word: value,
      });
    };

    const reportColorFunction = (decl: Declaration, name: string) => {
      stylelint.utils.report({
        message: messages.rejectedFunction(decl.prop, name),
        node: decl,
        result,
        ruleName,
        word: name,
      });
    };

    const reportColorMix = (decl: Declaration) => {
      stylelint.utils.report({
        message: messages.rejectedColorMix(decl.prop),
        node: decl,
        result,
        ruleName,
        word: 'color-mix',
      });
    };

    const reportUnknownToken = (decl: Declaration, token: string) => {
      stylelint.utils.report({
        message: messages.rejectedUnknownToken(decl.prop, token),
        node: decl,
        result,
        ruleName,
        word: token,
      });
    };

    const reportManualBoxShadow = (decl: Declaration) => {
      stylelint.utils.report({
        message: messages.rejectedManualBoxShadow(decl.prop),
        node: decl,
        result,
        ruleName,
        word: 'box-shadow',
      });
    };

    const walkNodes = (nodes: Node[], decl: Declaration): void => {
      for (const node of nodes) {
        if (node.type === 'function') {
          const name = node.value.toLowerCase();
          if (name === 'var') {
            const token = customPropFromVarFunction(node.nodes);
            if (token && !knownTokens.has(token)) {
              reportUnknownToken(decl, token);
            }
            continue;
          }
          if (name === 'color-mix') {
            reportColorMix(decl);
            continue;
          }
          if (COLOR_FUNCTIONS.has(name)) {
            reportColorFunction(decl, name);
            continue;
          }
          walkNodes(node.nodes, decl);
          continue;
        }

        if (node.type === 'word' && HEX_RE.test(node.value)) {
          reportHex(decl, node.value);
        }
      }
    };

    root.walkDecls((decl) => {
      const parsed = valueParser(decl.value);
      if (decl.prop.toLowerCase() === 'box-shadow' && !isTokenOnlyBoxShadow(parsed.nodes)) {
        reportManualBoxShadow(decl);
        return;
      }
      walkNodes(parsed.nodes, decl);
    });
  };

ruleFunction.ruleName = ruleName;
ruleFunction.messages = messages;
ruleFunction.meta = meta;

const plugin: Plugin = stylelint.createPlugin(ruleName, ruleFunction);

export default plugin;
