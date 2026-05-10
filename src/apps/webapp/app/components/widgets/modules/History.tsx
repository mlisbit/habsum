import type { Habit } from '~/api.client';

export function History({ history }: { history: Habit['history'] }) {
  if (!history) return null;

  if (history.display === 'average') {
    const nums = history.data.user.filter((x): x is number => typeof x === 'number');
    const avg =
      nums.length === 0 ? null : Math.round(nums.reduce((a, b) => a + b, 0) / nums.length);

    return (
      <div className="history-display">
        <div className="text-light text-b-m history-display__meta">
          <span>History</span>
          <span>avg {avg == null ? '—' : avg}</span>
        </div>
      </div>
    );
  }

  return null;
}
