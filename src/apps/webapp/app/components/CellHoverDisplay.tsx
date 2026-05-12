import type { Habit } from '~/api.client';
import { ProgressBar } from '~/core-components/ProgressBar';

function summationEventCountLabel(habit: Extract<Habit, { type: 'summation' }>): string | null {
  if (habit.events == null || habit.events.length === 0) return null;
  const n = habit.events.length;
  return n === 1 ? '1 event' : `${n} event${'s'}`;
}

/** Hoverable panel body for a habit-history calendar day. */
export function CellHoverDisplay({ habits }: { habits: Habit[] }) {
  return (
    <div className="cell-hover-display">
      {habits.map((h) => {
        if (h.type === 'single_select') {
          return (
            <div key={h.name} className="cell-hover-display__habit">
              <strong>{h.name}</strong>
              <div className="text-light text-b-m">
                {h.value ?? '—'}
                {h.options.length > 0 ? <span> · {h.options.join(', ')}</span> : null}
              </div>
            </div>
          );
        }

        const eventLabel = summationEventCountLabel(h);
        return (
          <div key={h.name} className="cell-hover-display__habit">
            <strong>{h.name}</strong>
            {h.goal != null && h.goal > 0 ? (
              <ProgressBar
                className="cell-hover-display__progress"
                value={h.total ?? 0}
                max={h.goal}
                aria-label={`${h.name}: ${h.total ?? 0} of ${h.goal}${
                  eventLabel != null ? `, ${eventLabel}` : ''
                }`}
              />
            ) : (
              <div className="text-light text-b-m">
                {h.total == null ? '—' : h.total}
                {h.goal != null ? ` / ${h.goal}` : ''}
              </div>
            )}
            {eventLabel != null ? (
              <div className="text-light text-b-m cell-hover-display__event-count">
                {eventLabel}
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
