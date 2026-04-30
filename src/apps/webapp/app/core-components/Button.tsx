import type { ButtonHTMLAttributes } from 'react';
import { Icon, type IconName } from './Icon';

export type ButtonIcon = IconName;

type ButtonProps = {
  type: 'primary' | 'secondary' | 'tertiary';
  size?: 'small' | 'medium' | 'large';
  icon?: IconName;
  circle?: boolean;
  text: string;
} & Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'type' | 'children'>;

export function Button({
  type: visual,
  size = 'medium',
  icon,
  circle = false,
  text,
  className,
  ...rest
}: ButtonProps) {
  const isIconOnly = icon != null && text === '';
  const classes = [
    'button',
    visual === 'secondary' && 'button--secondary',
    visual === 'tertiary' && 'button--tertiary',
    size !== 'medium' && `button--${size}`,
    circle && isIconOnly && 'button--icon',
    (icon === 'plus' || icon === 'minus') && circle && isIconOnly && `button--icon-stroke`,
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
