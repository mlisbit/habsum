import { useState } from 'react';
import { Link } from '@remix-run/react';
import type { HabitRowSummation } from '@habsum/api-types';
import { habitDetailUrl } from '~/utils/habit-id';
import { HistoryDisplay } from '~/components/HistoryDisplay';
import { InfoText } from '~/core-components/InfoText';
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

function formatEventAmount(amount: number) {
  return amount > 0 ? `+${amount}` : String(amount);
}

function formatEventTime(createdAt: string) {
  const date = new Date(`${createdAt.replace(' ', 'T')}Z`);
  if (Number.isNaN(date.getTime())) return createdAt;
  return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
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

  const to = habitDetailUrl(
    user,
    habit.name,
    typeof window !== 'undefined' ? window.location.search : '',
  );

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
        habit.summationOptions ? 'habit-summation--step-sub-on-card-hover' : '',
        surfaceClassName,
        isComplete ? 'habit-widget--complete' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <div className="habit-summation__row">
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
          summationSteps={habit.summationOptions}
          displayTotal={total}
          habitName={habit.name}
          pending={pending}
          onAddDelta={(delta) => runOp(() => onAddAmount(delta))}
          onClearTotal={() => runOp(() => onClearTotal())}
        />
      </div>
      {error ? (
        <InfoText variant="error" className="habit-summation__error">
          {error}
        </InfoText>
      ) : null}
      {goal != null ? (
        <ProgressBar
          value={total ?? 0}
          max={goal}
          aria-label={`${habit.name}: ${total ?? 0} of ${goal}`}
        />
      ) : null}
      {habit.events ? (
        <div className="habit-summation__events">
          <h3 className="text-h-m">Events</h3>
          {habit.events.length > 0 ? (
            <ul className="habit-summation__events-list">
              {habit.events.map((event) => (
                <li key={event.id} className="habit-summation__event">
                  <span className="text-h-m">{formatEventAmount(event.amount)}</span>
                  <span className="text-light text-b-m">{formatEventTime(event.createdAt)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-light text-b-m">No summation events recorded for this day.</p>
          )}
        </div>
      ) : null}
      <HistoryDisplay history={habit.history} />
    </div>
  );
}
