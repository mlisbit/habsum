// exclusive-bem-block: heatmap
import useIsomorphicLayoutEffect from '../../hooks/use-isomorphic-layout-effect';
import { useRef, useState, type CSSProperties } from 'react';
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

function columnsPerRow(root: HTMLDivElement): number {
  const rootStyle = window.getComputedStyle(root);
  const gap = parseCssPx(rootStyle.columnGap || rootStyle.gap);
  const firstCell = root.querySelector<HTMLElement>('.heatmap__cell');
  const measuredCellWidth = firstCell?.getBoundingClientRect().width ?? 0;
  const cellWidth = measuredCellWidth > 0 ? measuredCellWidth : CELL_FALLBACK_WIDTH_PX;
  const rootWidth = root.getBoundingClientRect().width;
  return Math.max(1, Math.floor((rootWidth + gap) / (cellWidth + gap)));
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

/** Responsive heatmap grid; entries are rendered as chronological columns supplied by the caller. */
export function Heatmap({ entries, className }: HeatmapProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [visibleColumnCount, setVisibleColumnCount] = useState(INITIAL_CELLS_PER_ROW);
  const visibleColumns = entries.slice(-visibleColumnCount);
  const rootClassName = className == null ? 'heatmap' : `heatmap ${className}`;

  useIsomorphicLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return undefined;

    const updateVisibleColumnCount = () => {
      const next = columnsPerRow(root);
      setVisibleColumnCount((current) => (current === next ? current : next));
    };

    updateVisibleColumnCount();
    const observer = new ResizeObserver(updateVisibleColumnCount);
    observer.observe(root);
    return () => observer.disconnect();
  }, [entries]);

  if (entries.every((row) => row.length === 0)) return null;

  return (
    <div ref={rootRef} className={rootClassName} role="list">
      {visibleColumns.map((column, columnIndex) => (
        <div key={columnIndex} className="heatmap__column">
          {column.map(([key, datum]) => (
            <HeatmapCell key={key} datum={datum} />
          ))}
        </div>
      ))}
    </div>
  );
}
