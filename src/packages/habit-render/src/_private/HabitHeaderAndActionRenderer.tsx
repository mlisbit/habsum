import { useCallback, type ComponentType, type ReactNode } from 'react';
import type { Habit, HabitRowSingleSelect, HabitRowSummation } from '@habsum/types/common/habit';
import type { HabitPatch } from '@habsum/types/api-responses/habit-patch';
import { CountControl } from './heading-renderer-helpers/CountControl';
import { HabitHeadingRender } from './heading-renderer-helpers/HabitHeadingRender';
import { HabitMenuModal } from './heading-renderer-helpers/HabitMenuModal';
import { TogglePill } from '@habsum/ui/components/Pill';
import { TernaryCheckbox, type TernaryCheckboxValue } from '@habsum/ui/components/TernaryCheckbox';
import { useModal } from '@habsum/ui/contexts/modal';
import { isGoalHit } from '@habsum/utils';

type HabitHeaderAndActionRendererProps = {
  user: string;
  habit: Habit;
  pending: boolean;
  currentSearch?: string;
  LinkComponent?: ComponentType<{ to: string; className?: string; children: ReactNode }>;
  onNavigate?: (url: string) => void;
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
  onNavigate,
  onUpdate,
}: {
  user: string;
  habit: Habit;
  pending: boolean;
  onNavigate?: (url: string) => void;
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
          onNavigate={onNavigate}
          closeModal={closeModal}
          onReset={async () => {
            await onUpdate({ habit: habit.name, action: 'clear' });
            closeModal();
          }}
        />
      ),
    });
  }, [present, closeModal, habit.name, onNavigate, onUpdate, pending, user]);
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
  currentSearch,
  LinkComponent,
  openResetModal,
  onUpdate,
}: {
  user: string;
  habit: HabitRowSingleSelect;
  pending: boolean;
  currentSearch?: string;
  LinkComponent?: ComponentType<{ to: string; className?: string; children: ReactNode }>;
  openResetModal: () => void;
  onUpdate: (patch: HabitPatch) => Promise<void>;
}) {
  return (
    <HabitHeadingRender
      user={user}
      habitName={habit.name}
      pending={pending}
      goalHit={isGoalHit(habit)}
      currentSearch={currentSearch}
      LinkComponent={LinkComponent}
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
  currentSearch,
  LinkComponent,
  openResetModal,
  onUpdate,
}: {
  user: string;
  habit: HabitRowSummation;
  pending: boolean;
  currentSearch?: string;
  LinkComponent?: ComponentType<{ to: string; className?: string; children: ReactNode }>;
  openResetModal: () => void;
  onUpdate: (patch: HabitPatch) => Promise<void>;
}) {
  return (
    <HabitHeadingRender
      user={user}
      habitName={habit.name}
      pending={pending}
      goalHit={isGoalHit(habit)}
      currentSearch={currentSearch}
      LinkComponent={LinkComponent}
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
  currentSearch,
  LinkComponent,
  onNavigate,
  onUpdate,
}: HabitHeaderAndActionRendererProps) {
  const openResetModal = useHabitResetMenu({
    user,
    habit,
    pending,
    onNavigate,
    onUpdate,
  });

  if (habit.type === 'single_select') {
    return (
      <SingleSelectHabitHeader
        user={user}
        habit={habit}
        pending={pending}
        currentSearch={currentSearch}
        LinkComponent={LinkComponent}
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
      currentSearch={currentSearch}
      LinkComponent={LinkComponent}
      openResetModal={openResetModal}
      onUpdate={onUpdate}
    />
  );
}
