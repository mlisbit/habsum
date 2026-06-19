import type {
  HabitWidget,
  HabitWidgetBarGraphBody,
  HabitWidgetBody,
  HabitWidgetPill,
  HabitWidgetProgressBody,
  HabitWidgetStreakGraphBody,
} from '@habsum/types/common/habit';
import type { BarGraphData } from '@habsum/types/common/bar-chart';
import type { StreakGraphData } from '@habsum/types/common/streak';

type WidgetModelBuilderState = {
  title: string;
  titleValue?: string;
  titleValueHoverText?: string;
  body: HabitWidgetBody[];
};

const DEFAULT_STATE: WidgetModelBuilderState = {
  title: 'Widget',
  body: [],
};

type WidgetModelBuilder = {
  withTitle(title: string): WidgetModelBuilder;
  withTitleValue(titleValue: string | undefined): WidgetModelBuilder;
  withTitleValueHoverText(titleValueHoverText: string | undefined): WidgetModelBuilder;
  withBody(body: HabitWidgetBody[]): WidgetModelBuilder;
  withBodyItem(body: HabitWidgetBody): WidgetModelBuilder;
  withPills(pills: HabitWidgetPill[]): WidgetModelBuilder;
  withProgress(value: number | null, max: number): WidgetModelBuilder;
  withBarGraph(body: Omit<HabitWidgetBarGraphBody, 'kind'>): WidgetModelBuilder;
  withStreakGraph(graph: StreakGraphData): WidgetModelBuilder;
  model(): HabitWidget;
};

function builder(state: WidgetModelBuilderState): WidgetModelBuilder {
  const next = (patch: Partial<WidgetModelBuilderState>) => builder({ ...state, ...patch });
  const withBodyItem = (body: HabitWidgetBody) => next({ body: [...state.body, body] });

  return {
    withTitle: (title) => next({ title }),
    withTitleValue: (titleValue) => next({ titleValue }),
    withTitleValueHoverText: (titleValueHoverText) => next({ titleValueHoverText }),
    withBody: (body) => next({ body }),
    withBodyItem,
    withPills: (pills) => withBodyItem({ kind: 'pills', pills }),
    withProgress: (value, max) => withBodyItem({ kind: 'progress', value, max }),
    withBarGraph: ({
      data,
      lines,
    }: {
      data: BarGraphData;
      lines?: HabitWidgetBarGraphBody['lines'];
    }) => withBodyItem({ kind: 'barGraph', data, ...(lines != null ? { lines } : {}) }),
    withStreakGraph: (graph) => withBodyItem({ kind: 'streakGraph', graph }),
    model: () => ({
      title: state.title,
      body: state.body,
      ...(state.titleValue != null ? { titleValue: state.titleValue } : {}),
      ...(state.titleValueHoverText != null
        ? { titleValueHoverText: state.titleValueHoverText }
        : {}),
    }),
  };
}

export function build(): WidgetModelBuilder {
  return builder(DEFAULT_STATE);
}
