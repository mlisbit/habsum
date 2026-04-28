import { useState } from 'react';
import { Link } from '@remix-run/react';
import type { HabitRowSingleSelect } from '@habsum/api-types';
import { habitIdPathSegment } from '~/utils/habit-id';
import { Button } from '~/components/Button';
import { HistoryDisplay } from '~/components/HistoryDisplay';

type SingleSelectWidgetProps = {
  user: string;
  habit: HabitRowSingleSelect;
  onSelectOption: (option: string) => Promise<void>;
};

function singleSelectIsComplete(habit: HabitRowSingleSelect): boolean {
  return habit.value != null;
}

export function SingleSelectWidget({ user, habit, onSelectOption }: SingleSelectWidgetProps) {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const isComplete = singleSelectIsComplete(habit);

  const idSeg = habitIdPathSegment(habit.name);
  const to = `/users/${encodeURIComponent(user)}/habits/${encodeURIComponent(idSeg)}${
    typeof window !== 'undefined' ? window.location.search : ''
  }`;

  return (
    <div
      className={['card', 'habit-select', isComplete ? 'habit-widget--complete' : '']
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
          <div className="muted">{habit.value ?? '—'}</div>
        </div>
        <div className="habit-select__options">
          {habit.options.map((opt) => {
            const selected = habit.value === opt;
            const dim = habit.value != null && !selected;
            return (
              <Button
                key={opt}
                type={selected ? 'primary' : 'secondary'}
                text={opt}
                disabled={pending}
                className={
                  dim ? 'habit-select__option habit-select__option--dim' : 'habit-select__option'
                }
                onClick={async () => {
                  setPending(true);
                  setError(null);
                  try {
                    await onSelectOption(opt);
                  } catch (e) {
                    setError(e instanceof Error ? e.message : String(e));
                  } finally {
                    setPending(false);
                  }
                }}
              />
            );
          })}
        </div>
      </div>
      {error ? <p className="warn habit-select__error">{error}</p> : null}
      <HistoryDisplay history={habit.history} />
    </div>
  );
}
