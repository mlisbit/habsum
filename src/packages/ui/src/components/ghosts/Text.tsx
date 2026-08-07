import type { CSSProperties, HTMLAttributes } from 'react';

type TextProps = Omit<HTMLAttributes<HTMLSpanElement>, 'children'> & {
  mimic: string;
  width?: CSSProperties['width'];
};

export function Text({ className, mimic, style, width = '8rem', ...rest }: TextProps) {
  const classes = ['ghost-text', mimic, className].filter(Boolean).join(' ');

  return (
    <span
      {...rest}
      className={classes || undefined}
      style={{ ...style, width }}
      aria-hidden="true"
    />
  );
}
