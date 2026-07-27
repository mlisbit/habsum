import type { Habit } from '~/api.client';
import { ProgressBar } from '@habsum/ui/components/ProgressBar';

function summationEventCountLabel(habit: Extract<Habit, { type: 'summation' }>): string | null {
  if (habit.details.events == null || habit.details.events.length === 0) return null;
  const n = habit.details.events.length;
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
                {h.details.value ?? '—'}
                {h.details.options.length > 0 ? (
                  <span> · {h.details.options.join(', ')}</span>
                ) : null}
              </div>
            </div>
          );
        }
        if (h.type === 'text') {
          return (
            <div key={h.name} className="cell-hover-display__habit">
              <strong>{h.name}</strong>
              <div className="text-light text-b-m">{h.details.text ?? '—'}</div>
            </div>
          );
        }

        const eventLabel = summationEventCountLabel(h);
        return (
          <div key={h.name} className="cell-hover-display__habit">
            <strong>{h.name}</strong>
            {h.details.goal != null && h.details.goal > 0 ? (
              <ProgressBar
                className="cell-hover-display__progress"
                value={h.details.total ?? 0}
                max={h.details.goal}
                aria-label={`${h.name}: ${h.details.total ?? 0} of ${h.details.goal}${
                  eventLabel != null ? `, ${eventLabel}` : ''
                }`}
              />
            ) : (
              <div className="text-light text-b-m">
                {h.details.total == null ? '—' : h.details.total}
                {h.details.goal != null ? ` / ${h.details.goal}` : ''}
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
