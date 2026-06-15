// exclusive-bem-block: habit
import { useCallback, useState } from 'react';
import type { Habit } from '@habsum/types/common/habit';
import type { Day } from '@habsum/types/common/day';
import type { HabitPatch } from '~/api.client';
import HabitHeaderAndActionRenderer from '~/components/habit-renderer/_private/HabitHeaderAndActionRenderer';
import HabitWidgetRenderer from '~/components/habit-renderer/_private/HabitWidgetRenderer';
import { useToast } from '@habsum/ui/contexts/toast';

type HabitRendererProps = {
  user: string;
  /** Selected calendar day for this widget. */
  viewDate: Day;
  habit: Habit;
  onUpdate: (patch: HabitPatch) => Promise<void>;
};

function usePendingOp({ onError }: { onError: (message: string) => void }) {
  const [pending, setPending] = useState(false);

  const runOp = useCallback(
    async (fn: () => Promise<void>) => {
      setPending(true);
      try {
        await fn();
      } catch (e) {
        onError(e instanceof Error ? e.message : String(e));
      } finally {
        setPending(false);
      }
    },
    [onError],
  );

  return { pending, runOp };
}

export default function HabitRenderer(props: HabitRendererProps) {
  const { user, habit, viewDate, onUpdate } = props;
  const { showToast } = useToast();
  const showUpdateError = useCallback(
    (message: string) => {
      showToast({ type: 'error', message });
    },
    [showToast],
  );
  const { pending, runOp } = usePendingOp({ onError: showUpdateError });
  const updateHabit = useCallback(
    (patch: HabitPatch) => runOp(() => onUpdate(patch)),
    [onUpdate, runOp],
  );

  return (
    <div className="card habit">
      <HabitHeaderAndActionRenderer
        user={user}
        habit={habit}
        pending={pending}
        onUpdate={updateHabit}
      />
      <HabitWidgetRenderer
        habit={habit}
        viewDate={viewDate}
        onDeleteSummationEvent={(eventId) =>
          updateHabit({ habit: habit.name, action: 'delete_event', eventId })
        }
      />
    </div>
  );
}
