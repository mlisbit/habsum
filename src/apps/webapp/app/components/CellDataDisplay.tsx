import type { Habit } from '~/api.client';
import { isEmpty } from '~/utils/habit-helpers';

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

/** 0–1 fill for bottom-to-top bar in calendar cell. */
function habitFillRatio(habit: Habit): number {
  if (habit.type === 'single_select') {
    return habit.details.value != null && habit.details.value !== '' ? 1 : 0;
  }
  const goal = habit.details.goal ?? 0;
  const total = habit.details.total ?? 0;
  if (goal > 0) {
    return clamp(total / goal, 0, 1);
  }
  return total > 0 ? 1 : 0;
}

/** Calendar day cell: vertical progress bar(s), bottom to top. Not shown before `rangeStart` or after `rangeEnd`. */
export function CellDataDisplay({
  habits,
  date,
  rangeStart,
  rangeEnd,
}: {
  habits: Habit[];
  date: string;
  rangeStart: string;
  rangeEnd: string;
}) {
  if (date > rangeEnd || date < rangeStart) return null;
  if (habits.every(isEmpty)) {
    return <div className="cell-data-display cell-data-display--empty" aria-hidden></div>;
  }
  return (
    <div className="cell-data-display" aria-hidden>
      {habits.map((habit) => (
        <div key={habit.name} className="cell-data-display__track">
          <div
            className="cell-data-display__fill"
            style={{ height: `${habitFillRatio(habit) * 100}%` }}
          />
        </div>
      ))}
    </div>
  );
}
