import type { ReactNode } from "react";

type ProgressBarProps = {
  value: number;
  max: number;
  className?: string;
  /** Shown on top of the track; defaults to `value` / `max` */
  label?: ReactNode;
  "aria-label"?: string;
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
  label,
  "aria-label": ariaLabel,
}: ProgressBarProps) {
  const pct = fillPercent(value, max);
  const now = clampValue(value, max);
  const defaultAria = `${value} of ${max}`;

  return (
    <div
      className={className ? `progress ${className}` : "progress"}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={now}
      aria-label={ariaLabel ?? defaultAria}
    >
      <div
        className="progress__fill"
        style={{ width: `${pct}%` }}
        aria-hidden
      />
      <span className="progress__label">
        {label ?? `${value} / ${max}`}
      </span>
    </div>
  );
}
