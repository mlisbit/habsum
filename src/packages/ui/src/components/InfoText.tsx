import type { HTMLAttributes, ReactNode } from 'react';
import { Icon, type IconName } from './Icon';
import { classBuilder } from '../utils/class-builder';

type InfoTextVariant = 'info' | 'error' | 'success' | 'warning';
type InfoTextSize = 'small' | 'medium';

type InfoTextProps = {
  variant: InfoTextVariant;
  size?: InfoTextSize;
  children: ReactNode;
} & HTMLAttributes<HTMLParagraphElement>;

const ICON_BY_VARIANT = {
  info: 'info',
  error: 'octagon-x',
  success: 'circle-check',
  warning: 'info',
} as const satisfies Record<InfoTextVariant, IconName>;

const TEXT_CLASS_BY_VARIANT = {
  info: 'text-light',
  error: 'text-error',
  success: 'text-success',
  warning: 'text-warning',
} as const satisfies Record<InfoTextVariant, string>;

const ROOT_CLASS_BY_VARIANT = {
  info: 'info-text--info',
  error: 'info-text--error',
  success: 'info-text--success',
  warning: 'info-text--warning',
} as const satisfies Record<InfoTextVariant, string>;

const TEXT_CLASS_BY_SIZE = {
  small: 'text-b-s',
  medium: 'text-b-m',
} as const satisfies Record<InfoTextSize, string>;

export function InfoText({ variant, size = 'small', children, className, ...rest }: InfoTextProps) {
  const classes = classBuilder(
    { [className ?? '']: Boolean(className) },
    `info-text ${ROOT_CLASS_BY_VARIANT[variant]} ${TEXT_CLASS_BY_SIZE[size]} ${TEXT_CLASS_BY_VARIANT[variant]}`,
  );

  return (
    <p className={classes} {...rest}>
      <Icon className="info-text__icon" name={ICON_BY_VARIANT[variant]} size="medium" />
      <span>{children}</span>
    </p>
  );
}
