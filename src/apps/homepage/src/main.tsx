import { StrictMode, useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { dayFromString } from '@habsum/types/common/day';
import type { Habit } from '@habsum/types/common/habit';
import HabitRenderer from '@habsum/habit-render';
import { ModalProvider } from '@habsum/ui/contexts/modal';
import { ToastProvider } from '@habsum/ui/contexts/toast';
import { build, buildWidget } from '@habsum/utils';

import '@habsum/ui/styles';
import '@habsum/habit-render/styles';
import './styles/index.scss';

const viewDate = dayFromString('2026-06-19');
const user = 'demo';

const movementWidget = buildWidget()
  .withTitle('Progress')
  .withTitleValue('7,500 steps')
  .withProgress(7500, 10000)
  .model();

const moodWidget = buildWidget()
  .withTitle('Today')
  .withTitleValue('steady')
  .withPills([{ label: 'steady' }, { label: 'focused' }])
  .model();

const waterWidget = buildWidget()
  .withTitle('Goal')
  .withTitleValue('5 of 8')
  .withProgress(5, 8)
  .model();

const movementHabit = build()
  .withName('Movement')
  .withType('summation')
  .withGoal(10000)
  .withTotal(7500)
  .withSummationOptions({ manualInput: true, increments: [500, 1000, -500] })
  .withWidget(movementWidget)
  .model();

const moodHabit = build()
  .withName('Mood')
  .withType('single_select')
  .withOptions(['low', 'steady', 'bright'])
  .withValue('steady')
  .withWidget(moodWidget)
  .model();

const waterHabit = build()
  .withName('Water before coffee')
  .withType('checkbox')
  .withValue('yes')
  .withWidget(waterWidget)
  .model();

const habits: Habit[] = [movementHabit, moodHabit, waterHabit];

const captions = ['Calculate totals and add custom incrementations.', 'temp2', 'temp3'] as const;

function useActiveScrollStep(stepCount: number) {
  const rootRef = useRef<HTMLElement | null>(null);
  const [activeStep, setActiveStep] = useState(0);

  useEffect(() => {
    const update = () => {
      const root = rootRef.current;
      if (!root) return;
      const top = root.getBoundingClientRect().top + window.scrollY;
      const progress = window.scrollY - top + window.innerHeight * 0.45;
      const nextStep = Math.min(
        stepCount - 1,
        Math.max(0, Math.floor(progress / window.innerHeight)),
      );
      setActiveStep((current) => (current === nextStep ? current : nextStep));
    };

    update();
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    return () => {
      window.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, [stepCount]);

  return { activeStep, rootRef };
}

function App() {
  const { activeStep, rootRef } = useActiveScrollStep(habits.length);

  return (
    <ToastProvider>
      <ModalProvider>
        <main ref={rootRef} className="homepage-habits">
          <div className="homepage-habits__stage">
            <section className="homepage-habits__copy" aria-live="polite">
              <h1 className="homepage-habits__title text-h-xl">
                Welcome to Habsum, an incredibly customizable habit tracker.
              </h1>
              <p className="homepage-habits__caption text-b-xl text-light">
                {captions[activeStep]}
              </p>
            </section>
            <section className="homepage-habits__cards" aria-label="Habits">
              {habits.map((habit, index) => (
                <div
                  key={habit.name}
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
                    onUpdate={async () => undefined}
                  />
                </div>
              ))}
            </section>
          </div>
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
