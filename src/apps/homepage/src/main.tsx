import { StrictMode, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import type { BarGraphData } from '@habsum/types/common/bar-chart';
import { dayFromString, type Day } from '@habsum/types/common/day';
import type { HabitPatch } from '@habsum/types/api-responses/habit-patch';
import type { Habit, HabitWidget } from '@habsum/types/common/habit';
import type { StreakGraphData } from '@habsum/types/common/streak';
import HabitRenderer from '@habsum/habit-render';
import { Button } from '@habsum/ui/components/Button';
import { Hoverable } from '@habsum/ui/components/Hoverable';
import { Toggle } from '@habsum/ui/components/Toggle';
import { ModalBody, ModalHeader, ModalProvider, useModal } from '@habsum/ui/contexts/modal';
import { ToastProvider } from '@habsum/ui/contexts/toast';
import { build } from '@habsum/utils/model-builders/habit';
import { build as buildWidget } from '@habsum/utils/model-builders/widget';

import '@habsum/ui/styles';
import '@habsum/habit-render/styles';
import './styles/index.scss';

const viewDate = dayFromString('2026-06-19');
const user = 'demo';

const initialReadingTotals = [
  18, 25, 12, 42, 31, 50, 55, 20, 28, 36, 44, 60, 16, 32, 40, 48, 52, 26, 22, 38, 25,
];

const initialReadingStreakTotals = [
  14, 28, 34, 45, 52, 24, 30, 38, 46, 55, 49, 18, 25, 29, 35, 42, 48, 54, 22, 31, 36, 44, 50, 57,
  61, 66, 70, 16, 24, 32, 39, 45, 52, 58, 64, 68, 26, 33, 40, 47, 53, 59, 25, 18, 30, 41, 51, 56,
  62, 67, 72, 21, 27, 35, 43, 50, 57, 63, 69, 19, 29, 37, 44, 52, 60, 65, 71, 76, 15, 24, 31, 39,
  46, 53, 61, 68, 73, 20, 28, 36, 43, 51, 58, 64, 70, 25,
];

type HomepageTheme = 'dark' | 'light';
type DemoHabitKind = 'checkbox' | 'quickSelect' | 'singleSelect';

const demoHabitKinds: DemoHabitKind[] = ['quickSelect', 'checkbox', 'singleSelect'];

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
  const data: StreakGraphData['data'] = Array.from({ length: 7 }, () => []);

  values.forEach((value, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    const day = dayFromString(date.toISOString().slice(0, 10)) as Day;
    const hitGoal = value >= goal;
    data[date.getDay()]!.push({
      date: day,
      value: hitGoal ? 'goal hit' : null,
      fill: hitGoal ? 10 : Math.max(0, Math.round((value / goal) * 8)),
    });
  });

  return { data };
}

function formatPages(value: number | null): string {
  return `${(value ?? 0).toLocaleString()} pages today`;
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomTotals(count: number): number[] {
  return Array.from({ length: count }, () => randomInt(8, 72));
}

function createStreakWidget(streakTotals: number[], goal: number) {
  const currentStreak = randomInt(4, 18);
  const longestStreak = Math.max(currentStreak, randomInt(10, 32));

  return buildWidget()
    .withTitle('Streak')
    .withTitleValue(`${streakTotals.length} days`)
    .withPills([
      { label: `Current: ${currentStreak} days`, hover: 'Current streak of reading goal days' },
      { label: `Longest: ${longestStreak} days`, hover: 'Longest streak in this fake history' },
    ])
    .withStreakGraph(fakeStreakData(streakTotals, goal))
    .model();
}

function createQuickSelectHabit({
  historyTotals = initialReadingTotals,
  progressTotal = 25,
  streakTotals = initialReadingStreakTotals,
}: {
  historyTotals?: number[];
  progressTotal?: number;
  streakTotals?: number[];
}) {
  const goal = 50;

  const readingProgressWidget = buildWidget()
    .withTitle('Progress')
    .withTitleValue(formatPages(progressTotal))
    .withProgress(progressTotal, goal)
    .model();

  const readingHistoryWidget = buildWidget()
    .withTitle('History')
    .withBarGraph({
      data: fakeGraphData(historyTotals),
      lines: [{ value: goal, label: 'Daily target' }],
    })
    .model();

  const readingStreakWidget = createStreakWidget(streakTotals, goal);

  return build()
    .withName('Reading')
    .withType('summation')
    .withGoal(goal)
    .withTotal(progressTotal)
    .withSummationOptions({ manualInput: true, increments: [25, 50] })
    .withWidget(readingProgressWidget)
    .withWidget(readingHistoryWidget)
    .withWidget(readingStreakWidget)
    .model();
}

function createCheckboxHabit() {
  const value = Math.random() > 0.5 ? 'yes' : Math.random() > 0.5 ? 'no' : null;
  const label = value === 'yes' ? 'done' : value === 'no' ? 'skipped' : 'not set';
  const widget = buildWidget().withTitle('Today').withTitleValue(label).model();
  const streakWidget = createStreakWidget(randomTotals(initialReadingStreakTotals.length), 50);

  return build()
    .withName('Reading')
    .withType('checkbox')
    .withValue(value)
    .withWidget(widget)
    .withWidget(streakWidget)
    .model();
}

function createSingleSelectHabit() {
  const options = ['nothing', 'a bit', 'a lot'];
  const value = options[randomInt(0, options.length - 1)]!;
  const widget = buildWidget().withTitle('Today').withTitleValue(value).model();
  const streakWidget = createStreakWidget(randomTotals(initialReadingStreakTotals.length), 50);

  return build()
    .withName('Reading')
    .withType('single_select')
    .withOptions(options)
    .withValue(value)
    .withWidget(widget)
    .withWidget(streakWidget)
    .model();
}

function createDemoHabit(kind: DemoHabitKind): Habit {
  if (kind === 'checkbox') return createCheckboxHabit();
  if (kind === 'singleSelect') return createSingleSelectHabit();

  return createQuickSelectHabit({
    historyTotals: randomTotals(initialReadingTotals.length),
    progressTotal: randomInt(0, 72),
    streakTotals: randomTotals(initialReadingStreakTotals.length),
  });
}

function randomDemoHabitKind(currentKind: DemoHabitKind): DemoHabitKind {
  const nextKinds = demoHabitKinds.filter((kind) => kind !== currentKind);
  return nextKinds[randomInt(0, nextKinds.length - 1)]!;
}

const readingHabit = createQuickSelectHabit({});

function updateSummationWidgets(widgets: HabitWidget[] | undefined, total: number | null) {
  return widgets?.map((widget) => {
    if (widget.title !== 'Progress') return widget;

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

function LegalTodoModal({ title }: { title: string }) {
  return (
    <>
      <ModalHeader>{title}</ModalHeader>
      <ModalBody>
        <p className="text-b-m text-light">TODO</p>
      </ModalBody>
    </>
  );
}

function HomepageContent() {
  const [demoHabitKind, setDemoHabitKind] = useState<DemoHabitKind>('quickSelect');
  const [homepageHabit, setHomepageHabit] = useState(readingHabit);
  const [theme, setTheme] = useState<HomepageTheme>(() => {
    if (typeof document === 'undefined') return 'light';
    return document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';
  });
  const { present } = useModal();

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  const updateHabit = async (patch: HabitPatch) => {
    setHomepageHabit((current) => updateHomepageHabit(current, patch));
  };

  const randomizeHabitData = () => {
    const nextKind = randomDemoHabitKind(demoHabitKind);
    setDemoHabitKind(nextKind);
    setHomepageHabit(createDemoHabit(nextKind));
  };

  const openLegalTodo = (title: string) => {
    present({ content: <LegalTodoModal title={title} /> });
  };

  return (
    <>
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
              <span>Coming soon</span>
            </Hoverable.Content>
          </Hoverable.Root>
          <a className="homepage-habits__login-link" href="/login">
            <Button type="primary" size="large" text="Login" />
          </a>
        </nav>
      </header>
      <main className="homepage-habits">
        <div className="homepage-habits__grid">
          <header className="homepage-habits__intro">
            <h1 className="homepage-habits__title text-h-xl">Track habits your way.</h1>
            <p className="homepage-habits__subtitle text-b-xl text-light">
              Create trackers that match how you measure progress.
            </p>
          </header>
          <section className="homepage-habits__demo" aria-label="Habits">
            <div className="homepage-habits__demo-left">
              <p className="homepage-habits__widget-callout text-b-xl text-light">
                Pick and choose which widgets you want to show: <strong>history</strong>,
                <strong>streaks</strong>, <strong>progress</strong>, and more.
              </p>
            </div>
            <div className="homepage-habits__demo-right">
              <HabitRenderer
                user={user}
                viewDate={viewDate}
                habit={homepageHabit}
                demo
                widgetsClassName="homepage-habits__widgets-highlight"
                onUpdate={updateHabit}
              />
              <div className="homepage-habits__demo-controls">
                <Hoverable.Root>
                  <Hoverable.Anchor className="homepage-habits__randomize-anchor">
                    <Button
                      type="primary"
                      color="inverse"
                      size="medium"
                      icon="shuffle"
                      aria-label="Randomize data and view"
                      onClick={randomizeHabitData}
                    />
                  </Hoverable.Anchor>
                  <Hoverable.Content className="homepage-habits__randomize-tooltip" side="top">
                    <span>randomize data/view</span>
                  </Hoverable.Content>
                </Hoverable.Root>
                <Hoverable.Root>
                  <Hoverable.Anchor className="homepage-habits__theme-anchor">
                    <Toggle
                      checked={theme === 'dark'}
                      size="medium"
                      checkedIllustration="moon"
                      uncheckedIllustration="sun"
                      aria-label="Use dark mode"
                      onChange={(checked) => setTheme(checked ? 'dark' : 'light')}
                    />
                  </Hoverable.Anchor>
                  <Hoverable.Content className="homepage-habits__theme-tooltip" side="top">
                    <span>{theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}</span>
                  </Hoverable.Content>
                </Hoverable.Root>
              </div>
            </div>
          </section>
          <section className="homepage-habits__active-development">
            <h2 className="text-h-l">Actively developed</h2>
            <p className="text-b-xl text-light">
              Habsum is continuously evolving with new visualizations, tracking capabilities, and
              quality-of-life improvements. Early users have a direct impact on what gets built
              next.
            </p>
            <Hoverable.Root>
              <Hoverable.Anchor className="homepage-habits__waitlist-anchor">
                <Button
                  type="primary"
                  size="large"
                  text="Join waitlist"
                  aria-disabled="true"
                  className="homepage-habits__waitlist-button"
                  onClick={(event) => event.preventDefault()}
                />
              </Hoverable.Anchor>
              <Hoverable.Content className="homepage-habits__waitlist-tooltip" side="top">
                <span>Waitlist coming soon</span>
              </Hoverable.Content>
            </Hoverable.Root>
          </section>
        </div>
        <footer className="homepage-habits__footer">
          <div className="homepage-habits__grid homepage-habits__footer-grid">
            <span className="homepage-habits__footer-copy text-b-m">&copy; 2026 Habsum</span>
            <nav className="homepage-habits__footer-nav" aria-label="Legal">
              <button
                type="button"
                className="homepage-habits__footer-link text-b-m"
                onClick={() => openLegalTodo('Terms')}
              >
                Terms
              </button>
              <button
                type="button"
                className="homepage-habits__footer-link text-b-m"
                onClick={() => openLegalTodo('Privacy')}
              >
                Privacy
              </button>
            </nav>
          </div>
        </footer>
      </main>
    </>
  );
}

export function HomepageApp() {
  return (
    <ToastProvider>
      <ModalProvider>
        <HomepageContent />
      </ModalProvider>
    </ToastProvider>
  );
}

const root = typeof document === 'undefined' ? null : document.getElementById('root');
if (root?.dataset.homepageRoot === 'true') {
  createRoot(root).render(
    <StrictMode>
      <HomepageApp />
    </StrictMode>,
  );
}
