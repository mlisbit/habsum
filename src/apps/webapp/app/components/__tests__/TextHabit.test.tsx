import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ModalProvider } from '@habsum/ui/contexts/modal';
import HabitHeaderAndActionRenderer from '@habsum/habit-render/_private/HabitHeaderAndActionRenderer';
import type { HabitRowText } from '~/api.client';

afterEach(cleanup);

describe('text habit control', () => {
  it('edits and submits the text for the selected day', async () => {
    const user = userEvent.setup();
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
          pending={false}
          onUpdate={onUpdate}
        />
      </ModalProvider>,
    );

    const input = screen.getByRole('textbox', { name: 'Journal text for the day' });
    await user.clear(input);
    await user.type(input, 'Today{enter}Second line');
    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(onUpdate).toHaveBeenCalledWith({
      habit: 'Journal',
      text: 'Today\nSecond line',
    });
  });
});
