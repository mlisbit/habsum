import type { ReactElement } from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ModalProvider } from '@habsum/ui/contexts/modal';
import { CountControl } from '../CountControl';

const habitName = 'Squats';

const manualSteps = {
  manualInput: true as const,
  increments: [-1, 5, 10],
};

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

function renderWithModal(ui: ReactElement) {
  return render(<ModalProvider>{ui}</ModalProvider>);
}

describe('CountControl', () => {
  it('free-form: shows + trigger; spinbutton after click', async () => {
    const user = userEvent.setup();
    renderWithModal(
      <CountControl
        interval={3}
        displayTotal={null}
        habitName={habitName}
        pending={false}
        onAddDelta={vi.fn(async () => {})}
      />,
    );
    const trigger = screen.getByRole('button', { name: /Enter custom amount for/ });
    expect(trigger.textContent?.trim()).toBe('+');
    expect(screen.queryByRole('spinbutton')).toBeNull();
    await user.click(trigger);
    const input = screen.getByRole('spinbutton') as HTMLInputElement;
    expect(input.value).toBe('');
    expect(input.getAttribute('placeholder')).toBe('3');
    expect(screen.getByRole('button', { name: /Apply amount for/ })).toBeTruthy();
    expect(screen.queryByRole('button', { name: /Subtract amount from/ })).toBeNull();
  });

  it('free-form: minus appears when total > 0', () => {
    renderWithModal(
      <CountControl
        interval={2}
        displayTotal={10}
        habitName={habitName}
        pending={false}
        onAddDelta={vi.fn(async () => {})}
      />,
    );
    expect(screen.getByRole('button', { name: /Subtract amount from/ })).toBeTruthy();
  });

  it('free-form: typed amount submits delta', async () => {
    const user = userEvent.setup();
    const onAddDelta = vi.fn(async () => {});
    renderWithModal(
      <CountControl
        interval={3}
        displayTotal={null}
        habitName={habitName}
        pending={false}
        onAddDelta={onAddDelta}
      />,
    );
    await user.click(screen.getByRole('button', { name: /Enter custom amount for/ }));
    const input = screen.getByRole('spinbutton', { name: /Amount for/ });
    await user.type(input, '3');
    await user.click(screen.getByRole('button', { name: /Apply amount for/ }));
    expect(onAddDelta).toHaveBeenCalledWith(3);
  });

  it('free-form: typed zero submits delta of 0', async () => {
    const user = userEvent.setup();
    const onAddDelta = vi.fn(async () => {});
    renderWithModal(
      <CountControl
        interval={3}
        displayTotal={null}
        habitName={habitName}
        pending={false}
        onAddDelta={onAddDelta}
      />,
    );
    await user.click(screen.getByRole('button', { name: /Enter custom amount for/ }));
    const input = screen.getByRole('spinbutton', { name: /Amount for/ });
    await user.type(input, '0');
    await user.click(screen.getByRole('button', { name: /Apply amount for/ }));
    expect(onAddDelta).toHaveBeenCalledWith(0);
  });

  it('manual increments: shows + trigger and quick-add buttons', () => {
    renderWithModal(
      <CountControl
        interval={1}
        summationSteps={manualSteps}
        displayTotal={null}
        habitName={habitName}
        pending={false}
        onAddDelta={vi.fn(async () => {})}
      />,
    );
    expect(screen.getByRole('button', { name: /Enter custom amount for/ })).toBeTruthy();
    expect(screen.queryByRole('spinbutton', { name: /Amount for/ })).toBeNull();
    expect(screen.getByRole('button', { name: /Subtract 1 from/ }).textContent).toContain('-1');
    expect(screen.getByRole('button', { name: /Add 5 to/ }).textContent).toContain('+5');
    expect(screen.getByRole('button', { name: /Add 10 to/ }).textContent).toContain('+10');
  });

  it('manual increments: tap applies signed delta', async () => {
    const user = userEvent.setup();
    const onAddDelta = vi.fn(async () => {});
    renderWithModal(
      <CountControl
        interval={1}
        summationSteps={manualSteps}
        displayTotal={7}
        habitName={habitName}
        pending={false}
        onAddDelta={onAddDelta}
      />,
    );
    await user.click(screen.getByRole('button', { name: /Add 5 to/ }));
    expect(onAddDelta).toHaveBeenCalledWith(5);
    await user.click(screen.getByRole('button', { name: /Subtract 1 from/ }));
    expect(onAddDelta).toHaveBeenCalledWith(-1);
  });

  it('manual increments: typed amount submits delta', async () => {
    const user = userEvent.setup();
    const onAddDelta = vi.fn(async () => {});
    renderWithModal(
      <CountControl
        interval={1}
        summationSteps={manualSteps}
        displayTotal={null}
        habitName={habitName}
        pending={false}
        onAddDelta={onAddDelta}
      />,
    );
    await user.click(screen.getByRole('button', { name: /Enter custom amount for/ }));
    const input = screen.getByRole('spinbutton', { name: /Amount for/ });
    await user.type(input, '12');
    await user.click(screen.getByRole('button', { name: /Apply amount for/ }));
    expect(onAddDelta).toHaveBeenCalledWith(12);
  });
});
