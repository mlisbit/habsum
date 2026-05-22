// exclusive-bem-block: pill
import type { ButtonHTMLAttributes, HTMLAttributes, ReactNode } from 'react';
import { Icon } from '~/core-components/Icon';

function classNames(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(' ');
}

export type PillSize = 'large' | 'small';

function pillSizeClass(size: PillSize): string {
  return size === 'small' ? 'pill--small' : 'pill--large';
}

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
      className={classNames(
        'pill',
        'pill--toggle',
        pillSizeClass(size),
        selected && 'pill--selected',
        className,
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
      className={classNames('pill', 'pill--dismissable', pillSizeClass(size), className)}
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
