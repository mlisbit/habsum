// exclusive-bem-block: habit-module-renderer
import type { BarGraphData } from '@habsum/types/common/bar-chart';
import type { Habit, HabitRowSummation } from '@habsum/types/common/habit';
import type { Day } from '@habsum/types/common/day';
import { BarGraph } from '~/components/BarGraph';
import { Events } from '~/components/widgets/modules/Events';
import { Streak } from '~/components/widgets/modules/Streak';
import { ProgressBar } from '@habsum/ui/components/ProgressBar';

type HabitModuleRendererProps = {
  habit: Habit;
  viewDate: Day;
  onDeleteSummationEvent?: (eventId: number) => Promise<void>;
};

function historyAverage(graphData: BarGraphData): number | null {
  const nums = Object.values(graphData)
    .map((b) => b.value)
    .filter((v): v is number => v != null);

  return nums.length === 0 ? null : Math.round(nums.reduce((a, b) => a + b, 0) / nums.length);
}

function HabitHistory({ habit }: { habit: Habit }) {
  const historyGraphData = habit.history?.data.user.graphData;
  if (historyGraphData == null || Object.keys(historyGraphData).length === 0) return null;

  const goal = habit.goal;
  const historyAvg = historyAverage(historyGraphData);

  return (
    <div className="habit-module-renderer__history">
      <div className="text-light text-b-m habit-module-renderer__meta-row">
        <span>History</span>
        <span>avg {historyAvg == null ? '—' : historyAvg}</span>
      </div>
      <div className="habit-module-renderer__history-graph">
        <BarGraph
          data={historyGraphData}
          lines={
            goal != null && goal > 0 ? [{ value: goal, label: `your set goal ${goal}` }] : undefined
          }
          noDataHoverLabel="No data for this day"
        />
      </div>
    </div>
  );
}

function SummationProgress({ habit }: { habit: HabitRowSummation }) {
  const goal = habit.goal;
  if (goal == null) return null;

  const total = habit.total;

  return (
    <>
      <div className="text-light text-b-m habit-module-renderer__meta-row">
        <span>Progress</span>
        <span>
          {total == null ? '—' : total} of {goal}
        </span>
      </div>
      <ProgressBar
        value={total ?? 0}
        max={goal}
        aria-label={`${habit.name}: ${total ?? 0} of ${goal}`}
      />
    </>
  );
}

export default function HabitModuleRenderer({
  habit,
  viewDate,
  onDeleteSummationEvent,
}: HabitModuleRendererProps) {
  return (
    <div className="habit-module-renderer">
      {habit.type === 'summation' ? (
        <>
          <SummationProgress habit={habit} />
          <Events
            habitName={habit.name}
            dayKey={viewDate}
            events={habit.events}
            onDeleteSummationEvent={(eventId) =>
              onDeleteSummationEvent?.(eventId) ?? Promise.resolve()
            }
          />
        </>
      ) : null}
      <HabitHistory habit={habit} />
      {habit.streak ? <Streak streak={habit.streak} viewDate={viewDate} /> : null}
    </div>
  );
}
