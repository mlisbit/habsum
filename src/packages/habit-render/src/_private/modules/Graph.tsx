// exclusive-bem-block: habit-module-graph
import type { HabitWidgetBarGraphBody } from '@habsum/types/common/habit';
import { BarGraph } from '@habsum/ui/components/graphs/BarGraph';

type GraphProps = {
  body: HabitWidgetBarGraphBody;
};

export function Graph({ body }: GraphProps) {
  if (Object.keys(body.data).length === 0) return null;

  return (
    <div className="habit-module-graph">
      <BarGraph data={body.data} lines={body.lines} />
    </div>
  );
}
