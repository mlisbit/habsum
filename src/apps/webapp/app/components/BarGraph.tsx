// exclusive-bem-block: bar-graph
import type { BarGraphData } from '@habsum/api-types/common/bar-chart';
import { Hoverable } from '~/core-components/Hoverable';

type BarGraphProps = {
  data: BarGraphData;
  /** Fired when the pointer enters a bar (`value` is the datum total for that bucket, or `null` when empty). */
  onHover?: (detail: { key: string; value: number | null }) => void;
  /** Shown in the hover value slot when `value` is `null`. */
  noDataHoverLabel?: string;
};

const DEFAULT_NO_DATA_HOVER = 'No data';

function barHeightPercent(value: number | null, top: number): number {
  if (value == null || top <= 0) return 0;
  return Math.max(0, Math.min(100, (value / top) * 100));
}

export function BarGraph({
  data,
  onHover,
  noDataHoverLabel = DEFAULT_NO_DATA_HOVER,
}: BarGraphProps) {
  const entries = Object.entries(data);
  if (entries.length === 0) return null;

  return (
    <div className="bar-graph" role="presentation">
      {entries.map(([key, { value, top, hoverLabel, trackModifier }]) => (
        <Hoverable.Root key={key}>
          <Hoverable.Anchor
            className={[
              'bar-graph__track',
              value == null && 'bar-graph__track--no-data',
              trackModifier === 'negative' && 'bar-graph__track--negative',
            ]
              .filter(Boolean)
              .join(' ')}
            onMouseEnter={() => onHover?.({ key, value })}
          >
            <div
              className="bar-graph__fill"
              style={{ height: `${barHeightPercent(value, top)}%` }}
            />
          </Hoverable.Anchor>
          <Hoverable.Content className="bar-graph__hover" side="top">
            <div className="bar-graph__hover-body">
              <span className="bar-graph__hover-range">{hoverLabel}</span>
              <span className="bar-graph__hover-value text-h-m">
                {value == null ? noDataHoverLabel : value}
              </span>
            </div>
          </Hoverable.Content>
        </Hoverable.Root>
      ))}
    </div>
  );
}
