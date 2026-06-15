// exclusive-bem-block: heatmap
import { useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import { Hoverable } from '@habsum/ui/components/Hoverable';
import { classBuilder } from '~/utils/class-builder';

export type HeatmapDatum = {
  label: string;
  value: string | number;
  ariaLabel: string;
  color: string;
  outline?: boolean;
  dimmed?: boolean;
};

export type HeatmapEntry = readonly [string, HeatmapDatum];

type HeatmapProps = {
  entries: HeatmapEntry[];
  className?: string;
  rows?: number;
};

const DEFAULT_HEATMAP_ROWS = 3;
const INITIAL_CELLS_PER_ROW = 1;
const CELL_FALLBACK_WIDTH_PX = 12;

function parseCssPx(value: string): number {
  const n = Number.parseFloat(value);
  return Number.isFinite(n) ? n : 0;
}

function cellsPerRow(row: HTMLDivElement): number {
  const rowStyle = window.getComputedStyle(row);
  const gap = parseCssPx(rowStyle.columnGap || rowStyle.gap);
  const firstCell = row.querySelector<HTMLElement>('.heatmap__cell');
  const cellWidth = firstCell?.getBoundingClientRect().width ?? CELL_FALLBACK_WIDTH_PX;
  const rowWidth = row.getBoundingClientRect().width;
  return Math.max(1, Math.floor((rowWidth + gap) / (cellWidth + gap)));
}

function distributeEntriesByColumn<T>(entries: T[], rowCount: number): T[][] {
  const rows = Array.from({ length: rowCount }, () => [] as T[]);
  entries.forEach((entry, index) => {
    rows[index % rowCount]!.push(entry);
  });
  while (rows.length > 0 && rows[rows.length - 1]!.length === 0) {
    rows.pop();
  }
  return rows;
}

function normalizeRowCount(rows: number): number {
  if (!Number.isFinite(rows)) return DEFAULT_HEATMAP_ROWS;
  return Math.max(1, Math.trunc(rows));
}

function HeatmapCell({ datum }: { datum: HeatmapDatum }) {
  const cellClassName = classBuilder(
    {
      'heatmap__cell--outlined': datum.outline,
      'heatmap__cell--dimmed': datum.dimmed,
    },
    'heatmap__cell',
  );
  const cellStyle = {
    backgroundColor: datum.color,
  } satisfies CSSProperties;

  return (
    <Hoverable.Root>
      <Hoverable.Anchor
        className={cellClassName}
        role="listitem"
        aria-label={datum.ariaLabel}
        style={cellStyle}
      />
      <Hoverable.Content className="heatmap__tooltip" side="top">
        <div className="heatmap__tooltip-label text-light text-b-s">{datum.label}</div>
        <div className="text-b-m">{datum.value}</div>
      </Hoverable.Content>
    </Hoverable.Root>
  );
}

/** Responsive heatmap grid; entries are filled top-to-bottom by column. */
export function Heatmap({ entries, className, rows = DEFAULT_HEATMAP_ROWS }: HeatmapProps) {
  const rowRef = useRef<HTMLDivElement | null>(null);
  const [cellsPerMeasuredRow, setCellsPerMeasuredRow] = useState(INITIAL_CELLS_PER_ROW);
  const rowCount = normalizeRowCount(rows);
  const visibleEntries = entries.slice(-(cellsPerMeasuredRow * rowCount));
  const visibleRows = distributeEntriesByColumn(visibleEntries, rowCount);
  const rootClassName = className == null ? 'heatmap' : `heatmap ${className}`;

  useLayoutEffect(() => {
    const row = rowRef.current;
    if (!row) return undefined;

    const updateCellsPerRow = () => {
      const next = cellsPerRow(row);
      setCellsPerMeasuredRow((current) => (current === next ? current : next));
    };

    updateCellsPerRow();
    const observer = new ResizeObserver(updateCellsPerRow);
    observer.observe(row);
    return () => observer.disconnect();
  }, [entries.length]);

  if (entries.length === 0) return null;

  return (
    <div ref={rowRef} className={rootClassName} role="list">
      {visibleRows.map((row, rowIndex) => (
        <div key={rowIndex} className="heatmap__row">
          {row.map(([key, datum]) => (
            <HeatmapCell key={key} datum={datum} />
          ))}
        </div>
      ))}
    </div>
  );
}
