import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ModalProvider } from '@habsum/ui/contexts/modal';
import { ToastProvider } from '@habsum/ui/contexts/toast';
import HabitRenderer from '@habsum/habit-render';
import { dayFromString } from '@habsum/types/common/day';
import type { HabitRowText } from '~/api.client';

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('text habit control', () => {
  it('autosaves edited text after a short debounce', async () => {
    vi.useFakeTimers();
    const onUpdate = vi.fn(async () => {});
    const habit: HabitRowText = {
      name: 'Journal',
      type: 'text',
      details: { text: 'Yesterday' },
    };

    render(
      <ToastProvider>
        <ModalProvider>
          <HabitRenderer
            user="writer"
            habit={habit}
            viewDate={dayFromString('2026-07-27')}
            onUpdate={onUpdate}
          />
        </ModalProvider>
      </ToastProvider>,
    );

    const input = screen.getByRole('textbox', { name: 'Journal text for the day' });
    fireEvent.change(input, { target: { value: 'Today\nSecond line' } });

    expect(screen.queryByRole('button', { name: 'Save' })).toBeNull();
    expect(onUpdate).not.toHaveBeenCalled();

    await act(async () => {
      vi.advanceTimersByTime(600);
    });
    expect(onUpdate).toHaveBeenCalledWith({
      habit: 'Journal',
      text: 'Today\nSecond line',
    });
  });

  it('keeps the textarea focused and queues edits while an autosave is pending', async () => {
    vi.useFakeTimers();
    let resolveFirstSave: () => void = () => {};
    const firstSave = new Promise<void>((resolve) => {
      resolveFirstSave = resolve;
    });
    const onUpdate = vi
      .fn<() => Promise<void>>()
      .mockImplementationOnce(() => firstSave)
      .mockResolvedValue(undefined);
    const viewDate = dayFromString('2026-07-27');
    const renderHabit = (text = 'Today') => (
      <ToastProvider>
        <ModalProvider>
          <HabitRenderer
            user="writer"
            habit={{
              name: 'Journal',
              type: 'text',
              details: { text },
            }}
            viewDate={viewDate}
            onUpdate={onUpdate}
          />
        </ModalProvider>
      </ToastProvider>
    );
    const { rerender } = render(renderHabit());
    const input = screen.getByRole('textbox', {
      name: 'Journal text for the day',
    }) as HTMLTextAreaElement;
    input.focus();

    fireEvent.change(input, { target: { value: 'Saved before the latest edit' } });
    await act(async () => {
      vi.advanceTimersByTime(600);
    });

    fireEvent.change(input, { target: { value: 'Typed while saving' } });

    expect(document.activeElement).toBe(input);
    expect(input.readOnly).toBe(false);
    expect(input.value).toBe('Typed while saving');
    expect(input.getAttribute('aria-busy')).toBe('true');
    expect(onUpdate).toHaveBeenCalledTimes(1);

    rerender(renderHabit('Saved before the latest edit'));
    expect(input.value).toBe('Typed while saving');

    await act(async () => {
      resolveFirstSave();
    });
    await act(async () => {
      vi.advanceTimersByTime(600);
    });

    expect(onUpdate).toHaveBeenLastCalledWith({
      habit: 'Journal',
      text: 'Typed while saving',
    });
  });
});
