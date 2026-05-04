import type { HTMLAttributes, ReactNode } from 'react';
import { Icon, type IconName } from './Icon';

type InfoTextVariant = 'info' | 'error' | 'success';

type InfoTextProps = {
  variant: InfoTextVariant;
  children: ReactNode;
} & HTMLAttributes<HTMLParagraphElement>;

const ICON_BY_VARIANT = {
  info: 'info',
  error: 'octagon-x',
  success: 'circle-check',
} as const satisfies Record<InfoTextVariant, IconName>;

const TEXT_CLASS_BY_VARIANT = {
  info: 'text-light',
  error: 'text-error',
  success: 'text-success',
} as const satisfies Record<InfoTextVariant, string>;

export function InfoText({ variant, children, className, ...rest }: InfoTextProps) {
  const classes = [
    'info-text',
    `info-text--${variant}`,
    'text-b-s',
    TEXT_CLASS_BY_VARIANT[variant],
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <p className={classes} {...rest}>
      <Icon className="info-text__icon" name={ICON_BY_VARIANT[variant]} size="small" />
      <span>{children}</span>
    </p>
  );
}
