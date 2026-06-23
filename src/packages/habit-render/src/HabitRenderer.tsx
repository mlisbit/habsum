// exclusive-bem-block: habit
import { useCallback, useState, type ComponentType, type ReactNode } from 'react';
import type { Habit } from '@habsum/types/common/habit';
import type { Day } from '@habsum/types/common/day';
import type { HabitPatch } from '@habsum/types/api-responses/habit-patch';
import HabitHeaderAndActionRenderer from './_private/HabitHeaderAndActionRenderer';
import HabitWidgetRenderer from './_private/HabitWidgetRenderer';
import { useToast } from '@habsum/ui/contexts/toast';
import { classBuilder } from '@habsum/utils';

type HabitRendererProps = {
  user: string;
  /** Selected calendar day for this widget. */
  viewDate: Day;
  habit: Habit;
  onUpdate: (patch: HabitPatch) => Promise<void>;
  currentSearch?: string;
  LinkComponent?: ComponentType<{ to: string; className?: string; children: ReactNode }>;
  onNavigate?: (url: string) => void;
  demo?: boolean;
  className?: string;
  widgetsClassName?: string;
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
  const {
    user,
    habit,
    viewDate,
    onUpdate,
    currentSearch,
    LinkComponent,
    onNavigate,
    demo,
    className,
    widgetsClassName,
  } = props;
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
    <div
      className={classBuilder(
        {
          'habit--demo': demo,
        },
        ['card card--no-padding habit', className].filter(Boolean).join(' '),
      )}
    >
      <HabitHeaderAndActionRenderer
        user={user}
        habit={habit}
        pending={pending}
        currentSearch={currentSearch}
        LinkComponent={LinkComponent}
        onNavigate={onNavigate}
        demo={demo}
        className="habit__header"
        onUpdate={updateHabit}
      />
      <HabitWidgetRenderer
        habit={habit}
        viewDate={viewDate}
        className={['habit__widgets', widgetsClassName].filter(Boolean).join(' ')}
        onDeleteSummationEvent={(eventId) =>
          updateHabit({ habit: habit.name, action: 'delete_event', eventId })
        }
      />
    </div>
  );
}
