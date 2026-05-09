import type { ButtonHTMLAttributes, ReactNode } from 'react';

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
