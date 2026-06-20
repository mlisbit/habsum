import { StrictMode, useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import type { BarGraphData } from '@habsum/types/common/bar-chart';
import { dayFromString, type Day } from '@habsum/types/common/day';
import type { HabitPatch } from '@habsum/types/api-responses/habit-patch';
import type { Habit, HabitWidget } from '@habsum/types/common/habit';
import type { StreakGraphData } from '@habsum/types/common/streak';
import HabitRenderer from '@habsum/habit-render';
import { Button } from '@habsum/ui/components/Button';
import { Hoverable } from '@habsum/ui/components/Hoverable';
import { ModalProvider } from '@habsum/ui/contexts/modal';
import { ToastProvider } from '@habsum/ui/contexts/toast';
import { build, buildWidget } from '@habsum/utils';

import '@habsum/ui/styles';
import '@habsum/habit-render/styles';
import './styles/index.scss';

const viewDate = dayFromString('2026-06-19');
const user = 'demo';

const readingTotals = [
  18, 25, 12, 42, 31, 50, 55, 20, 28, 36, 44, 60, 16, 32, 40, 48, 52, 26, 22, 38, 25,
];

const readingStreakTotals = [
  14, 28, 34, 45, 52, 24, 30, 38, 46, 55, 49, 18, 25, 29, 35, 42, 48, 54, 22, 31, 36, 44, 50, 57,
  61, 66, 70, 16, 24, 32, 39, 45, 52, 58, 64, 68, 26, 33, 40, 47, 53, 59, 25, 18, 30, 41, 51, 56,
  62, 67, 72, 21, 27, 35, 43, 50, 57, 63, 69, 19, 29, 37, 44, 52, 60, 65, 71, 76, 15, 24, 31, 39,
  46, 53, 61, 68, 73, 20, 28, 36, 43, 51, 58, 64, 70, 25,
];

function fakeGraphData(values: number[]): BarGraphData {
  const top = Math.max(1, ...values);

  return Object.fromEntries(
    values.map((value, index) => [
      `${index + 1}`,
      {
        value,
        top,
        hoverLabel: `Day ${index + 1}`,
      },
    ]),
  );
}

function fakeStreakData(values: number[], goal: number): StreakGraphData {
  const start = new Date(2026, 4, 8);

  return {
    data: Object.fromEntries(
      values.map((value, index) => {
        const date = new Date(start);
        date.setDate(start.getDate() + index);
        const day = dayFromString(date.toISOString().slice(0, 10)) as Day;
        const hitGoal = value >= goal;

        return [
          day,
          {
            value: hitGoal ? 'goal hit' : null,
            fill: hitGoal ? 10 : Math.max(0, Math.round((value / goal) * 8)),
          },
        ];
      }),
    ),
  };
}

const readingWidget = buildWidget()
  .withTitle('3 week progress')
  .withTitleValue('25 pages today')
  .withProgress(25, 50)
  .withBarGraph({
    data: fakeGraphData(readingTotals),
    lines: [{ value: 50, label: 'Daily target' }],
  })
  .model();

const readingStreakWidget = buildWidget()
  .withTitle('Streak')
  .withTitleValue('86 days')
  .withPills([
    { label: 'Current: 7 days', hover: 'Current streak of reading goal days' },
    { label: 'Longest: 16 days', hover: 'Longest streak in this fake history' },
  ])
  .withStreakGraph(fakeStreakData(readingStreakTotals, 50))
  .model();

const focusWidget = buildWidget().withTitle('Today').withTitleValue('steady').model();

const readingHabit = build()
  .withName('Reading')
  .withType('summation')
  .withGoal(50)
  .withTotal(25)
  .withSummationOptions({ manualInput: true, increments: [25, 50] })
  .withWidget(readingWidget)
  .withWidget(readingStreakWidget)
  .model();

const focusHabit = build()
  .withName('Focus')
  .withType('single_select')
  .withOptions(['distracted', 'steady', 'locked in'])
  .withValue('steady')
  .withWidget(focusWidget)
  .model();

const brushTeethHabit = build()
  .withName('Brush teeth before bed')
  .withType('checkbox')
  .withValue('yes')
  .model();

const habits: Habit[] = [readingHabit, focusHabit, brushTeethHabit];

const captions = [
  'Choose the views that work for you—from daily history graphs to long-term heatmaps and streak tracking.',
  'Use ratings to capture things that can’t be measured with a simple yes or no.',
  'Some habits are simple. Mark them complete and keep your streak alive.',
] as const;
const activeCardViewportOffset = 0.38;

function formatPages(value: number | null): string {
  return `${(value ?? 0).toLocaleString()} pages today`;
}

function updateSummationWidgets(widgets: HabitWidget[] | undefined, total: number | null) {
  return widgets?.map((widget) => {
    if (widget.title !== '3 week progress') return widget;

    return {
      ...widget,
      titleValue: formatPages(total),
      body: widget.body.map((body) =>
        body.kind === 'progress' ? { ...body, value: total ?? 0 } : body,
      ),
    };
  });
}

function updateSingleSelectWidgets(widgets: HabitWidget[] | undefined, value: string | null) {
  return widgets?.map((widget) => {
    if (widget.title !== 'Today') return widget;
    return { ...widget, titleValue: value ?? 'not set' };
  });
}

function updateHomepageHabit(habit: Habit, patch: HabitPatch): Habit {
  if (habit.name !== patch.habit) return habit;

  if ('action' in patch) {
    if (patch.action === 'clear') {
      if (habit.type === 'summation') {
        return {
          ...habit,
          total: null,
          widgets: updateSummationWidgets(habit.widgets, null),
        };
      }
      return {
        ...habit,
        value: null,
        widgets: updateSingleSelectWidgets(habit.widgets, null),
      };
    }

    return habit;
  }

  if ('total' in patch && habit.type === 'summation') {
    const total = (habit.total ?? 0) + patch.total;
    return {
      ...habit,
      total,
      widgets: updateSummationWidgets(habit.widgets, total),
    };
  }

  if ('value' in patch && habit.type === 'single_select') {
    return {
      ...habit,
      value: patch.value,
      widgets: updateSingleSelectWidgets(habit.widgets, patch.value),
    };
  }

  return habit;
}

function useActiveCardStep(cardRefs: { current: Array<HTMLDivElement | null> }, stepCount: number) {
  const [activeStep, setActiveStep] = useState(0);

  useEffect(() => {
    const update = () => {
      const activationLine = 64 + window.innerHeight * activeCardViewportOffset;
      const nextStep = cardRefs.current.reduce((currentStep, card, index) => {
        if (!card) return currentStep;
        return card.getBoundingClientRect().top <= activationLine ? index : currentStep;
      }, 0);

      setActiveStep((current) => (current === nextStep ? current : nextStep));
    };

    update();
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    return () => {
      window.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, [cardRefs, stepCount]);

  return activeStep;
}

function App() {
  const [homepageHabits, setHomepageHabits] = useState(habits);
  const cardRefs = useRef<Array<HTMLDivElement | null>>([]);
  const activeStep = useActiveCardStep(cardRefs, habits.length);

  const updateHabit = async (patch: HabitPatch) => {
    setHomepageHabits((current) => current.map((habit) => updateHomepageHabit(habit, patch)));
  };

  return (
    <ToastProvider>
      <ModalProvider>
        <header className="homepage-habits__topbar">
          <div className="homepage-habits__brand text-h-m" aria-label="Habsum">
            <img className="homepage-habits__brand-icon" src="/favicon.svg" alt="" />
            Habsum
          </div>
          <nav className="homepage-habits__nav flex align-items-center gap-2" aria-label="Homepage">
            <Hoverable.Root>
              <Hoverable.Anchor className="homepage-habits__demo-anchor">
                <Button
                  type="secondary"
                  size="large"
                  text="Demo"
                  aria-disabled="true"
                  className="homepage-habits__demo-button"
                  onClick={(event) => event.preventDefault()}
                />
              </Hoverable.Anchor>
              <Hoverable.Content className="homepage-habits__demo-tooltip" side="bottom">
                <span className="text-b-m">Coming soon</span>
              </Hoverable.Content>
            </Hoverable.Root>
            <a className="homepage-habits__login-link" href="/login">
              <Button type="primary" size="large" text="Login" />
            </a>
          </nav>
        </header>
        <main className="homepage-habits">
          <header className="homepage-habits__intro">
            <h1 className="homepage-habits__title text-h-xl">Track habits your way.</h1>
            <p className="homepage-habits__subtitle text-b-xl text-light">
              Create trackers that match how you measure progress.
            </p>
          </header>
          <div className="homepage-habits__stage">
            <section className="homepage-habits__copy mt-5" aria-live="polite">
              <p className="homepage-habits__caption text-b-xl text-light">
                {captions[activeStep]}
              </p>
            </section>
            <section className="homepage-habits__cards" aria-label="Habits">
              {homepageHabits.map((habit, index) => (
                <div
                  key={habit.name}
                  ref={(node) => {
                    cardRefs.current[index] = node;
                  }}
                  className={[
                    'homepage-habits__card',
                    activeStep === index ? 'homepage-habits__card--active' : null,
                  ]
                    .filter(Boolean)
                    .join(' ')}
                >
                  <HabitRenderer
                    user={user}
                    viewDate={viewDate}
                    habit={habit}
                    demo
                    onUpdate={updateHabit}
                  />
                </div>
              ))}
            </section>
          </div>
          <section className="homepage-habits__active-development">
            <h2 className="text-h-l">Actively developed</h2>
            <p className="text-b-xl text-light">
              Habsum is continuously evolving with new visualizations, tracking capabilities, and
              quality-of-life improvements. Early users have a direct impact on what gets built
              next.
            </p>
            <a
              className="homepage-habits__waitlist-link text-b-xl text-link"
              href="#"
              onClick={(event) => event.preventDefault()}
            >
              Join waitlist
            </a>
          </section>
          <footer className="homepage-habits__footer">
            <span className="text-b-m text-light">&copy; 2026 Habsum</span>
            <a className="text-b-m text-link" href="#" onClick={(event) => event.preventDefault()}>
              Terms of Service
            </a>
          </footer>
        </main>
      </ModalProvider>
    </ToastProvider>
  );
}

const root = document.getElementById('root');
if (root == null) throw new Error('Root element not found');

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
