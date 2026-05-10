import type { Habit } from '~/api.client';
import { ProgressBar } from '~/core-components/ProgressBar';

/** Hoverable panel body for a habit-history calendar day. */
export function CellHoverDisplay({ habits }: { habits: Habit[] }) {
  return (
    <div className="cell-hover-display">
      {habits.map((h) => (
        <div key={h.name} className="cell-hover-display__habit">
          {h.type === 'summation' ? (
            <>
              <strong>{h.name}</strong>
              {h.goal != null && h.goal > 0 ? (
                <ProgressBar
                  className="cell-hover-display__progress"
                  value={h.total ?? 0}
                  max={h.goal}
                  aria-label={`${h.name}: ${h.total ?? 0} of ${h.goal}`}
                />
              ) : (
                <div className="text-light text-b-m">
                  {h.total == null ? '—' : h.total}
                  {h.goal != null ? ` / ${h.goal}` : ''}
                </div>
              )}
            </>
          ) : (
            <>
              <strong>{h.name}</strong>
              <div className="text-light text-b-m">
                {h.value ?? '—'}
                {h.options.length > 0 ? <span> · {h.options.join(', ')}</span> : null}
              </div>
            </>
          )}
        </div>
      ))}
    </div>
  );
}
