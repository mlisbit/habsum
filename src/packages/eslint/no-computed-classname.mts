/**
 * Applies to `class`, `className`, and any prop whose name ends with `ClassName`
 * (e.g. `inputClassName`, `titleClassName`).
 *
 * Template literals are allowed when interpolations only select among static
 * class strings (e.g. `` `base${active ? ' base--active' : ''}` ``), but not
 * when they embed dynamic values into a token (e.g. `` `block--${type}` ``).
 *
 * Array `.join()` chains are allowed when every element is a static class
 * string, variable, lookup, or conditional/`&&` among static class strings.
 */

import type { Rule } from 'eslint';
import type {
  ArrayExpression,
  BinaryExpression,
  CallExpression,
  Expression,
  Identifier,
  MemberExpression,
  TemplateLiteral,
} from 'estree';

type MaybeWrappedExpression = { type: string; expression?: Expression };

function unwrapExpression(node: Expression): Expression {
  const current = node as MaybeWrappedExpression;
  if (
    current.type === 'TSAsExpression' ||
    current.type === 'TSSatisfiesExpression' ||
    current.type === 'TSNonNullExpression'
  ) {
    return unwrapExpression(current.expression as Expression);
  }
  return node;
}

function isClassAttr(name: string): boolean {
  return name === 'class' || name === 'className' || name.endsWith('ClassName');
}

function isAllowedExpression(node: Expression | null | undefined): boolean {
  if (!node) return true;
  node = unwrapExpression(node);

  switch (node.type) {
    case 'Literal':
      return typeof node.value === 'string' || node.value === null;
    case 'Identifier':
      return true;
    case 'MemberExpression':
      return true;
    case 'TemplateLiteral':
      return isAllowedTemplateLiteral(node);
    case 'ConditionalExpression':
      return (
        isAllowedExpression(node.consequent) &&
        isAllowedExpression(node.alternate)
      );
    case 'LogicalExpression':
      if (node.operator === '&&') {
        return isAllowedExpression(node.right);
      }
      return (
        isAllowedExpression(node.left) && isAllowedExpression(node.right)
      );
    case 'UnaryExpression':
      return isAllowedExpression(node.argument);
    case 'CallExpression':
      return isAllowedCallExpression(node);
    case 'BinaryExpression':
      return isAllowedBinaryExpression(node);
    case 'ArrayExpression':
      return false;
    case 'ObjectExpression':
      return false;
    default:
      return false;
  }
}

type TemplateInterpContext = {
  passThrough?: boolean;
  hasLeadingQuasi?: boolean;
  isWholeClassChunk?: boolean;
};

/** Static string appended after a template prefix must be a full class token. */
function isAllowedTemplateLiteralFragment(value: string, hasLeadingQuasi: boolean): boolean {
  if (!hasLeadingQuasi) return true;
  if (value === '') return true;
  if (value.startsWith(' ')) return true;
  if (value.includes('--') || value.includes('__')) return true;
  return false;
}

function isAllowedTemplateConditionalBranch(
  node: Expression,
  context: TemplateInterpContext,
): boolean {
  node = unwrapExpression(node);
  if (node.type === 'Identifier' && node.name === 'undefined') return true;
  if (node.type === 'Literal' && node.value === null) return true;
  return isAllowedTemplateInterpolation(node, context);
}

/** Interpolation that picks a static class fragment rather than building one. */
function isAllowedTemplateInterpolation(
  node: Expression,
  context: TemplateInterpContext = {},
): boolean {
  const {
    passThrough = false,
    hasLeadingQuasi = false,
    isWholeClassChunk = false,
  } = context;
  node = unwrapExpression(node);

  switch (node.type) {
    case 'Literal':
      return (
        typeof node.value === 'string' &&
        isAllowedTemplateLiteralFragment(node.value, hasLeadingQuasi)
      );
    case 'Identifier':
    case 'MemberExpression':
      return passThrough || isWholeClassChunk;
    case 'ConditionalExpression':
      return (
        isAllowedTemplateConditionalBranch(node.consequent, context) &&
        isAllowedTemplateConditionalBranch(node.alternate, context)
      );
    case 'LogicalExpression':
      if (node.operator === '&&') {
        return isAllowedTemplateConditionalBranch(node.right, context);
      }
      return (
        isAllowedTemplateInterpolation(node.left, context) &&
        isAllowedTemplateInterpolation(node.right, context)
      );
    case 'TemplateLiteral':
      return isAllowedTemplateLiteral(node);
    case 'CallExpression':
      return isAllowedCallExpression(node);
    default:
      return false;
  }
}

function isPassThroughTemplate(node: TemplateLiteral): boolean {
  if (node.expressions.length !== 1) return false;
  const [before = '', after = ''] = [
    node.quasis[0]?.value.raw ?? '',
    node.quasis[1]?.value.raw ?? '',
  ];
  return before.trim() === '' && after.trim() === '';
}

function isAllowedTemplateLiteral(node: TemplateLiteral): boolean {
  if (node.expressions.length === 0) return true;

  const passThrough = isPassThroughTemplate(node);
  return node.expressions.every((expr, index) => {
    const leadingQuasi = node.quasis[index]?.value.raw ?? '';
    const trailingQuasi = node.quasis[index + 1]?.value.raw ?? '';
    const hasLeadingQuasi = leadingQuasi.trim().length > 0;
    const isWholeClassChunk =
      (leadingQuasi === '' || /\s$/.test(leadingQuasi)) &&
      (trailingQuasi === '' || /^\s/.test(trailingQuasi));

    return isAllowedTemplateInterpolation(expr as Expression, {
      passThrough,
      hasLeadingQuasi: passThrough ? false : hasLeadingQuasi,
      isWholeClassChunk: passThrough ? false : isWholeClassChunk,
    });
  });
}

/** A single token in a class list (array before `.join()`). */
function isAllowedClassListItem(node: Expression): boolean {
  node = unwrapExpression(node);

  switch (node.type) {
    case 'Literal':
      return typeof node.value === 'string' || node.value === null;
    case 'Identifier':
    case 'MemberExpression':
      return true;
    case 'ConditionalExpression':
      return (
        isAllowedClassListItem(node.consequent) &&
        isAllowedClassListItem(node.alternate)
      );
    case 'LogicalExpression':
      if (node.operator === '&&') {
        return isAllowedClassListItem(node.right);
      }
      return (
        isAllowedClassListItem(node.left) && isAllowedClassListItem(node.right)
      );
    case 'TemplateLiteral':
      return isAllowedTemplateLiteral(node);
    case 'CallExpression':
      return isAllowedCallExpression(node);
    default:
      return false;
  }
}

function isAllowedArrayExpression(node: ArrayExpression): boolean {
  return node.elements.every((element) => {
    if (!element || element.type === 'SpreadElement') return false;
    return isAllowedClassListItem(element as Expression);
  });
}

function getArrayFromJoinCall(node: CallExpression): ArrayExpression | null {
  if (!isJoinCall(node)) return null;

  let object = (node.callee as MemberExpression).object as Expression;

  if (
    object.type === 'CallExpression' &&
    object.callee.type === 'MemberExpression' &&
    object.callee.property.type === 'Identifier' &&
    object.callee.property.name === 'filter'
  ) {
    object = object.callee.object as Expression;
  }

  if (object.type !== 'ArrayExpression') return null;
  return object;
}

function isJoinCall(node: CallExpression): boolean {
  const { callee } = node;
  return (
    callee.type === 'MemberExpression' &&
    callee.property.type === 'Identifier' &&
    callee.property.name === 'join'
  );
}

function isAllowedJoinCall(node: CallExpression): boolean {
  const array = getArrayFromJoinCall(node);
  if (!array) return false;
  return isAllowedArrayExpression(array);
}

function isAllowedBinaryExpression(node: BinaryExpression): boolean {
  if (node.operator === '+') return false;
  return (
    isAllowedExpression(node.left as Expression) &&
    isAllowedExpression(node.right as Expression)
  );
}

function isJoinOrConcatCall(node: CallExpression): boolean {
  const { callee } = node;
  if (callee.type !== 'MemberExpression' || callee.property.type !== 'Identifier') {
    return false;
  }
  return callee.property.name === 'join' || callee.property.name === 'concat';
}

function isAllowedCallExpression(node: CallExpression): boolean {
  if (isJoinCall(node)) return isAllowedJoinCall(node);
  if (isJoinOrConcatCall(node)) return false;

  const { callee } = node;
  if (callee.type === 'Identifier' || callee.type === 'MemberExpression') {
    return true;
  }

  return isAllowedExpression(callee as Expression);
}

function violationMessageId(node: Expression): 'template' | 'concat' | 'join' | 'computed' {
  if (node.type === 'TemplateLiteral' && node.expressions.length > 0) {
    return 'template';
  }
  if (node.type === 'BinaryExpression' && node.operator === '+') {
    return 'concat';
  }
  if (node.type === 'CallExpression' && isJoinOrConcatCall(node)) {
    return 'join';
  }
  if (node.type === 'ArrayExpression') {
    return 'join';
  }
  return 'computed';
}

function findDisallowedExpression(node: Expression): Expression | null {
  node = unwrapExpression(node);
  if (isAllowedExpression(node)) return null;

  if (node.type === 'ConditionalExpression') {
    return (
      findDisallowedExpression(node.consequent) ??
      findDisallowedExpression(node.alternate) ??
      node
    );
  }

  if (node.type === 'LogicalExpression') {
    if (node.operator === '&&') {
      return findDisallowedExpression(node.right) ?? node;
    }
    return (
      findDisallowedExpression(node.left) ??
      findDisallowedExpression(node.right) ??
      node
    );
  }

  if (node.type === 'TemplateLiteral') {
    for (const expr of node.expressions) {
      const found = findDisallowedExpression(expr as Expression);
      if (found) return found;
    }
    return node;
  }

  if (node.type === 'CallExpression' && isJoinCall(node)) {
    const array = getArrayFromJoinCall(node);
    if (array) {
      for (const element of array.elements) {
        if (!element || element.type === 'SpreadElement') continue;
        const found = findDisallowedExpression(element as Expression);
        if (found) return found;
      }
    }
    return node;
  }

  return node;
}

function getConstVariableInit(
  context: Rule.RuleContext,
  node: Identifier,
): Expression | null {
  let scope: ReturnType<typeof context.sourceCode.getScope> | null =
    context.sourceCode.getScope(node);

  while (scope) {
    const variable = scope.variables.find((item) => item.name === node.name);
    if (!variable) {
      scope = scope.upper;
      continue;
    }

    const [definition] = variable.defs;
    if (!definition || variable.defs.length !== 1) return null;
    if (definition.type !== 'Variable') return null;

    const declaration = definition.parent;
    if (!declaration || declaration.type !== 'VariableDeclaration') return null;
    if (declaration.kind !== 'const') return null;

    const declarator = definition.node;
    if (
      declarator.type !== 'VariableDeclarator' ||
      declarator.id.type !== 'Identifier' ||
      declarator.id.name !== node.name ||
      !declarator.init
    ) {
      return null;
    }

    return declarator.init as Expression;
  }

  return null;
}

function findDisallowedClassExpression(
  context: Rule.RuleContext,
  node: Expression,
): Expression | null {
  const unwrapped = unwrapExpression(node);

  if (unwrapped.type === 'Identifier') {
    const init = getConstVariableInit(context, unwrapped);
    if (!init) return null;
    return findDisallowedExpression(init);
  }

  return findDisallowedExpression(unwrapped);
}

const rule: Rule.RuleModule = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Disallow computed class-name prop values; use static strings, object lookups, or classBuilder()',
    },
    schema: [],
    messages: {
      template:
        'Computed className template literal is not allowed. Use a static string, object lookup, or classBuilder().',
      concat:
        'Computed className string concatenation is not allowed. Use a static string, object lookup, or classBuilder().',
      join:
        'Computed className array join is not allowed. Use a static string, object lookup, or classBuilder().',
      computed:
        'Computed className expression is not allowed. Use a static string, object lookup, or classBuilder().',
    },
  },

  create(context) {
    return {
      JSXAttribute(node) {
        const name =
          node.name.type === 'JSXIdentifier' ? node.name.name : undefined;
        if (!name || !isClassAttr(name)) return;
        if (!node.value || node.value.type !== 'JSXExpressionContainer') return;

        const expr = node.value.expression;
        if (expr.type === 'JSXEmptyExpression') return;

        const disallowed = findDisallowedClassExpression(context, expr);
        if (!disallowed) return;

        context.report({
          node: disallowed,
          messageId: violationMessageId(disallowed),
        });
      },
    };
  },
};

export default rule;
