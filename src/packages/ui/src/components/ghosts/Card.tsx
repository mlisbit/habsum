import type { CSSProperties, HTMLAttributes } from 'react';

type CardProps = Omit<HTMLAttributes<HTMLDivElement>, 'children'> & {
  height?: CSSProperties['height'];
  label?: string;
};

export function Card({
  className,
  height = '12rem',
  label = 'Loading',
  style,
  ...rest
}: CardProps) {
  const classes = ['ghost-card', className].filter(Boolean).join(' ');

  return (
    <div
      {...rest}
      className={classes || undefined}
      style={{ ...style, height }}
      role="status"
      aria-label={label}
      aria-live="polite"
    />
  );
}
