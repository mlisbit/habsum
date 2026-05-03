import type { ReactElement } from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ModalProvider } from '~/context/modal';
import { CountControl } from '../CountControl';

const habitName = 'Squats';

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

function renderWithModal(ui: ReactElement) {
  return render(<ModalProvider>{ui}</ModalProvider>);
}

async function openAmountEditor(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: /Edit amount to add for/ }));
}

describe('CountControl', () => {
  const onClearTotal = vi.fn(async () => {});

  it('free-form: tertiary trigger shows interval; spinbutton after edit click', async () => {
    const user = userEvent.setup();
    renderWithModal(
      <CountControl
        interval={3}
        displayTotal={null}
        habitName={habitName}
        pending={false}
        onAddDelta={vi.fn(async () => {})}
        onClearTotal={onClearTotal}
      />,
    );
    const trigger = screen.getByRole('button', { name: /Edit amount to add for/ });
    expect(trigger.textContent?.trim()).toBe('3');
    expect(screen.queryByRole('spinbutton')).toBeNull();
    await openAmountEditor(user);
    const input = screen.getByRole('spinbutton') as HTMLInputElement;
    expect(input.value).toBe('');
    expect(screen.queryByRole('button', { name: /Add amount to/ })).toBeNull();
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
        onClearTotal={onClearTotal}
      />,
    );
    expect(screen.getByRole('button', { name: /Subtract amount from/ })).toBeTruthy();
  });

  it('free-form: plus sends interval magnitude', async () => {
    const user = userEvent.setup();
    const onAddDelta = vi.fn(async () => {});
    renderWithModal(
      <CountControl
        interval={3}
        displayTotal={null}
        habitName={habitName}
        pending={false}
        onAddDelta={onAddDelta}
        onClearTotal={onClearTotal}
      />,
    );
    await user.click(screen.getByRole('button', { name: /Add amount to/ }));
    expect(onAddDelta).toHaveBeenCalledWith(3);
  });

  it('free-form: long-press opens adjust modal with empty manual add field', async () => {
    vi.useFakeTimers();
    renderWithModal(
      <CountControl
        interval={3}
        displayTotal={null}
        habitName={habitName}
        pending={false}
        onAddDelta={vi.fn(async () => {})}
        onClearTotal={onClearTotal}
      />,
    );
    const plus = screen.getByRole('button', { name: /Add amount to/ });
    fireEvent.pointerDown(plus, { button: 0 });
    await vi.advanceTimersByTimeAsync(520);
    fireEvent.pointerUp(plus);

    expect(screen.getByText('Adjust')).toBeTruthy();
    expect(screen.queryByText(/Taps:/)).toBeNull();
    const modalInput = screen.getByRole('spinbutton', {
      name: new RegExp(`^Manual change for ${habitName}$`),
    }) as HTMLInputElement;
    expect(modalInput.value).toBe('');
  });

  it('fixed steps: long-press shows tap hint and manual add field', async () => {
    vi.useFakeTimers();
    renderWithModal(
      <CountControl
        interval={1}
        summationSteps={{ sub: 1, add: 5 }}
        displayTotal={7}
        habitName={habitName}
        pending={false}
        onAddDelta={vi.fn(async () => {})}
        onClearTotal={onClearTotal}
      />,
    );
    const plus = screen.getByRole('button', { name: /Add 5 to/ });
    fireEvent.pointerDown(plus, { button: 0 });
    await vi.advanceTimersByTimeAsync(520);
    fireEvent.pointerUp(plus);

    expect(screen.getByText('Adjust')).toBeTruthy();
    const tapsLine = screen.getByText(/Taps:/);
    expect(tapsLine.textContent).toContain('−1');
    expect(tapsLine.textContent).toContain('+5');
    const modalInput = screen.getByRole('spinbutton', {
      name: new RegExp(`^Manual change for ${habitName}$`),
    }) as HTMLInputElement;
    expect(modalInput.value).toBe('');
  });

  it('adjust modal Apply sends positive manual delta', async () => {
    vi.useFakeTimers();
    const onAddDelta = vi.fn(async () => {});
    renderWithModal(
      <CountControl
        interval={1}
        summationSteps={{ sub: 1, add: 5 }}
        displayTotal={7}
        habitName={habitName}
        pending={false}
        onAddDelta={onAddDelta}
        onClearTotal={onClearTotal}
      />,
    );
    const plus = screen.getByRole('button', { name: /Add 5 to/ });
    fireEvent.pointerDown(plus, { button: 0 });
    await vi.advanceTimersByTimeAsync(520);
    fireEvent.pointerUp(plus);

    const modalInput = screen.getByRole('spinbutton', {
      name: new RegExp(`^Manual change for ${habitName}$`),
    });
    fireEvent.change(modalInput, { target: { value: '12' } });
    fireEvent.click(screen.getByRole('button', { name: /Apply manual change for/ }));

    expect(onAddDelta).toHaveBeenCalledWith(12);
  });

  it('adjust modal Apply sends negative manual delta', async () => {
    vi.useFakeTimers();
    const onAddDelta = vi.fn(async () => {});
    renderWithModal(
      <CountControl
        interval={1}
        summationSteps={{ sub: 1, add: 5 }}
        displayTotal={7}
        habitName={habitName}
        pending={false}
        onAddDelta={onAddDelta}
        onClearTotal={onClearTotal}
      />,
    );
    const plus = screen.getByRole('button', { name: /Add 5 to/ });
    fireEvent.pointerDown(plus, { button: 0 });
    await vi.advanceTimersByTimeAsync(520);
    fireEvent.pointerUp(plus);

    const modalInput = screen.getByRole('spinbutton', {
      name: new RegExp(`^Manual change for ${habitName}$`),
    });
    fireEvent.change(modalInput, { target: { value: '-4' } });
    fireEvent.click(screen.getByRole('button', { name: /Apply manual change for/ }));

    expect(onAddDelta).toHaveBeenCalledWith(-4);
  });

  it('fixed steps: shows +5 and hides minus when total is 0', () => {
    renderWithModal(
      <CountControl
        interval={1}
        summationSteps={{ sub: 1, add: 5 }}
        displayTotal={null}
        habitName={habitName}
        pending={false}
        onAddDelta={vi.fn(async () => {})}
        onClearTotal={onClearTotal}
      />,
    );
    expect(screen.getByRole('button', { name: /Add 5 to/ }).textContent).toContain('+5');
    expect(screen.queryByRole('button', { name: /Subtract 1 from/ })).toBeNull();
  });

  it('fixed steps: −1 sends -1 when total > 0', async () => {
    const user = userEvent.setup();
    const onAddDelta = vi.fn(async () => {});
    renderWithModal(
      <CountControl
        interval={1}
        summationSteps={{ sub: 1, add: 5 }}
        displayTotal={7}
        habitName={habitName}
        pending={false}
        onAddDelta={onAddDelta}
        onClearTotal={onClearTotal}
      />,
    );
    await user.click(screen.getByRole('button', { name: /Subtract 1 from/ }));
    expect(onAddDelta).toHaveBeenCalledWith(-1);
  });

  it('equal steps [1, 1]: uses icon minus/plus buttons', () => {
    renderWithModal(
      <CountControl
        interval={1}
        summationSteps={{ sub: 1, add: 1 }}
        displayTotal={5}
        habitName={habitName}
        pending={false}
        onAddDelta={vi.fn(async () => {})}
        onClearTotal={onClearTotal}
      />,
    );
    const minusBtn = screen.getByRole('button', { name: /Subtract 1 from/ });
    const plusBtn = screen.getByRole('button', { name: /Add 1 to/ });
    expect(minusBtn.className).toContain('button--icon');
    expect(plusBtn.className).toContain('button--icon');
  });

  it('input-between: tertiary trigger shows add step; spinbutton after edit click', async () => {
    const user = userEvent.setup();
    renderWithModal(
      <CountControl
        interval={1}
        summationSteps={{ sub: 1, add: 5, inputBetween: true }}
        displayTotal={null}
        habitName={habitName}
        pending={false}
        onAddDelta={vi.fn(async () => {})}
        onClearTotal={onClearTotal}
      />,
    );
    const trigger = screen.getByRole('button', { name: /Edit amount to add for/ });
    expect(trigger.textContent?.trim()).toBe('5');
    expect(screen.queryByRole('spinbutton')).toBeNull();
    await openAmountEditor(user);
    const input = screen.getByRole('spinbutton') as HTMLInputElement;
    expect(input.value).toBe('');
    expect(screen.queryByRole('button', { name: /Add 5 to/ })).toBeNull();
    expect(screen.getByRole('button', { name: /Apply amount for/ })).toBeTruthy();
  });

  it('input-between: typed amount sends delta via inner apply', async () => {
    const user = userEvent.setup();
    const onAddDelta = vi.fn(async () => {});
    renderWithModal(
      <CountControl
        interval={1}
        summationSteps={{ sub: 1, add: 5, inputBetween: true }}
        displayTotal={null}
        habitName={habitName}
        pending={false}
        onAddDelta={onAddDelta}
        onClearTotal={onClearTotal}
      />,
    );
    await openAmountEditor(user);
    const input = screen.getByRole('spinbutton');
    await user.clear(input);
    await user.type(input, '20');
    await user.click(screen.getByRole('button', { name: /Apply amount for/ }));
    expect(onAddDelta).toHaveBeenCalledWith(20);
  });

  it('input-between: long-press opens adjust modal without tap hint', async () => {
    vi.useFakeTimers();
    renderWithModal(
      <CountControl
        interval={1}
        summationSteps={{ sub: 1, add: 5, inputBetween: true }}
        displayTotal={null}
        habitName={habitName}
        pending={false}
        onAddDelta={vi.fn(async () => {})}
        onClearTotal={onClearTotal}
      />,
    );
    const plus = screen.getByRole('button', { name: /Add 5 to/ });
    fireEvent.pointerDown(plus, { button: 0 });
    await vi.advanceTimersByTimeAsync(520);
    fireEvent.pointerUp(plus);

    expect(screen.getByText('Adjust')).toBeTruthy();
    expect(screen.queryByText(/Taps:/)).toBeNull();
    const modalInput = screen.getByRole('spinbutton', {
      name: new RegExp(`^Manual change for ${habitName}$`),
    }) as HTMLInputElement;
    expect(modalInput.value).toBe('');
  });
});
