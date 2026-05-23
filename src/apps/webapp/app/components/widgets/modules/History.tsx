// exclusive-bem-block: history-display
import type { HabitHistory } from '@habsum/types/common/habit';
import { BarGraph } from '~/components/BarGraph';

export function History({
  history,
  goal,
}: {
  history: HabitHistory | undefined;
  /** Summation goal; when set, a reference line is drawn when any day exceeds it. */
  goal?: number | null;
}) {
  if (!history) return null;

  const { graphData } = history.data.user;
  if (Object.keys(graphData).length === 0) return null;

  const nums = Object.values(graphData)
    .map((b) => b.value)
    .filter((v): v is number => v != null);
  const avg = nums.length === 0 ? null : Math.round(nums.reduce((a, b) => a + b, 0) / nums.length);

  return (
    <div className="history-display">
      <div className="text-light text-b-m history-display__meta">
        <span>History</span>
        <span>avg {avg == null ? '—' : avg}</span>
      </div>
      <div className="history-display__graph">
        <BarGraph data={graphData} goalLine={goal} noDataHoverLabel="No data for this day" />
      </div>
    </div>
  );
}
