import { useState } from 'react';
import { Link } from '@remix-run/react';
import type { HabitRowSummation } from '@habsum/api-types/common/habit';
import { habitDetailUrl } from '~/utils/habit-id';
import { History } from '~/components/widgets/modules/History';
import { Events } from '~/components/widgets/modules/Events';
import { InfoText } from '~/core-components/InfoText';
import { ProgressBar } from '~/core-components/ProgressBar';
import { CountControl } from '~/components/CountControl';

type SummationWidgetProps = {
  user: string;
  habit: HabitRowSummation;
  /** `YYYY-MM-DD` for this habit row (same as habits API `date`). */
  dayKey: string;
  onAddAmount: (delta: number) => Promise<void>;
  onClearTotal: () => Promise<void>;
  /** Amount added or subtracted per tap on + / −; manual entry is unchanged. */
  interval?: number;
  /** Removes one logged summation event (modal row action). */
  onDeleteSummationEvent: (eventId: number) => Promise<void>;
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
  dayKey,
  onAddAmount,
  onClearTotal,
  onDeleteSummationEvent,
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
      <Events
        habitName={habit.name}
        dayKey={dayKey}
        events={habit.events}
        onDeleteSummationEvent={(eventId) => runOp(() => onDeleteSummationEvent(eventId))}
      />
      <History history={habit.history} />
    </div>
  );
}
