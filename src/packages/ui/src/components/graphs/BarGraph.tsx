// exclusive-bem-block: bar-graph
import type { BarGraphData } from '@habsum/types/common/bar-chart';
import { Hoverable } from '@habsum/ui/components/Hoverable';
import { classBuilder } from '@habsum/utils/class-builder';

export type BarGraphLine = {
  value: number;
  label: string;
};

type BarGraphProps = {
  data: BarGraphData;
  /** Fired when the pointer enters a bar (`value` is the datum total for that bucket, or `null` when empty). */
  onHover?: (detail: { key: string; value: number | null }) => void;
  /**
   * Horizontal reference lines at the given values (same scale as the bars).
   * Each line is shown only when at least one bar total exceeds its value.
   */
  lines?: BarGraphLine[];
};

const DEFAULT_NO_DATA_HOVER = 'No data';

/** Shared Y-axis maximum: API `top` on each datum (includes goal for history), plus logged values. */
export function graphScaleTop(values: number[], datumTops: number[] = []): number {
  const candidates = [1, ...values, ...datumTops];
  return Math.max(...candidates);
}

function barHeightPercent(value: number | null, scaleTop: number): number {
  if (value == null || scaleTop <= 0) return 0;
  return Math.max(0, Math.min(100, (value / scaleTop) * 100));
}

export function BarGraph({ data, onHover, lines = [] }: BarGraphProps) {
  const entries = Object.entries(data);
  if (entries.length === 0) return null;

  const values = entries.map(([, d]) => d.value).filter((v): v is number => v != null);
  const datumTops = entries.map(([, d]) => d.top);
  const scaleTop = graphScaleTop(values, datumTops);
  const visibleLines = lines.filter((line) => line.value > 0 && values.some((v) => v > line.value));

  return (
    <div className="bar-graph" role="presentation">
      <div className="bar-graph__wrap">
        {entries.map(([key, { value, hoverLabel, outline, dimmed, trackModifier }]) => {
          const trackClassName = classBuilder(
            {
              'bar-graph__track--negative': trackModifier === 'negative',
              'bar-graph__track--outlined': outline,
              'bar-graph__track--dimmed': dimmed,
            },
            'bar-graph__track',
          );

          return (
            <Hoverable.Root key={key}>
              <Hoverable.Anchor
                className={trackClassName}
                onMouseEnter={() => onHover?.({ key, value })}
              >
                <div
                  className="bar-graph__fill"
                  style={{ height: `${barHeightPercent(value, scaleTop)}%` }}
                />
              </Hoverable.Anchor>
              <Hoverable.Content className="bar-graph__hover" side="top">
                <div className="bar-graph__hover-body">
                  <span className="bar-graph__hover-range">{hoverLabel}</span>
                  <span className="bar-graph__hover-value text-h-m">
                    {value == null ? DEFAULT_NO_DATA_HOVER : value}
                  </span>
                </div>
              </Hoverable.Content>
            </Hoverable.Root>
          );
        })}
        {visibleLines.length > 0 ? (
          <div className="bar-graph__lines-layer">
            {visibleLines.map((line) => (
              <div
                key={`${line.value}-${line.label}`}
                className="bar-graph__line"
                style={{ height: `${barHeightPercent(line.value, scaleTop)}%` }}
              >
                <Hoverable.Root>
                  <Hoverable.Anchor className="bar-graph__line-dot" />
                  <Hoverable.Content className="bar-graph__hover" side="top">
                    <span className="text-b-m">{line.label}</span>
                  </Hoverable.Content>
                </Hoverable.Root>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
