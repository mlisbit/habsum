// exclusive-bem-block: habit-module-pills
import type { HabitWidgetPill } from '@habsum/types/common/habit';
import { Hoverable } from '@habsum/ui/components/Hoverable';

type PillsProps = {
  pills: HabitWidgetPill[] | undefined;
};

export function Pills({ pills }: PillsProps) {
  if (pills == null || pills.length === 0) return null;

  return (
    <div className="habit-module-pills">
      {pills.map((pill) =>
        pill.hover ? (
          <Hoverable.Root key={`${pill.label}-${pill.hover}`}>
            <Hoverable.Anchor className="habit-module-pills__pill text-b-s text--hoverable">
              {pill.label}
            </Hoverable.Anchor>
            <Hoverable.Content className="habit-module-pills__pill-tooltip" side="top">
              <span className="text-b-m">{pill.hover}</span>
            </Hoverable.Content>
          </Hoverable.Root>
        ) : (
          <span key={pill.label} className="habit-module-pills__pill text-b-s">
            {pill.label}
          </span>
        ),
      )}
    </div>
  );
}
