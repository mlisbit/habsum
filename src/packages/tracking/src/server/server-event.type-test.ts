import type { ServerEvent } from './server-event';

const summationEvent: ServerEvent = {
  name: 'HabitAction',
  body: { habitType: 'summation' },
};

const singleSelectEvent: ServerEvent = {
  name: 'HabitAction',
  body: { habitType: 'single_select' },
};

const textEvent: ServerEvent = {
  name: 'HabitAction',
  body: { habitType: 'text' },
};

void summationEvent;
void singleSelectEvent;
void textEvent;

const invalidEvent: ServerEvent = {
  name: 'HabitAction',
  body: {
    // @ts-expect-error Habit types come from the shared HabitType domain type.
    habitType: 'note',
  },
};

void invalidEvent;
