import { useRef, useState } from 'react';
import { Link } from '@remix-run/react';
import type { HabitRowSummation } from '@habsum/api-types';
import { habitIdPathSegment } from '~/utils/habit-id';
import { Button } from '~/components/Button';
import { HistoryDisplay } from '~/components/HistoryDisplay';
import { ProgressBar } from '~/components/ProgressBar';

type SummationWidgetProps = {
  user: string;
  habit: HabitRowSummation;
  onAddAmount: (delta: number) => Promise<void>;
};

function summationIsComplete(habit: HabitRowSummation): boolean {
  const { total, goal } = habit;
  if (goal != null && goal > 0) return total >= goal;
  return total > 0;
}

export function SummationWidget({ user, habit, onAddAmount }: SummationWidgetProps) {
  const total = habit.total;
  const goal = habit.goal;
  const isComplete = summationIsComplete(habit);
  const addAmountRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const idSeg = habitIdPathSegment(habit.name);
  const to = `/users/${encodeURIComponent(user)}/habits/${encodeURIComponent(idSeg)}${
    typeof window !== 'undefined' ? window.location.search : ''
  }`;

  const submitAdd = async () => {
    const rawValue = addAmountRef.current?.value ?? '1';
    const delta = Number(rawValue);
    if (!Number.isFinite(delta)) return;

    setPending(true);
    setError(null);
    try {
      await onAddAmount(delta);
      if (addAmountRef.current) {
        addAmountRef.current.value = '1';
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setPending(false);
    }
  };

  return (
    <div
      className={['card', 'habit-summation', isComplete ? 'habit-widget--complete' : '']
        .filter(Boolean)
        .join(' ')}
    >
      <div className="row">
        <div>
          <h2>
            <Link className="habit-widget__title" to={to}>
              {habit.name}
            </Link>
          </h2>
          {goal == null ? <div className="muted">{total}</div> : null}
        </div>
        <div className="habit-summation__add">
          <input
            ref={addAmountRef}
            type="number"
            className="number-input"
            defaultValue="1"
            disabled={pending}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                void submitAdd();
              }
            }}
            aria-label={`Amount to add to ${habit.name}`}
          />
          <Button
            type="primary"
            icon="plus"
            circle
            text=""
            onClick={() => void submitAdd()}
            disabled={pending}
            aria-label={`Add amount to ${habit.name}`}
          />
        </div>
      </div>
      {error ? <p className="warn habit-summation__error">{error}</p> : null}
      {goal != null ? (
        <ProgressBar value={total} max={goal} aria-label={`${habit.name}: ${total} of ${goal}`} />
      ) : null}
      <HistoryDisplay history={habit.history} />
    </div>
  );
}
