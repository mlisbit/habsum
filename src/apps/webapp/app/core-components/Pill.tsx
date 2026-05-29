// exclusive-bem-block: pill
import type { ButtonHTMLAttributes, HTMLAttributes, ReactNode } from 'react';
import { Icon } from '~/core-components/Icon';
import { classBuilder } from '~/utils/class-builder';

export type PillSize = 'large' | 'small';

type TogglePillProps = {
  selected: boolean;
  onToggle: (selected: boolean) => void;
  size?: PillSize;
  children: ReactNode;
} & Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children' | 'onClick'>;

export function TogglePill({
  selected,
  onToggle,
  size = 'large',
  children,
  className,
  type = 'button',
  ...props
}: TogglePillProps) {
  return (
    <button
      type={type}
      className={classBuilder(
        {
          'pill--selected': selected,
          'pill--small text-b-s': size === 'small',
          'pill--large text-b-m': size === 'large',
        },
        `pill pill--toggle ${className}`,
      )}
      aria-pressed={selected}
      onClick={() => onToggle(!selected)}
      {...props}
    >
      {children}
    </button>
  );
}

type DismissablePillProps = {
  children: ReactNode;
  onDismiss: () => void;
  dismissAriaLabel?: string;
  size?: PillSize;
} & Omit<HTMLAttributes<HTMLSpanElement>, 'children'>;

export function DismissablePill({
  children,
  onDismiss,
  dismissAriaLabel = 'Remove',
  size = 'large',
  className,
  ...props
}: DismissablePillProps) {
  return (
    <span
      className={classBuilder(
        {
          'pill--small text-b-s': size === 'small',
          'pill--large text-b-m': size === 'large',
        },
        `pill pill--dismissable ${className}`,
      )}
      {...props}
    >
      <span className="pill__label">{children}</span>
      <button
        type="button"
        className="pill__dismiss-button"
        aria-label={dismissAriaLabel}
        onClick={(event) => {
          event.stopPropagation();
          onDismiss();
        }}
      >
        <Icon name="close" size="small" />
      </button>
    </span>
  );
}
