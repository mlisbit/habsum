// exclusive-bem-block: habit-module-streak
import { useMemo } from 'react';
import type { StreakDatum, StreakFill, StreakGraphData } from '@habsum/types/common/streak';
import { Heatmap, type HeatmapEntry } from '@habsum/ui/components/graphs/Heatmap';

function formatStreakDayLabel(dateKey: string): string {
  const [ys, ms, ds] = dateKey.split('-');
  const y = Number(ys);
  const m = Number(ms);
  const d = Number(ds);
  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return dateKey;
  const dt = new Date(y, m - 1, d);
  if (Number.isNaN(dt.getTime())) return dateKey;
  return dt.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}

function streakFillValue(datum: StreakDatum): StreakFill {
  const value = typeof datum.fill === 'number' ? Math.trunc(datum.fill) : 0;
  return Math.max(-5, Math.min(5, value)) as StreakFill;
}

const STREAK_FILL_COLOR_BY_VALUE: Record<StreakFill, string> = {
  [-5]: 'var(--heatmap-fill-negative-5)',
  [-4]: 'var(--heatmap-fill-negative-4)',
  [-3]: 'var(--heatmap-fill-negative-3)',
  [-2]: 'var(--heatmap-fill-negative-2)',
  [-1]: 'var(--heatmap-fill-negative-1)',
  0: 'var(--heatmap-fill-0)',
  1: 'var(--heatmap-fill-positive-1)',
  2: 'var(--heatmap-fill-positive-2)',
  3: 'var(--heatmap-fill-positive-3)',
  4: 'var(--heatmap-fill-positive-4)',
  5: 'var(--heatmap-fill-positive-5)',
};

function streakFillAriaLabel(fill: StreakFill): string {
  if (fill === 0) return 'no fill';
  return `${fill > 0 ? 'positive' : 'negative'} intensity ${Math.abs(fill)} of 5`;
}

function streakHeatmapEntry(datum: StreakDatum): HeatmapEntry {
  const dateKey = datum.date;
  const periodLabel = datum.label ?? formatStreakDayLabel(dateKey);
  const valueLabel =
    datum.value ?? (datum.label != null ? 'No streak days logged' : 'No selection logged');
  const fill = streakFillValue(datum);

  return [
    dateKey,
    {
      label: periodLabel,
      value: datum.value ?? '—',
      ariaLabel: `${periodLabel}: ${valueLabel}, ${streakFillAriaLabel(fill)}`,
      color: STREAK_FILL_COLOR_BY_VALUE[fill],
      outline: datum.outline,
      dimmed: datum.dimmed,
    },
  ];
}

type StreakProps = {
  streak: StreakGraphData;
};

/** One dot per period in the streak window; hover shows the logged option (or empty). */
export function Streak({ streak }: StreakProps) {
  const heatmapEntries = useMemo(
    () => streak.data.map((row) => row.map((datum) => streakHeatmapEntry(datum))),
    [streak.data],
  );

  if (streak.data.every((row) => row.length === 0)) return null;

  return <Heatmap entries={heatmapEntries} className="habit-module-streak__heatmap" />;
}
