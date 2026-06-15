// exclusive-bem-block: habit-module-progress
import type { HabitWidgetProgressBody } from '@habsum/types/common/habit';
import { ProgressBar } from '@habsum/ui/components/ProgressBar';

type ProgressProps = {
  habitName: string;
  body: HabitWidgetProgressBody;
};

export function Progress({ habitName, body }: ProgressProps) {
  return (
    <div className="habit-module-progress">
      <ProgressBar
        value={body.value ?? 0}
        max={body.max}
        aria-label={`${habitName}: ${body.value ?? 0} of ${body.max}`}
      />
    </div>
  );
}
