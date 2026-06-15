import { RuleTester } from 'eslint';
import { describe, it } from 'vitest';
import noComputedClassname from './no-computed-classname.mjs';

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
    parserOptions: { ecmaFeatures: { jsx: true } },
  },
});

describe('no-computed-classname', () => {
  it('passes eslint RuleTester cases', () => {
    ruleTester.run('no-computed-classname', noComputedClassname, {
      valid: [
        `<div className="static-class" />`,
        `<div className={'static-class'} />`,
        `<div className={\`static-class\`} />`,
        `<div className={className} />`,
        `<div className={VARIANTS[type]} />`,
        `<div className={selected ? 'pill--selected' : undefined} />`,
        `<div className={delta < 0 ? 'text-error' : undefined} />`,
        `<div className={active.size === 'large' && 'modal__dialog--large'} />`,
        `<div className={classBuilder({ 'toast--error': isError }, 'toast')} />`,
        `<div className={classNames('foo', selected && 'foo--active')} />`,
        `<div className={pillSizeClass(size)} />`,
        `<div className={\`settings__link text-b-l\${path.endsWith('/account') ? ' settings__link--active' : ''}\`} />`,
        `<div className={\`\${selected ? 'class-a' : 'class-b'}\`} />`,
        `<div className={\`\${className}\`} />`,
        `<div className={\`\${styles.active}\`} />`,
        `<div className={\`heatmap \${className}\`} />`,
        `<div className={\`\${className} heatmap\`} />`,
        `<div className={\`heatmap \${styles.extra} text-b-m\`} />`,
        `<div className={['input__input', inputClassName].filter(Boolean).join(' ')} />`,
        `<div className={['foo', bar].filter(Boolean).join(' ')} />`,
        `<div className={['toast__message', isError ? 'text-error' : null].filter(Boolean).join(' ')} />`,
        `const classes = ['toast__message', isError ? 'text-error' : null].filter(Boolean).join(' '); <div className={classes} />`,
        `const rootClassName = className == null ? 'heatmap' : \`heatmap \${className}\`; <div className={rootClassName} />`,
        `<Input inputClassName="input__input" />`,
        `<Input inputClassName={classBuilder({ 'text-error': isError }, 'text-b-m')} />`,
        `<Input titleClassName={\`title\${active ? ' title--active' : ''}\`} />`,
      ],
      invalid: [
        {
          code: `<div className={\`toast toast--\${type}\`} />`,
          errors: [{ messageId: 'template' }],
        },
        {
          code: `<div className={\`toast toast--\${active.type}\`} />`,
          errors: [{ messageId: 'template' }],
        },
        {
          code: `<div className={\`heatmap--\${className}\`} />`,
          errors: [{ messageId: 'template' }],
        },
        {
          code: `<div className={\`heatmap \${className}--dense\`} />`,
          errors: [{ messageId: 'template' }],
        },
        {
          code: `<div className={'foo' + suffix} />`,
          errors: [{ messageId: 'concat' }],
        },
        {
          code: `<div className={['foo', \`bar-\${type}\`].filter(Boolean).join(' ')} />`,
          errors: [{ messageId: 'template' }],
        },
        {
          code: `<div className={['foo', 'bar']} />`,
          errors: [{ messageId: 'join' }],
        },
        {
          code: `<Input inputClassName={\`pickle--\${minusHovered && showMinus ? 'error' : 'default'}\`} />`,
          errors: [{ messageId: 'template' }],
        },
        {
          code: `<Input inputClassName={'pickle--' + suffix} />`,
          errors: [{ messageId: 'concat' }],
        },
        {
          code: `
            const classes = [
              'info-text',
              \`info-text--\${variant}\`,
              'text-b-s',
              TEXT_CLASS_BY_VARIANT[variant],
              className,
            ].filter(Boolean).join(' ');

            <p className={classes} />;
          `,
          errors: [{ messageId: 'template' }],
        },
      ],
    });
  });
});
