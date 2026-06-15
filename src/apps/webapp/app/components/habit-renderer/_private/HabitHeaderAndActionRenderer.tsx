import { useCallback } from 'react';
import type { Habit, HabitRowSingleSelect, HabitRowSummation } from '@habsum/types/common/habit';
import type { HabitPatch } from '~/api.client';
import { CountControl } from './heading-renderer-helpers/CountControl';
import { HabitHeadingRender } from './heading-renderer-helpers/HabitHeadingRender';
import { HabitMenuModal } from './heading-renderer-helpers/HabitMenuModal';
import { TogglePill } from '@habsum/ui/components/Pill';
import { TernaryCheckbox, type TernaryCheckboxValue } from '@habsum/ui/components/TernaryCheckbox';
import { useModal } from '@habsum/ui/contexts/modal';
import { isGoalHit } from '~/utils/habit-helpers';

type HabitHeaderAndActionRendererProps = {
  user: string;
  habit: Habit;
  pending: boolean;
  onUpdate: (patch: HabitPatch) => Promise<void>;
};

function isCheckboxTheme(habit: HabitRowSingleSelect): boolean {
  return (
    habit.theme === 'checkbox' &&
    habit.options.length === 2 &&
    habit.options.includes('yes') &&
    habit.options.includes('no')
  );
}

function toTernaryCheckboxValue(value: string | null): TernaryCheckboxValue {
  return value === 'yes' || value === 'no' ? value : null;
}

function useHabitResetMenu({
  user,
  habit,
  pending,
  onUpdate,
}: {
  user: string;
  habit: Habit;
  pending: boolean;
  onUpdate: (patch: HabitPatch) => Promise<void>;
}) {
  const { present, closeModal } = useModal();

  return useCallback(() => {
    present({
      content: (
        <HabitMenuModal
          user={user}
          habitName={habit.name}
          pending={pending}
          closeModal={closeModal}
          onReset={async () => {
            await onUpdate({ habit: habit.name, action: 'clear' });
            closeModal();
          }}
        />
      ),
    });
  }, [present, closeModal, habit.name, onUpdate, pending, user]);
}

function SingleSelectActions({
  habit,
  pending,
  onUpdate,
}: {
  habit: HabitRowSingleSelect;
  pending: boolean;
  onUpdate: (patch: HabitPatch) => Promise<void>;
}) {
  const checkboxTheme = isCheckboxTheme(habit);

  const handleSelectChange = useCallback(
    async (nextValue: TernaryCheckboxValue) => {
      if (nextValue == null) {
        await onUpdate({ habit: habit.name, action: 'clear' });
      } else {
        await onUpdate({ habit: habit.name, value: nextValue });
      }
    },
    [habit.name, onUpdate],
  );

  if (checkboxTheme) {
    return (
      <TernaryCheckbox
        value={toTernaryCheckboxValue(habit.value)}
        aria-label={`${habit.name}: ${habit.value ?? 'not set'}`}
        disabled={pending}
        onChange={(nextValue) => {
          void handleSelectChange(nextValue);
        }}
      />
    );
  }

  return (
    <div className="habit-select__options">
      {habit.options.map((opt) => {
        const selected = habit.value === opt;
        const dim = habit.value != null && !selected;
        return (
          <TogglePill
            key={opt}
            selected={selected}
            disabled={pending}
            className={
              dim ? 'habit-select__option habit-select__option--dim' : 'habit-select__option'
            }
            onToggle={(nextSelected) => {
              void (async () => {
                if (nextSelected) {
                  await onUpdate({ habit: habit.name, value: opt });
                } else {
                  await onUpdate({ habit: habit.name, action: 'clear' });
                }
              })();
            }}
          >
            {opt}
          </TogglePill>
        );
      })}
    </div>
  );
}

function SingleSelectHabitHeader({
  user,
  habit,
  pending,
  openResetModal,
  onUpdate,
}: {
  user: string;
  habit: HabitRowSingleSelect;
  pending: boolean;
  openResetModal: () => void;
  onUpdate: (patch: HabitPatch) => Promise<void>;
}) {
  return (
    <HabitHeadingRender
      user={user}
      habitName={habit.name}
      pending={pending}
      goalHit={isGoalHit(habit)}
      menuAriaLabel={`More options for ${habit.name}`}
      onMenuClick={openResetModal}
      className="mb-4"
      actions={<SingleSelectActions habit={habit} pending={pending} onUpdate={onUpdate} />}
    />
  );
}

function SummationHabitHeader({
  user,
  habit,
  pending,
  openResetModal,
  onUpdate,
}: {
  user: string;
  habit: HabitRowSummation;
  pending: boolean;
  openResetModal: () => void;
  onUpdate: (patch: HabitPatch) => Promise<void>;
}) {
  return (
    <HabitHeadingRender
      user={user}
      habitName={habit.name}
      pending={pending}
      goalHit={isGoalHit(habit)}
      menuAriaLabel={`More options for ${habit.name}`}
      onMenuClick={openResetModal}
      className="mb-4"
      actions={
        <CountControl
          summationSteps={habit.summationOptions}
          displayTotal={habit.total}
          habitName={habit.name}
          pending={pending}
          onAddDelta={(delta) => onUpdate({ habit: habit.name, total: delta })}
        />
      }
    />
  );
}

export default function HabitHeaderAndActionRenderer({
  user,
  habit,
  pending,
  onUpdate,
}: HabitHeaderAndActionRendererProps) {
  const openResetModal = useHabitResetMenu({
    user,
    habit,
    pending,
    onUpdate,
  });

  if (habit.type === 'single_select') {
    return (
      <SingleSelectHabitHeader
        user={user}
        habit={habit}
        pending={pending}
        openResetModal={openResetModal}
        onUpdate={onUpdate}
      />
    );
  }

  return (
    <SummationHabitHeader
      user={user}
      habit={habit}
      pending={pending}
      openResetModal={openResetModal}
      onUpdate={onUpdate}
    />
  );
}
