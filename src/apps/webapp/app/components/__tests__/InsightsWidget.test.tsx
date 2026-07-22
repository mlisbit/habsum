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
  options: ['yes', 'no'],
  streak: { options: ['yes'] },
};

function renderConfigModal(initialDraft: ConfigHabitDraft = draftFromHabit(habit)) {
  render(
    <ModalProvider>
      <ConfigModalRenderer
        habit={habit}
        initialDraft={initialDraft}
        onDoneClick={vi.fn()}
        onRemoveClick={vi.fn()}
        onCancel={vi.fn()}
      />
    </ModalProvider>,
  );
}

afterEach(cleanup);

describe('habit insights settings', () => {
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
    expect(screen.getByRole('button', { name: 'yes' })).toBeTruthy();
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
