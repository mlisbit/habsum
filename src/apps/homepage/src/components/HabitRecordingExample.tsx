import { useCallback, useState } from 'react';
import HabitRenderer from '@habsum/habit-render';
import type { HabitPatch } from '@habsum/types/api-responses/habit-patch';
import { dayFromString } from '@habsum/types/common/day';
import type { Habit } from '@habsum/types/common/habit';

const EXAMPLE_DATE = dayFromString('2026-10-04');

export default function HabitRecordingExample({ initialHabit }: { initialHabit: Habit }) {
  const [habit, setHabit] = useState(initialHabit);
  const updateHabit = useCallback(async (patch: HabitPatch) => {
    setHabit((current) => {
      if (patch.habit !== current.name) return current;
      const clear = 'action' in patch && patch.action === 'clear';

      switch (current.type) {
        case 'summation':
          return clear || 'total' in patch
            ? {
                ...current,
                details: {
                  ...current.details,
                  total: 'total' in patch ? (current.details.total ?? 0) + patch.total : null,
                },
              }
            : current;
        case 'single_select':
          return clear || 'value' in patch
            ? {
                ...current,
                details: { ...current.details, value: 'value' in patch ? patch.value : null },
              }
            : current;
        case 'text':
          return clear || 'text' in patch
            ? { ...current, details: { text: 'text' in patch ? patch.text : null } }
            : current;
      }
    });
  }, []);

  const previewHabit: Habit =
    habit.type === 'summation' && habit.details.goal != null
      ? {
          ...habit,
          widgets: [
            {
              title: 'Goal',
              titleValue: `${habit.details.total ?? 0} / ${habit.details.goal}`,
              body: [{ kind: 'progress', value: habit.details.total, max: habit.details.goal }],
            },
          ],
        }
      : habit;

  return (
    <HabitRenderer
      user="_homepage"
      viewDate={EXAMPLE_DATE}
      habit={previewHabit}
      onUpdate={updateHabit}
      demo
    />
  );
}
