import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ConfigHabitDraft, UserConfigJsonHabit } from '~/api.client';
import { ModalProvider } from '@habsum/ui/contexts/modal';
import { ConfigModalRenderer } from '../config-components/renderers/ConfigModalRenderer';
import { draftFromHabit } from '~/utils/configHabitDraft';

const habit: UserConfigJsonHabit = {
  name: 'Read',
  type: 'single_select',
  goal: null,
  options: [
    { label: 'yes', sentiment: 'positive' },
    { label: 'no', sentiment: 'negative' },
  ],
  insights: ['current_streak'],
  streak_options: { frequency: '7d' },
};

function renderConfigModal(initialDraft: ConfigHabitDraft = draftFromHabit(habit)) {
  const onDoneClick = vi.fn();
  render(
    <ModalProvider>
      <ConfigModalRenderer
        habit={habit}
        initialDraft={initialDraft}
        onDoneClick={onDoneClick}
        onRemoveClick={vi.fn()}
        onCancel={vi.fn()}
      />
    </ModalProvider>,
  );
  return onDoneClick;
}

afterEach(cleanup);

describe('habit insights settings', () => {
  it('edits sentiment on each option card and preserves it when renamed', () => {
    const onDoneClick = renderConfigModal();
    fireEvent.change(screen.getByRole('combobox', { name: 'Sentiment for yes' }), {
      target: { value: 'negative' },
    });
    fireEvent.click(screen.getByText('yes', { selector: '.pill__label' }));
    const input = screen.getByDisplayValue('yes');
    fireEvent.change(input, { target: { value: 'Read' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    fireEvent.click(screen.getByRole('button', { name: 'Done' }));
    expect(onDoneClick).toHaveBeenCalledWith(
      'Read',
      expect.objectContaining({
        options: [
          { label: 'Read', sentiment: 'negative' },
          { label: 'no', sentiment: 'negative' },
        ],
      }),
    );
  });

  it('defaults newly added options to positive', () => {
    const onDoneClick = renderConfigModal();
    fireEvent.click(screen.getByRole('button', { name: 'Add' }));
    const input = screen.getByPlaceholderText('New option');
    fireEvent.change(input, { target: { value: 'A bit' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    fireEvent.click(screen.getByRole('button', { name: 'Done' }));
    expect(onDoneClick).toHaveBeenCalledWith(
      'Read',
      expect.objectContaining({
        options: expect.arrayContaining([{ label: 'A bit', sentiment: 'positive' }]),
      }),
    );
  });

  it('shows the three insight options and streak-options CTA', () => {
    renderConfigModal();

    expect(screen.getByText('Insights')).toBeTruthy();
    expect(screen.getByRole('checkbox', { name: 'Average' })).toBeTruthy();
    expect(screen.getByRole('checkbox', { name: 'Longest streak' })).toBeTruthy();
    expect(screen.getByRole('checkbox', { name: 'Current streak' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Streak Options' })).toBeTruthy();
    expect(
      screen.queryByText('Streak', { selector: '.config-habit-modal__label > span' }),
    ).toBeNull();
  });

  it('opens streak options and returns to the habit editor with the back button', () => {
    renderConfigModal();

    fireEvent.click(screen.getByRole('button', { name: 'Streak Options' }));

    expect(screen.getByRole('heading', { name: 'Streak options for "Read"' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Back' })).toBeTruthy();
    expect(screen.queryByRole('combobox', { name: 'Sentiment for yes' })).toBeNull();
    expect(screen.queryByText('Values that count toward maintaining a streak.')).toBeNull();
    expect(screen.getByRole('combobox', { name: 'Frequency' })).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Back' }));

    expect(screen.getByRole('heading', { name: 'Editing "Read"' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Streak Options' })).toBeTruthy();
  });
});

describe('summation habit settings layout', () => {
  it('uses the same single-column field layout as single-select habits', () => {
    const summationHabit: UserConfigJsonHabit = {
      name: 'Push ups',
      type: 'summation',
      goal: 100,
      summationOptions: { manualInput: true, increments: [1, 10] },
    };

    render(
      <ModalProvider>
        <ConfigModalRenderer
          habit={summationHabit}
          initialDraft={draftFromHabit(summationHabit)}
          onDoneClick={vi.fn()}
          onRemoveClick={vi.fn()}
          onCancel={vi.fn()}
        />
      </ModalProvider>,
    );

    const goalRow = screen.getByPlaceholderText('No goal').closest('.config-habit-modal__field');
    const quickAddRow = screen.getByText('Quick add options').closest('.config-habit-modal__field');

    expect(document.querySelector('.config-habit-modal__field-row')).toBeNull();
    expect(goalRow).not.toBeNull();
    expect(quickAddRow).not.toBeNull();
    expect(goalRow).not.toBe(quickAddRow);
    expect(screen.getByText('Repeat').closest('.config-habit-modal__field')).not.toBeNull();
  });
});

describe('text habit settings', () => {
  it('shows repeat and reset configuration without visualization or streak options', () => {
    const textHabit: UserConfigJsonHabit = {
      name: 'Journal',
      type: 'text',
      goal: null,
      reset: ['saturday'],
    };

    render(
      <ModalProvider>
        <ConfigModalRenderer
          habit={textHabit}
          initialDraft={draftFromHabit(textHabit)}
          onDoneClick={vi.fn()}
          onRemoveClick={vi.fn()}
          onCancel={vi.fn()}
        />
      </ModalProvider>,
    );

    expect(screen.getByText('Repeat')).toBeTruthy();
    const resetField = screen.getByText('Reset').closest('.config-habit-modal__field');
    expect(resetField).not.toBeNull();
    expect(resetField?.querySelector('button')?.textContent).toContain('Sat');
    expect(screen.queryByText('Data Visualization')).toBeNull();
    expect(screen.queryByText('Insights')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Streak Options' })).toBeNull();
  });
});
