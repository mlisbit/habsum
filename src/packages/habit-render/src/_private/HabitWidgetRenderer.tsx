// exclusive-bem-block: habit-widget
import type { Habit, HabitWidget, HabitWidgetBody } from '@habsum/types/common/habit';
import type { Day } from '@habsum/types/common/day';
import type { ReactNode } from 'react';
import { Events } from './modules/Events';
import { Graph } from './modules/Graph';
import { InfoCards } from './modules/InfoCards';
import { Progress } from './modules/Progress';
import { Streak } from './modules/Streak';
import { Hoverable } from '@habsum/ui/components/Hoverable';

type HabitWidgetRendererProps = {
  habit: Habit;
  viewDate: Day;
  className?: string;
  onDeleteSummationEvent?: (eventId: number) => Promise<void>;
};

function WidgetTitleValue({ widget }: { widget: HabitWidget }) {
  if (!widget.titleValue) return null;

  if (!widget.titleValueHoverText) {
    return <span className="habit-widget__widget-title-value">{widget.titleValue}</span>;
  }

  return (
    <Hoverable.Root>
      <Hoverable.Anchor className="habit-widget__widget-title-value text--hoverable-target">
        {widget.titleValue}
      </Hoverable.Anchor>
      <Hoverable.Content className="habit-widget__widget-title-value-tooltip" side="top">
        <span className="text-b-m">{widget.titleValueHoverText}</span>
      </Hoverable.Content>
    </Hoverable.Root>
  );
}

function renderHabitWidgetBody(habit: Habit, body: HabitWidgetBody): ReactNode {
  switch (body.kind) {
    case 'insights':
      return <InfoCards cards={body.insights} />;
    case 'progress':
      return habit.type === 'summation' ? <Progress habitName={habit.name} body={body} /> : null;
    case 'barGraph':
      return <Graph body={body} />;
    case 'streakGraph':
      return <Streak streak={body.graph} />;
  }
}

function HabitWidgetItem({ habit, widget }: { habit: Habit; widget: HabitWidget }) {
  const body = widget.body
    .map((item, index) => ({
      key: `${item.kind}-${index}`,
      node: renderHabitWidgetBody(habit, item),
    }))
    .filter((item) => item.node != null);
  if (body.length === 0 && !widget.titleValue) return null;

  return (
    <section
      className="habit-widget__widget"
      role="listitem"
      aria-label={widget.titleValue ? `${widget.title}, ${widget.titleValue}` : widget.title}
    >
      <div className="habit-widget__widget-header text-light text-b-m">
        <span className="habit-widget__widget-title">{widget.title}</span>
        <WidgetTitleValue widget={widget} />
      </div>
      {body.length > 0 ? (
        <div className="habit-widget__widget-body">
          {body.map(({ key, node }) => (
            <div key={key} className="habit-widget__widget-body-item">
              {node}
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}

export default function HabitWidgetRenderer({
  habit,
  viewDate,
  className,
  onDeleteSummationEvent,
}: HabitWidgetRendererProps) {
  const widgets = habit.widgets ?? [];

  return (
    <div className={['habit-widget', className].filter(Boolean).join(' ')}>
      {habit.type === 'summation' ? (
        <Events
          habitName={habit.name}
          dayKey={viewDate}
          events={habit.details.events}
          onDeleteSummationEvent={(eventId) =>
            onDeleteSummationEvent?.(eventId) ?? Promise.resolve()
          }
        />
      ) : null}
      {widgets.length > 0 ? (
        <div className="habit-widget__widgets" role="list">
          {widgets.map((widget, index) => (
            <HabitWidgetItem
              key={`${widget.title}-${widget.titleValue ?? 'widget'}-${index}`}
              habit={habit}
              widget={widget}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
