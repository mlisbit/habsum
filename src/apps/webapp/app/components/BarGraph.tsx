// exclusive-bem-block: bar-graph
import { Hoverable } from '~/core-components/Hoverable';

export type BarGraphDatum = {
  value: number;
  /** Scale maximum; bar height is `value / top`. */
  top: number;
  /** Shown in the hover panel (e.g. localized time range for this bucket). */
  hoverLabel: string;
  /** When set, the track uses `bar-graph__track--negative` (e.g. deficit with no column to absorb into on the left). */
  trackModifier?: 'negative';
};

export type BarGraphData = Record<string, BarGraphDatum>;

type BarGraphProps = {
  data: BarGraphData;
  /** Fired when the pointer enters a bar (`value` is the datum’s summed amount for that bucket). */
  onHover?: (detail: { key: string; value: number }) => void;
};

function barHeightPercent(value: number, top: number): number {
  if (top <= 0) return 0;
  return Math.max(0, Math.min(100, (value / top) * 100));
}

export function BarGraph({ data, onHover }: BarGraphProps) {
  const entries = Object.entries(data);
  if (entries.length === 0) return null;

  return (
    <div className="bar-graph" role="presentation">
      {entries.map(([key, { value, top, hoverLabel, trackModifier }]) => (
        <Hoverable.Root key={key}>
          <Hoverable.Anchor
            className={[
              'bar-graph__track',
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
              <span className="bar-graph__hover-value text-h-m">{value}</span>
            </div>
          </Hoverable.Content>
        </Hoverable.Root>
      ))}
    </div>
  );
}
