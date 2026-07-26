import type {
  Habit,
  HabitTheme,
  HabitWidget,
  HabitRowSingleSelect,
  HabitRowSummation,
  SummationEvent,
  SummationOptions,
} from '@habsum/types/common/habit';

type HabitType = Habit['type'] | 'checkbox';

type HabitModelBuilderState = {
  name: string;
  type: HabitType;
  goal: number | null;
  options: string[];
  theme?: HabitTheme;
  value: string | null;
  total: number | null;
  events?: SummationEvent[];
  summationOptions?: SummationOptions;
  widgets?: HabitWidget[];
};

const DEFAULT_STATE: HabitModelBuilderState = {
  name: 'Habit',
  type: 'summation',
  goal: null,
  options: [],
  value: null,
  total: null,
};

type HabitModelBuilder = {
  withName(name: string): HabitModelBuilder;
  withType(type: HabitType): HabitModelBuilder;
  withGoal(goal: number | null): HabitModelBuilder;
  withOptions(options: string[]): HabitModelBuilder;
  withTheme(theme: HabitTheme | undefined): HabitModelBuilder;
  withValue(value: string | null): HabitModelBuilder;
  withTotal(total: number | null): HabitModelBuilder;
  withEvents(events: SummationEvent[] | undefined): HabitModelBuilder;
  withSummationOptions(options: SummationOptions | undefined): HabitModelBuilder;
  withWidgets(widgets: HabitWidget[] | undefined): HabitModelBuilder;
  withWidget(widget: HabitWidget): HabitModelBuilder;
  model(): Habit;
};

function singleSelectModel(state: HabitModelBuilderState): HabitRowSingleSelect {
  return {
    name: state.name,
    type: 'single_select',
    details: {
      options: state.options,
      value: state.value,
      ...(state.theme != null ? { theme: state.theme } : {}),
    },
    ...(state.widgets != null ? { widgets: state.widgets } : {}),
  };
}

function summationModel(state: HabitModelBuilderState): HabitRowSummation {
  return {
    name: state.name,
    type: 'summation',
    details: {
      goal: state.goal,
      total: state.total,
      ...(state.events != null ? { events: state.events } : {}),
      ...(state.summationOptions != null ? { summationOptions: state.summationOptions } : {}),
    },
    ...(state.widgets != null ? { widgets: state.widgets } : {}),
  };
}

function stateForType(state: HabitModelBuilderState, type: HabitType): HabitModelBuilderState {
  if (type === 'checkbox') {
    return {
      ...state,
      type,
      options: ['yes', 'no'],
      theme: 'checkbox',
      value: state.value === 'yes' || state.value === 'no' ? state.value : null,
    };
  }

  if (type === 'single_select') {
    return {
      ...state,
      type,
      theme: undefined,
      value: state.value,
      options: state.options.length > 0 ? state.options : [],
    };
  }

  return {
    ...state,
    type,
  };
}

function builder(state: HabitModelBuilderState): HabitModelBuilder {
  const next = (patch: Partial<HabitModelBuilderState>) => builder({ ...state, ...patch });

  return {
    withName: (name) => next({ name }),
    withType: (type) => builder(stateForType(state, type)),
    withGoal: (goal) => next({ goal }),
    withOptions: (options) => next({ options }),
    withTheme: (theme) => next({ theme }),
    withValue: (value) => next({ value }),
    withTotal: (total) => next({ total }),
    withEvents: (events) => next({ events }),
    withSummationOptions: (summationOptions) => next({ summationOptions }),
    withWidgets: (widgets) => next({ widgets }),
    withWidget: (widget) => next({ widgets: [...(state.widgets ?? []), widget] }),
    model: () => {
      if (state.type === 'summation') return summationModel(state);
      return singleSelectModel(stateForType(state, state.type));
    },
  };
}

export function build(): HabitModelBuilder {
  return builder(DEFAULT_STATE);
}
