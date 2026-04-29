import type { ButtonHTMLAttributes } from 'react';
import { ChevronLeft, ChevronRight, type LucideIcon, Plus, Settings } from 'lucide-react';

const BUTTON_ICONS = {
  gear: Settings,
  chevronLeft: ChevronLeft,
  chevronRight: ChevronRight,
  chevronBack: ChevronLeft,
  plus: Plus,
} as const satisfies Record<string, LucideIcon>;

export type ButtonIcon = keyof typeof BUTTON_ICONS;

type ButtonProps = {
  type: 'primary' | 'secondary' | 'tertiary';
  size?: 'small' | 'medium' | 'large';
  icon?: ButtonIcon;
  circle?: boolean;
  text: string;
} & Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'type' | 'children'>;

const ICON_SIZES = { small: 16, medium: 18, large: 20 } as const;

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
    icon === 'plus' && circle && isIconOnly && 'button--plus',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  const renderIcon = () => {
    if (icon == null) return null;
    const Lucide = BUTTON_ICONS[icon];
    const px = ICON_SIZES[size];
    return <Lucide size={px} strokeWidth={icon === 'plus' ? 2.5 : 2} aria-hidden />;
  };

  return (
    <button type="button" className={classes || undefined} {...rest}>
      {icon && text ? (
        <span className="button__inner">
          {renderIcon()}
          {text}
        </span>
      ) : (
        <>
          {renderIcon()}
          {text}
        </>
      )}
    </button>
  );
}
