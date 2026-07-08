// exclusive-bem-block: heatmap
import { useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import { Hoverable } from '@habsum/ui/components/Hoverable';
import { classBuilder } from '@habsum/utils/class-builder';

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
  entries: HeatmapEntry[][];
  className?: string;
};

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

function HeatmapSpacer({ index }: { index: number }) {
  return <span key={`spacer-${index}`} className="heatmap__spacer" aria-hidden />;
}

/** Responsive heatmap grid; entries are rendered as the row arrays supplied by the caller. */
export function Heatmap({ entries, className }: HeatmapProps) {
  const rowRef = useRef<HTMLDivElement | null>(null);
  const [cellsPerMeasuredRow, setCellsPerMeasuredRow] = useState(INITIAL_CELLS_PER_ROW);
  const visibleRows = entries.map((row) => row.slice(-cellsPerMeasuredRow));
  const visibleCellCount = Math.max(0, ...visibleRows.map((row) => row.length));
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
  }, [entries]);

  if (entries.every((row) => row.length === 0)) return null;

  return (
    <div ref={rowRef} className={rootClassName} role="list">
      {visibleRows.map((row, rowIndex) => (
        <div key={rowIndex} className="heatmap__row">
          {row.map(([key, datum]) => (
            <HeatmapCell key={key} datum={datum} />
          ))}
          {Array.from({ length: visibleCellCount - row.length }, (_, index) => (
            <HeatmapSpacer key={`spacer-${index}`} index={index} />
          ))}
        </div>
      ))}
    </div>
  );
}
