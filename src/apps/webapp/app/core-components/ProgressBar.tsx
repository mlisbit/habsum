import type { ReactNode } from 'react';

type ProgressBarProps = {
  value: number;
  max: number;
  className?: string;
  /** Bar height preset; small omits visible label text. */
  size?: 'medium' | 'small';
  /** Shown on top of the track; defaults to `value` / `max` when size is medium. */
  label?: ReactNode;
  'aria-label'?: string;
};

function fillPercent(value: number, max: number): number {
  if (!Number.isFinite(value) || !Number.isFinite(max) || max <= 0) return 0;
  return Math.min(100, Math.max(0, Math.round((value / max) * 100)));
}

function clampValue(value: number, max: number): number {
  if (!Number.isFinite(value) || !Number.isFinite(max) || max <= 0) return 0;
  return Math.min(max, Math.max(0, value));
}

export function ProgressBar({
  value,
  max,
  className,
  size = 'medium',
  label,
  'aria-label': ariaLabel,
}: ProgressBarProps) {
  const pct = fillPercent(value, max);
  const now = clampValue(value, max);
  const defaultAria = `${value} of ${max}`;

  const rootClass = ['progress', size === 'small' && 'progress--small', className]
    .filter(Boolean)
    .join(' ');

  return (
    <div
      className={rootClass || undefined}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={now}
      aria-label={ariaLabel ?? defaultAria}
    >
      <div className="progress__fill" style={{ width: `${pct}%` }} aria-hidden />
      {size === 'medium' ? (
        <span className="progress__label text-b-s">{label ?? `${value} / ${max}`}</span>
      ) : null}
    </div>
  );
}
