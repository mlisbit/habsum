import type { ReactElement } from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ModalProvider } from '@habsum/ui/contexts/modal';
import { CountControl } from '../habit-renderer/_private/heading-renderer-helpers/CountControl';

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

function amountInput() {
  return screen.getByRole('spinbutton', { name: /Amount for/ }) as HTMLInputElement;
}

describe('CountControl', () => {
  it('free-form: + opens add modal', async () => {
    const user = userEvent.setup();
    renderWithModal(
      <CountControl
        displayTotal={null}
        habitName={habitName}
        pending={false}
        onAddDelta={vi.fn(async () => {})}
      />,
    );
    const trigger = screen.getByRole('button', { name: /Enter custom amount for/ });
    expect(trigger.textContent?.trim()).toBe('+');
    expect(screen.queryByRole('spinbutton', { name: /Amount for/ })).toBeNull();
    await user.click(trigger);
    expect(screen.getByRole('heading', { name: `Add to "${habitName}"` })).toBeTruthy();
    const input = amountInput();
    expect(input.value).toBe('');
    expect(input.getAttribute('placeholder')).toBe('Enter value');
    expect(screen.getByRole('button', { name: 'Add' })).toBeTruthy();
  });

  it('free-form: typed amount submits delta', async () => {
    const user = userEvent.setup();
    const onAddDelta = vi.fn(async () => {});
    renderWithModal(
      <CountControl
        displayTotal={null}
        habitName={habitName}
        pending={false}
        onAddDelta={onAddDelta}
      />,
    );
    await user.click(screen.getByRole('button', { name: /Enter custom amount for/ }));
    const input = amountInput();
    await user.type(input, '3');
    await user.click(screen.getByRole('button', { name: 'Add' }));
    expect(onAddDelta).toHaveBeenCalledWith(3);
  });

  it('free-form: negative value uses Subtract CTA', async () => {
    const user = userEvent.setup();
    const onAddDelta = vi.fn(async () => {});
    renderWithModal(
      <CountControl
        displayTotal={null}
        habitName={habitName}
        pending={false}
        onAddDelta={onAddDelta}
      />,
    );
    await user.click(screen.getByRole('button', { name: /Enter custom amount for/ }));
    const input = amountInput();
    await user.type(input, '-2');
    expect(screen.getByRole('button', { name: 'Subtract' })).toBeTruthy();
    await user.click(screen.getByRole('button', { name: 'Subtract' }));
    expect(onAddDelta).toHaveBeenCalledWith(-2);
  });

  it('free-form: typed zero submits delta of 0', async () => {
    const user = userEvent.setup();
    const onAddDelta = vi.fn(async () => {});
    renderWithModal(
      <CountControl
        displayTotal={null}
        habitName={habitName}
        pending={false}
        onAddDelta={onAddDelta}
      />,
    );
    await user.click(screen.getByRole('button', { name: /Enter custom amount for/ }));
    const input = amountInput();
    await user.type(input, '0');
    await user.click(screen.getByRole('button', { name: 'Add' }));
    expect(onAddDelta).toHaveBeenCalledWith(0);
  });

  it('manual increments: shows + trigger and quick-add buttons', () => {
    renderWithModal(
      <CountControl
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
        summationSteps={manualSteps}
        displayTotal={null}
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

  it('add modal: shows new total while typing', async () => {
    const user = userEvent.setup();
    renderWithModal(
      <CountControl
        displayTotal={10}
        habitName={habitName}
        pending={false}
        onAddDelta={vi.fn(async () => {})}
      />,
    );
    await user.click(screen.getByRole('button', { name: /Enter custom amount for/ }));
    expect(screen.queryByText(/New total:/)).toBeNull();
    await user.type(amountInput(), '5');
    expect(screen.getByText('New total: 15')).toBeTruthy();
    await user.clear(amountInput());
    await user.type(amountInput(), '-3');
    expect(screen.getByText('New total: 7')).toBeTruthy();
  });

  it('add modal: rejected letter shows error and is not entered', async () => {
    const user = userEvent.setup();
    renderWithModal(
      <CountControl
        displayTotal={null}
        habitName={habitName}
        pending={false}
        onAddDelta={vi.fn(async () => {})}
      />,
    );
    await user.click(screen.getByRole('button', { name: /Enter custom amount for/ }));
    const input = amountInput();
    await user.type(input, 'a');
    expect(input.value).toBe('');
    expect(screen.getByText('Value must be a number')).toBeTruthy();
    await user.type(input, '5');
    expect(input.value).toBe('5');
    expect(screen.queryByText('Value must be a number')).toBeNull();
  });

  it('manual increments: typed amount in modal submits delta', async () => {
    const user = userEvent.setup();
    const onAddDelta = vi.fn(async () => {});
    renderWithModal(
      <CountControl
        summationSteps={manualSteps}
        displayTotal={null}
        habitName={habitName}
        pending={false}
        onAddDelta={onAddDelta}
      />,
    );
    await user.click(screen.getByRole('button', { name: /Enter custom amount for/ }));
    const input = amountInput();
    await user.type(input, '12');
    await user.click(screen.getByRole('button', { name: 'Add' }));
    expect(onAddDelta).toHaveBeenCalledWith(12);
  });
});
