// exclusive-bem-block: habit-module-renderer
import type {
  Habit,
  HabitRowSummation,
  HabitWidget,
  HabitWidgetBody,
  HabitWidgetBarGraphBody,
  HabitWidgetPill,
  HabitWidgetProgressBody,
} from '@habsum/types/common/habit';
import type { Day } from '@habsum/types/common/day';
import type { ReactNode } from 'react';
import { BarGraph } from '~/components/graphs/BarGraph';
import { Events } from '~/components/widgets/modules/Events';
import { Streak } from '~/components/widgets/modules/Streak';
import { ProgressBar } from '@habsum/ui/components/ProgressBar';
import { Hoverable } from '@habsum/ui/components/Hoverable';

type HabitModuleRendererProps = {
  habit: Habit;
  viewDate: Day;
  onDeleteSummationEvent?: (eventId: number) => Promise<void>;
};

function WidgetPills({ pills }: { pills: HabitWidgetPill[] | undefined }) {
  if (pills == null || pills.length === 0) return null;

  return (
    <div className="habit-module-renderer__widget-pills">
      {pills.map((pill) =>
        pill.hover ? (
          <Hoverable.Root key={`${pill.label}-${pill.hover}`}>
            <Hoverable.Anchor className="habit-module-renderer__widget-pill text-b-s text--hoverable">
              {pill.label}
            </Hoverable.Anchor>
            <Hoverable.Content className="habit-module-renderer__widget-pill-tooltip" side="top">
              <span className="text-b-m">{pill.hover}</span>
            </Hoverable.Content>
          </Hoverable.Root>
        ) : (
          <span key={pill.label} className="habit-module-renderer__widget-pill text-b-s">
            {pill.label}
          </span>
        ),
      )}
    </div>
  );
}

function WidgetTitleValue({ widget }: { widget: HabitWidget }) {
  if (!widget.titleValue) return null;

  if (!widget.titleValueHoverText) {
    return <span className="habit-module-renderer__widget-title-value">{widget.titleValue}</span>;
  }

  return (
    <Hoverable.Root>
      <Hoverable.Anchor className="habit-module-renderer__widget-title-value text--hoverable">
        {widget.titleValue}
      </Hoverable.Anchor>
      <Hoverable.Content className="habit-module-renderer__widget-title-value-tooltip" side="top">
        <span className="text-b-m">{widget.titleValueHoverText}</span>
      </Hoverable.Content>
    </Hoverable.Root>
  );
}

function WidgetBarGraph({ body }: { body: HabitWidgetBarGraphBody }) {
  if (Object.keys(body.data).length === 0) return null;

  return (
    <div className="habit-module-renderer__history-graph">
      <BarGraph data={body.data} lines={body.lines} />
    </div>
  );
}

function SummationProgress({
  habit,
  body,
}: {
  habit: HabitRowSummation;
  body: HabitWidgetProgressBody;
}) {
  return (
    <ProgressBar
      value={body.value ?? 0}
      max={body.max}
      aria-label={`${habit.name}: ${body.value ?? 0} of ${body.max}`}
    />
  );
}

function renderHabitWidgetBody(habit: Habit, body: HabitWidgetBody): ReactNode {
  switch (body.kind) {
    case 'pills':
      return <WidgetPills pills={body.pills} />;
    case 'progress':
      return habit.type === 'summation' ? <SummationProgress habit={habit} body={body} /> : null;
    case 'barGraph':
      return <WidgetBarGraph body={body} />;
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
      className="habit-module-renderer__widget"
      role="listitem"
      aria-label={widget.titleValue ? `${widget.title}, ${widget.titleValue}` : widget.title}
    >
      <div className="habit-module-renderer__widget-header text-light text-b-m">
        <span className="habit-module-renderer__widget-title">{widget.title}</span>
        <WidgetTitleValue widget={widget} />
      </div>
      {body.length > 0 ? (
        <div className="habit-module-renderer__widget-body">
          {body.map(({ key, node }) => (
            <div key={key} className="habit-module-renderer__widget-body-item">
              {node}
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}

export default function HabitModuleRenderer({
  habit,
  viewDate,
  onDeleteSummationEvent,
}: HabitModuleRendererProps) {
  const widgets = habit.widgets ?? [];

  return (
    <div className="habit-module-renderer">
      {habit.type === 'summation' ? (
        <Events
          habitName={habit.name}
          dayKey={viewDate}
          events={habit.events}
          onDeleteSummationEvent={(eventId) =>
            onDeleteSummationEvent?.(eventId) ?? Promise.resolve()
          }
        />
      ) : null}
      {widgets.length > 0 ? (
        <div className="habit-module-renderer__widgets" role="list">
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
