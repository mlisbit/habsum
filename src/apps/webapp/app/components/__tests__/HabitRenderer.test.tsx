import { act, cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import HabitRenderer from '@habsum/habit-render';
import { ModalProvider } from '@habsum/ui/contexts/modal';
import { ToastProvider } from '@habsum/ui/contexts/toast';
import { dayFromString } from '@habsum/types/common/day';
import type { HabitRowSummation } from '@habsum/types/common/habit';

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
