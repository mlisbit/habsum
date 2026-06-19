// exclusive-bem-block: habit-module-streak
import { useMemo } from 'react';
import type { Day } from '@habsum/types/common/day';
import type { StreakDatum, StreakGraphData } from '@habsum/types/common/streak';
import { Heatmap, type HeatmapEntry } from '@habsum/ui/components/graphs/Heatmap';

function formatStreakDayLabel(dateKey: Day): string {
  const [ys, ms, ds] = dateKey.split('-');
  const y = Number(ys);
  const m = Number(ms);
  const d = Number(ds);
  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return dateKey;
  const dt = new Date(y, m - 1, d);
  if (Number.isNaN(dt.getTime())) return dateKey;
  return dt.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}

function streakFillValue(datum: StreakDatum): number {
  const value = Number.isFinite(datum.fill) ? Math.trunc(datum.fill) : 0;
  const fill = Math.max(0, Math.min(10, value));
  return fill === 0 && datum.value != null ? 1 : fill;
}

const STREAK_FILL_COLOR_BY_VALUE = [
  'var(--heatmap-fill-0)',
  'var(--heatmap-fill-1)',
  'var(--heatmap-fill-2)',
  'var(--heatmap-fill-3)',
  'var(--heatmap-fill-4)',
  'var(--heatmap-fill-5)',
  'var(--heatmap-fill-6)',
  'var(--heatmap-fill-7)',
  'var(--heatmap-fill-8)',
  'var(--heatmap-fill-9)',
  'var(--heatmap-fill-10)',
] as const;

function streakHeatmapEntry(dateKey: Day, datum: StreakDatum): HeatmapEntry {
  const periodLabel = datum.label ?? formatStreakDayLabel(dateKey);
  const valueLabel =
    datum.value ?? (datum.label != null ? 'No streak days logged' : 'No selection logged');
  const fill = streakFillValue(datum);

  return [
    dateKey,
    {
      label: periodLabel,
      value: datum.value ?? '—',
      ariaLabel: `${periodLabel}: ${valueLabel}, fill ${fill} of 10`,
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
  const entries = useMemo(
    () =>
      (Object.entries(streak.data) as [Day, StreakDatum][]).sort(([a], [b]) => a.localeCompare(b)),
    [streak.data],
  );
  const heatmapEntries = useMemo(
    () => entries.map(([dateKey, datum]) => streakHeatmapEntry(dateKey, datum)),
    [entries],
  );

  if (entries.length === 0) return null;

  return <Heatmap entries={heatmapEntries} className="habit-module-streak__heatmap" />;
}
