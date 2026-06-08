import type { ButtonHTMLAttributes } from 'react';
import { Icon, type IconName, ICON_SIZES_PX } from './Icon';

export type ButtonIcon = IconName;

type ButtonProps = {
  type: 'primary' | 'secondary' | 'tertiary';
  color?: 'primary' | 'danger' | 'muted';
  size?: keyof typeof ICON_SIZES_PX;
  icon?: IconName;
  circle?: boolean;
  text?: string;
} & Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'type' | 'children'>;

export function Button({
  type: visual,
  color = 'primary',
  size = 'medium',
  icon,
  circle = false,
  text,
  className,
  ...rest
}: ButtonProps) {
  const isIconOnly = icon != null && !text;
  const classes = [
    'button',
    visual === 'secondary' && 'button--secondary',
    visual === 'tertiary' && 'button--tertiary',
    color === 'danger' && 'button--danger',
    color === 'muted' && 'button--muted',
    `button--${size}`,
    icon != null && 'button--with-icon',
    isIconOnly && 'button--icon',
    circle && isIconOnly && 'button--circle',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button type="button" className={classes || undefined} {...rest}>
      {icon && text ? (
        <span className="button__inner">
          <Icon name={icon} size={size} />
          {text}
        </span>
      ) : (
        <>
          {icon != null ? <Icon name={icon} size={size} /> : null}
          {text}
        </>
      )}
    </button>
  );
}
