import type { ButtonHTMLAttributes, HTMLAttributes, ReactNode } from 'react';
import { Icon } from '~/core-components/Icon';

function classNames(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(' ');
}

type PillProps = {
  selected: boolean;
  onToggle: (selected: boolean) => void;
  children: ReactNode;
} & Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children' | 'onClick'>;

export function Pill({
  selected,
  onToggle,
  children,
  className,
  type = 'button',
  ...props
}: PillProps) {
  return (
    <button
      type={type}
      className={classNames('pill', selected && 'pill--selected', className)}
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
} & Omit<HTMLAttributes<HTMLSpanElement>, 'children'>;

export function DismissablePill({
  children,
  onDismiss,
  dismissAriaLabel = 'Remove',
  className,
  ...props
}: DismissablePillProps) {
  return (
    <span className={classNames('pill', 'pill--dismissable', className)} {...props}>
      <span className="pill__label">{children}</span>
      <button
        type="button"
        className="pill__dismiss"
        aria-label={dismissAriaLabel}
        onClick={(event) => {
          event.stopPropagation();
          onDismiss();
        }}
      >
        <Icon name="close" size="tiny" />
      </button>
    </span>
  );
}
