import { act, cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import HabitRenderer from '@habsum/habit-render';
import { ModalProvider } from '@habsum/ui/contexts/modal';
import { ToastProvider } from '@habsum/ui/contexts/toast';
import { dayFromString } from '@habsum/types/common/day';
import type {
  HabitRowSingleSelect,
  HabitRowSummation,
  HabitRowText,
} from '@habsum/types/common/habit';

afterEach(() => {
  cleanup();
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

  it('renders single-select actions', () => {
    const habit: HabitRowSingleSelect = {
      name: 'Morning routine',
      type: 'single_select',
      details: {
        options: ['yes', 'no'],
        theme: 'checkbox',
        value: null,
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

    expect(screen.getByRole('button', { name: 'Morning routine: not set' })).toBeTruthy();
  });

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
