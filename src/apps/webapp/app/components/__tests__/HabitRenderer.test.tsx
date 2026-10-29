import { act, cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Link, MemoryRouter, Route, Routes } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import HabitRenderer from '@habsum/habit-render';
import { ModalProvider } from '@habsum/ui/contexts/modal';
import { ToastProvider } from '@habsum/ui/contexts/toast';
import { dayFromString } from '@habsum/types/common/day';
import type {
  Habit,
  HabitRowSingleSelect,
  HabitRowSummation,
  HabitRowText,
} from '@habsum/types/common/habit';

afterEach(() => {
  cleanup();
});

describe('HabitRenderer title navigation', () => {
  const habits: Habit[] = [
    { name: 'Push ups', type: 'summation', details: { goal: 100, total: null } },
    {
      name: 'Morning routine',
      type: 'single_select',
      details: {
        options: [
          { label: 'yes', sentiment: 'positive' },
          { label: 'no', sentiment: 'positive' },
        ],
        value: null,
      },
    },
    { name: 'Journal', type: 'text', details: { text: null } },
  ];

  it.each(habits)('uses the API ctaUrl for a $type title', (habit) => {
    const ctaUrl = '/api-selected-destination?date=2026-07-22';
    render(
      <ToastProvider>
        <ModalProvider>
          <HabitRenderer
            user="athlete"
            viewDate={dayFromString('2026-07-27')}
            habit={{ ...habit, ctaUrl }}
            onUpdate={vi.fn()}
          />
        </ModalProvider>
      </ToastProvider>,
    );

    expect(screen.getByRole('link', { name: habit.name }).getAttribute('href')).toBe(ctaUrl);
  });

  it.each(habits)('renders a $type title without navigation when ctaUrl is absent', (habit) => {
    render(
      <ToastProvider>
        <ModalProvider>
          <HabitRenderer
            user="athlete"
            viewDate={dayFromString('2026-07-27')}
            habit={habit}
            onUpdate={vi.fn()}
          />
        </ModalProvider>
      </ToastProvider>,
    );

    expect(screen.getByText(habit.name)).toBeTruthy();
    expect(screen.queryByRole('link', { name: habit.name })).toBeNull();
  });

  it('navigates to the API destination through the supplied router link', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <ToastProvider>
          <ModalProvider>
            <Routes>
              <Route
                path="/"
                element={
                  <HabitRenderer
                    user="athlete"
                    viewDate={dayFromString('2026-07-27')}
                    habit={{ ...habits[0], ctaUrl: '/api-selected-destination' }}
                    LinkComponent={({ to, className, children }) => (
                      <Link className={className} to={to}>
                        {children}
                      </Link>
                    )}
                    onUpdate={vi.fn()}
                  />
                }
              />
              <Route path="/api-selected-destination" element={<p>Habit details</p>} />
            </Routes>
          </ModalProvider>
        </ToastProvider>
      </MemoryRouter>,
    );

    await user.click(screen.getByRole('link', { name: 'Push ups' }));

    expect(screen.getByText('Habit details')).toBeTruthy();
  });
});

describe('HabitRenderer pending actions', () => {
  it('allows rapid actions and disables the menu until every update finishes', async () => {
    const user = userEvent.setup();
    const resolveUpdates: Array<() => void> = [];
    const onUpdate = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveUpdates.push(resolve);
        }),
    );
    const habit: HabitRowSummation = {
      name: 'Squats',
      type: 'summation',
      details: {
        goal: null,
        total: null,
        summationOptions: {
          manualInput: true,
          increments: [5],
        },
      },
    };

    render(
      <ToastProvider>
        <ModalProvider>
          <HabitRenderer
            user="athlete"
            viewDate={dayFromString('2026-07-27')}
            habit={habit}
            onUpdate={onUpdate}
          />
        </ModalProvider>
      </ToastProvider>,
    );

    const addButton = screen.getByRole('button', {
      name: 'Add 5 to Squats',
    }) as HTMLButtonElement;
    const menuButton = screen.getByRole('button', {
      name: 'More options for Squats',
    }) as HTMLButtonElement;

    await user.click(addButton);
    await user.click(addButton);
    await user.click(addButton);

    expect(onUpdate).toHaveBeenCalledTimes(3);
    expect(addButton.disabled).toBe(false);
    expect(menuButton.disabled).toBe(true);

    await act(async () => {
      resolveUpdates[0]();
    });
    expect(menuButton.disabled).toBe(true);

    await act(async () => {
      resolveUpdates[1]();
      resolveUpdates[2]();
    });
    expect(menuButton.disabled).toBe(false);
  });
});

describe('HabitRenderer type-specific rendering', () => {
  it('opens the shared habit menu and resets the selected day', async () => {
    const user = userEvent.setup();
    const onUpdate = vi.fn(async () => {});
    const habit: HabitRowSummation = {
      name: 'Squats',
      type: 'summation',
      details: {
        goal: null,
        total: 10,
      },
    };

    render(
      <ToastProvider>
        <ModalProvider>
          <HabitRenderer
            user="athlete"
            viewDate={dayFromString('2026-07-27')}
            habit={habit}
            onUpdate={onUpdate}
          />
        </ModalProvider>
      </ToastProvider>,
    );

    await user.click(screen.getByRole('button', { name: 'More options for Squats' }));
    await user.click(screen.getByRole('button', { name: 'Reset data for day' }));

    expect(onUpdate).toHaveBeenCalledWith({ habit: 'Squats', action: 'clear' });
  });

  it.each(['yes', 'no', null] as const)(
    'shows the selected checkbox value on hover: %s',
    async (value) => {
      const user = userEvent.setup();
      const habit: HabitRowSingleSelect = {
        name: 'Morning routine',
        type: 'single_select',
        details: {
          options: [
            { label: 'yes', sentiment: 'positive' },
            { label: 'no', sentiment: 'negative' },
          ],
          theme: 'checkbox',
          value,
        },
      };

      render(
        <ToastProvider>
          <ModalProvider>
            <HabitRenderer
              user="athlete"
              viewDate={dayFromString('2026-07-27')}
              habit={habit}
              onUpdate={vi.fn()}
            />
          </ModalProvider>
        </ToastProvider>,
      );

      const checkbox = screen.getByRole('button', {
        name: `Morning routine: ${value ?? 'not set'}`,
      });
      await user.hover(checkbox);
      if (value != null) {
        expect((await screen.findByRole('tooltip')).textContent).toBe(value);
      } else {
        await act(async () => {
          await new Promise((resolve) => setTimeout(resolve, 80));
        });
        expect(screen.queryByRole('tooltip')).toBeNull();
        expect(checkbox.getAttribute('aria-describedby')).toBeNull();
      }
    },
  );

  it.each([
    { value: null, next: 'Finished', state: null },
    { value: 'Finished', next: 'Skipped', state: 'yes' },
    { value: 'Skipped', next: null, state: 'no' },
  ])('maps checkbox states to custom sentiment labels: $value', async ({ value, next, state }) => {
    const user = userEvent.setup();
    const onUpdate = vi.fn().mockResolvedValue(undefined);
    const habit: HabitRowSingleSelect = {
      name: 'Reading',
      type: 'single_select',
      details: {
        options: [
          { label: 'Skipped', sentiment: 'negative' },
          { label: 'Finished', sentiment: 'positive' },
        ],
        theme: 'checkbox',
        value,
      },
    };
    render(
      <ToastProvider>
        <ModalProvider>
          <HabitRenderer
            user="reader"
            viewDate={dayFromString('2026-07-27')}
            habit={habit}
            onUpdate={onUpdate}
          />
        </ModalProvider>
      </ToastProvider>,
    );
    const checkbox = screen.getByRole('button', { name: `Reading: ${value ?? 'not set'}` });
    if (state != null) expect(checkbox.classList.contains(`ternary-checkbox--${state}`)).toBe(true);
    if (value != null) {
      await user.hover(checkbox);
      expect((await screen.findByRole('tooltip')).textContent).toBe(value);
    }
    await user.click(checkbox);
    expect(onUpdate).toHaveBeenCalledWith(
      next == null ? { habit: 'Reading', action: 'clear' } : { habit: 'Reading', value: next },
    );
  });

  it.each(['None', 'A bit', null])(
    'uses option sentiments while keeping selection values as labels: %s',
    async (value) => {
      const user = userEvent.setup();
      const onUpdate = vi.fn().mockResolvedValue(undefined);
      const habit: HabitRowSingleSelect = {
        name: 'Reading',
        type: 'single_select',
        details: {
          options: [
            { label: 'None', sentiment: 'negative' },
            { label: 'A bit', sentiment: 'positive' },
            { label: 'A lot', sentiment: 'positive' },
          ],
          value,
        },
      };

      render(
        <ToastProvider>
          <ModalProvider>
            <HabitRenderer
              user="reader"
              viewDate={dayFromString('2026-07-27')}
              habit={habit}
              onUpdate={onUpdate}
            />
          </ModalProvider>
        </ToastProvider>,
      );

      const negativeOption = screen.getByRole('button', { name: 'None' });
      const positiveOption = screen.getByRole('button', { name: 'A bit' });
      expect(negativeOption.classList.contains('pill--selected-negative')).toBe(value === 'None');
      expect(negativeOption.classList.contains('pill--selected')).toBe(value === 'None');
      expect(positiveOption.classList.contains('pill--selected-negative')).toBe(false);
      expect(positiveOption.classList.contains('pill--selected')).toBe(value === 'A bit');

      await user.click(negativeOption);
      expect(onUpdate).toHaveBeenCalledWith(
        value === 'None'
          ? { habit: 'Reading', action: 'clear' }
          : { habit: 'Reading', value: 'None' },
      );
    },
  );

  it('renders text actions', () => {
    const habit: HabitRowText = {
      name: 'Journal',
      type: 'text',
      details: { text: 'A good day' },
    };

    render(
      <ToastProvider>
        <ModalProvider>
          <HabitRenderer
            user="writer"
            viewDate={dayFromString('2026-07-27')}
            habit={habit}
            onUpdate={vi.fn()}
          />
        </ModalProvider>
      </ToastProvider>,
    );

    expect(
      (screen.getByRole('textbox', { name: 'Journal text for the day' }) as HTMLTextAreaElement)
        .value,
    ).toBe('A good day');
  });

  it('uses demo rendering without heading navigation or a menu', () => {
    const habit: HabitRowSummation = {
      name: 'Squats',
      ctaUrl: '/api-selected-destination',
      type: 'summation',
      details: {
        goal: null,
        total: null,
      },
    };

    render(
      <ToastProvider>
        <ModalProvider>
          <HabitRenderer
            user="athlete"
            viewDate={dayFromString('2026-07-27')}
            habit={habit}
            demo
            onUpdate={vi.fn()}
          />
        </ModalProvider>
      </ToastProvider>,
    );

    expect(screen.queryByRole('link', { name: 'Squats' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'More options for Squats' })).toBeNull();
  });
});
