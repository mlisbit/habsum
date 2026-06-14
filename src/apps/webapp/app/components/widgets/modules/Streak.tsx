// exclusive-bem-block: streak
import { useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import type { Day } from '@habsum/types/common/day';
import type { StreakDatum, StreakGraphData } from '@habsum/types/common/streak';
import { Hoverable } from '@habsum/ui/components/Hoverable';

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
  'var(--streak-fill-0)',
  'var(--streak-fill-1)',
  'var(--streak-fill-2)',
  'var(--streak-fill-3)',
  'var(--streak-fill-4)',
  'var(--streak-fill-5)',
  'var(--streak-fill-6)',
  'var(--streak-fill-7)',
  'var(--streak-fill-8)',
  'var(--streak-fill-9)',
  'var(--streak-fill-10)',
] as const;

const MAX_STREAK_ROWS = 3;
const INITIAL_STREAK_CELLS_PER_ROW = 1;
const STREAK_CELL_FALLBACK_WIDTH_PX = 12;

function parseCssPx(value: string): number {
  const n = Number.parseFloat(value);
  return Number.isFinite(n) ? n : 0;
}

function streakCellsPerRow(row: HTMLDivElement): number {
  const rowStyle = window.getComputedStyle(row);
  const gap = parseCssPx(rowStyle.columnGap || rowStyle.gap);
  const firstCell = row.querySelector<HTMLElement>('.streak__cell');
  const cellWidth = firstCell?.getBoundingClientRect().width ?? STREAK_CELL_FALLBACK_WIDTH_PX;
  const rowWidth = row.getBoundingClientRect().width;
  return Math.max(1, Math.floor((rowWidth + gap) / (cellWidth + gap)));
}

function distributeStreakEntriesByColumn<T>(entries: T[], rowCount: number): T[][] {
  const rows = Array.from({ length: rowCount }, () => [] as T[]);
  entries.forEach((entry, index) => {
    rows[index % rowCount]!.push(entry);
  });
  while (rows.length > 0 && rows[rows.length - 1]!.length === 0) {
    rows.pop();
  }
  return rows;
}

type StreakCellProps = {
  dateKey: Day;
  datum: StreakDatum;
};

function StreakCell({ dateKey, datum }: StreakCellProps) {
  const periodLabel = datum.label ?? formatStreakDayLabel(dateKey);
  const valueLabel =
    datum.value ?? (datum.label != null ? 'No streak days logged' : 'No selection logged');
  const fill = streakFillValue(datum);
  const cellStyle = {
    backgroundColor: STREAK_FILL_COLOR_BY_VALUE[fill],
  } satisfies CSSProperties;

  return (
    <Hoverable.Root>
      <Hoverable.Anchor
        className="streak__cell"
        role="listitem"
        aria-label={`${periodLabel}: ${valueLabel}, fill ${fill} of 10`}
        style={cellStyle}
      />
      <Hoverable.Content className="streak__tooltip" side="top">
        <div className="streak__tooltip-day text-light text-b-s">{periodLabel}</div>
        <div className="text-b-m">{datum.value ?? '—'}</div>
      </Hoverable.Content>
    </Hoverable.Root>
  );
}

type StreakProps = {
  streak: StreakGraphData;
};

type StreakMetricPillProps = {
  label: string;
  value: string;
};

function StreakMetricPill({ label, value }: StreakMetricPillProps) {
  return (
    <span className="streak__pill text-b-s">
      <span className="streak__pill-label text-bold">{label}</span>
      <span>{value}</span>
    </span>
  );
}

/** One dot per period in the streak window; hover shows the logged option (or empty). */
export function Streak({ streak }: StreakProps) {
  const entries = useMemo(
    () =>
      (Object.entries(streak.data) as [Day, StreakDatum][]).sort(([a], [b]) => a.localeCompare(b)),
    [streak.data],
  );
  const rowRef = useRef<HTMLDivElement | null>(null);
  const [cellsPerRow, setCellsPerRow] = useState(INITIAL_STREAK_CELLS_PER_ROW);
  const visibleEntries = entries.slice(-(cellsPerRow * MAX_STREAK_ROWS));
  const visibleRows = distributeStreakEntriesByColumn(visibleEntries, MAX_STREAK_ROWS);

  useLayoutEffect(() => {
    const row = rowRef.current;
    if (!row) return undefined;

    const updateCellsPerRow = () => {
      const next = streakCellsPerRow(row);
      setCellsPerRow((current) => (current === next ? current : next));
    };

    updateCellsPerRow();
    const observer = new ResizeObserver(updateCellsPerRow);
    observer.observe(row);
    return () => observer.disconnect();
  }, [entries.length]);

  if (entries.length === 0) return null;

  return (
    <section className="mt-3" aria-label={`Streak, ${streak.streakText}`}>
      <div className="text-light text-b-m streak__header">
        <span>Streak</span>
      </div>
      <div className="streak__metrics">
        <StreakMetricPill label="Current streak" value={streak.streakText} />
        {streak.longestStreak ? (
          <Hoverable.Root>
            <Hoverable.Anchor className="streak__longest" aria-label={streak.longestStreak.range}>
              <StreakMetricPill
                label={streak.longestStreak.label}
                value={streak.longestStreak.text}
              />
            </Hoverable.Anchor>
            <Hoverable.Content className="streak__tooltip" side="top">
              <div className="streak__tooltip-day text-light text-b-s">
                {streak.longestStreak.range}
              </div>
            </Hoverable.Content>
          </Hoverable.Root>
        ) : null}
      </div>
      <div ref={rowRef} className="streak__rows" role="list">
        {visibleRows.map((row, rowIndex) => (
          <div key={rowIndex} className="streak__row">
            {row.map(([dateKey, datum]) => (
              <StreakCell key={dateKey} dateKey={dateKey} datum={datum} />
            ))}
          </div>
        ))}
      </div>
    </section>
  );
}
