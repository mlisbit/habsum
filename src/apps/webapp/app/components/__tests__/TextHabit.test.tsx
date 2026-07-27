import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ModalProvider } from '@habsum/ui/contexts/modal';
import HabitHeaderAndActionRenderer from '@habsum/habit-render/_private/HabitHeaderAndActionRenderer';
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
      <ModalProvider>
        <HabitHeaderAndActionRenderer
          user="writer"
          habit={habit}
          viewDate={dayFromString('2026-07-27')}
          pending={false}
          onUpdate={onUpdate}
        />
      </ModalProvider>,
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
    const onUpdate = vi.fn(async () => {});
    const viewDate = dayFromString('2026-07-27');
    const renderHeader = (pending: boolean, text = 'Today') => (
      <ModalProvider>
        <HabitHeaderAndActionRenderer
          user="writer"
          habit={{
            name: 'Journal',
            type: 'text',
            details: { text },
          }}
          viewDate={viewDate}
          pending={pending}
          onUpdate={onUpdate}
        />
      </ModalProvider>
    );
    const { rerender } = render(renderHeader(false));
    const input = screen.getByRole('textbox', {
      name: 'Journal text for the day',
    }) as HTMLTextAreaElement;
    input.focus();

    rerender(renderHeader(true));
    fireEvent.change(input, { target: { value: 'Typed while saving' } });

    expect(document.activeElement).toBe(input);
    expect(input.readOnly).toBe(false);
    expect(input.value).toBe('Typed while saving');
    expect(input.getAttribute('aria-busy')).toBe('true');
    expect(onUpdate).not.toHaveBeenCalled();

    rerender(renderHeader(true, 'Saved before the latest edit'));
    expect(input.value).toBe('Typed while saving');

    rerender(renderHeader(false, 'Saved before the latest edit'));
    await act(async () => {
      vi.advanceTimersByTime(600);
    });

    expect(onUpdate).toHaveBeenCalledWith({
      habit: 'Journal',
      text: 'Typed while saving',
    });
  });
});
