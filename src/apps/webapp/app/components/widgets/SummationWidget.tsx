import { useState } from 'react';
import { Link } from '@remix-run/react';
import type { HabitRowSummation } from '@habsum/api-types';
import { habitIdPathSegment } from '~/utils/habit-id';
import { HistoryDisplay } from '~/components/HistoryDisplay';
import { ProgressBar } from '~/core-components/ProgressBar';
import { CountControl } from '~/components/CountControl';

type SummationWidgetProps = {
  user: string;
  habit: HabitRowSummation;
  onAddAmount: (delta: number) => Promise<void>;
  onClearTotal: () => Promise<void>;
  /** Amount added or subtracted per tap on + / −; manual entry is unchanged. */
  interval?: number;
  /** Extra root class(es), e.g. page layout hooks (`habits-page__tile`). */
  surfaceClassName?: string;
};

function summationIsComplete(habit: HabitRowSummation): boolean {
  const total = habit.total ?? 0;
  const { goal } = habit;
  if (goal != null && goal > 0) return total >= goal;
  return total > 0;
}

export function SummationWidget({
  user,
  habit,
  onAddAmount,
  onClearTotal,
  interval = 1,
  surfaceClassName,
}: SummationWidgetProps) {
  const total = habit.total;
  const goal = habit.goal;
  const isComplete = summationIsComplete(habit);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const idSeg = habitIdPathSegment(habit.name);
  const to = `/users/${encodeURIComponent(user)}/habits/${encodeURIComponent(idSeg)}${
    typeof window !== 'undefined' ? window.location.search : ''
  }`;

  const runOp = async (fn: () => Promise<void>) => {
    setPending(true);
    setError(null);
    try {
      await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setPending(false);
    }
  };

  return (
    <div
      className={[
        'card',
        'habit-summation',
        surfaceClassName,
        isComplete ? 'habit-widget--complete' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <div className="row">
        <div>
          <h2 className="text-h-l">
            <Link className="habit-widget__title text-h-l" to={to}>
              {habit.name}
            </Link>
          </h2>
          {goal == null ? (
            <div className="text-light text-b-m">{total == null ? '—' : total}</div>
          ) : null}
        </div>
        <CountControl
          interval={interval}
          displayTotal={total}
          habitName={habit.name}
          pending={pending}
          onAddDelta={(delta) => runOp(() => onAddAmount(delta))}
          onClearTotal={() => runOp(() => onClearTotal())}
        />
      </div>
      {error ? <p className="warn text-b-s habit-summation__error">{error}</p> : null}
      {goal != null ? (
        <ProgressBar
          value={total ?? 0}
          max={goal}
          aria-label={`${habit.name}: ${total ?? 0} of ${goal}`}
        />
      ) : null}
      <HistoryDisplay history={habit.history} />
    </div>
  );
}
