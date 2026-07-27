import { useCallback, useEffect, useState, type ComponentType, type ReactNode } from 'react';
import type {
  Habit,
  HabitRowSingleSelect,
  HabitRowSummation,
  HabitRowText,
} from '@habsum/types/common/habit';
import type { HabitPatch } from '@habsum/types/api-responses/habit-patch';
import { CountControl } from './heading-renderer-helpers/CountControl';
import { HabitHeadingRender } from './heading-renderer-helpers/HabitHeadingRender';
import { HabitMenuModal } from './heading-renderer-helpers/HabitMenuModal';
import { TogglePill } from '@habsum/ui/components/Pill';
import { Button } from '@habsum/ui/components/Button';
import { TernaryCheckbox, type TernaryCheckboxValue } from '@habsum/ui/components/TernaryCheckbox';
import { useModal } from '@habsum/ui/contexts/modal';
import { classBuilder } from '@habsum/utils/class-builder';
import { isGoalHit } from '@habsum/utils/habit-helpers';

type HabitHeaderAndActionRendererProps = {
  user: string;
  habit: Habit;
  pending: boolean;
  currentSearch?: string;
  LinkComponent?: ComponentType<{ to: string; className?: string; children: ReactNode }>;
  onNavigate?: (url: string) => void;
  demo?: boolean;
  className?: string;
  onUpdate: (patch: HabitPatch) => Promise<void>;
};

function isCheckboxTheme(habit: HabitRowSingleSelect): boolean {
  return (
    habit.details.theme === 'checkbox' &&
    habit.details.options.length === 2 &&
    habit.details.options.includes('yes') &&
    habit.details.options.includes('no')
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
  const { present, closeModal, closeModalThen } = useModal();

  return useCallback(() => {
    present({
      content: (
        <HabitMenuModal
          user={user}
          habitName={habit.name}
          pending={pending}
          onNavigate={onNavigate}
          closeModalThen={closeModalThen}
          onReset={async () => {
            await onUpdate({ habit: habit.name, action: 'clear' });
            closeModal();
          }}
        />
      ),
    });
  }, [present, closeModal, closeModalThen, habit.name, onNavigate, onUpdate, pending, user]);
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
        value={toTernaryCheckboxValue(habit.details.value)}
        aria-label={`${habit.name}: ${habit.details.value ?? 'not set'}`}
        disabled={pending}
        onChange={(nextValue) => {
          void handleSelectChange(nextValue);
        }}
      />
    );
  }

  return (
    <div className="habit-select__options">
      {habit.details.options.map((opt) => {
        const selected = habit.details.value === opt;
        const dim = habit.details.value != null && !selected;
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
  demo,
  className,
  openResetModal,
  onUpdate,
}: {
  user: string;
  habit: HabitRowSingleSelect;
  pending: boolean;
  currentSearch?: string;
  LinkComponent?: ComponentType<{ to: string; className?: string; children: ReactNode }>;
  demo?: boolean;
  className?: string;
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
      demo={demo}
      menuAriaLabel={`More options for ${habit.name}`}
      onMenuClick={openResetModal}
      className={['mb-4', className].filter(Boolean).join(' ')}
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
  demo,
  className,
  openResetModal,
  onUpdate,
}: {
  user: string;
  habit: HabitRowSummation;
  pending: boolean;
  currentSearch?: string;
  LinkComponent?: ComponentType<{ to: string; className?: string; children: ReactNode }>;
  demo?: boolean;
  className?: string;
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
      demo={demo}
      menuAriaLabel={`More options for ${habit.name}`}
      onMenuClick={openResetModal}
      className={['mb-4', className].filter(Boolean).join(' ')}
      actions={
        <CountControl
          summationSteps={habit.details.summationOptions}
          displayTotal={habit.details.total}
          habitName={habit.name}
          pending={pending}
          onAddDelta={(delta) => onUpdate({ habit: habit.name, total: delta })}
        />
      }
    />
  );
}

function TextHabitActions({
  habit,
  pending,
  onUpdate,
}: {
  habit: HabitRowText;
  pending: boolean;
  onUpdate: (patch: HabitPatch) => Promise<void>;
}) {
  const storedText = habit.details.text ?? '';
  const [draft, setDraft] = useState(storedText);

  useEffect(() => {
    setDraft(storedText);
  }, [habit.name, storedText]);

  return (
    <div className="habit-text">
      <textarea
        className="habit-text__input text-b-m"
        aria-label={`${habit.name} text for the day`}
        placeholder="Write something for this day…"
        rows={3}
        value={draft}
        disabled={pending}
        onChange={(event) => setDraft(event.target.value)}
      />
      <Button
        type="primary"
        size="medium"
        text="Save"
        className="habit-text__save"
        disabled={pending || draft === storedText}
        onClick={() => {
          void onUpdate({ habit: habit.name, text: draft });
        }}
      />
    </div>
  );
}

function TextHabitHeader({
  user,
  habit,
  pending,
  currentSearch,
  LinkComponent,
  demo,
  className,
  openResetModal,
  onUpdate,
}: {
  user: string;
  habit: HabitRowText;
  pending: boolean;
  currentSearch?: string;
  LinkComponent?: ComponentType<{ to: string; className?: string; children: ReactNode }>;
  demo?: boolean;
  className?: string;
  openResetModal: () => void;
  onUpdate: (patch: HabitPatch) => Promise<void>;
}) {
  return (
    <div className={className}>
      <HabitHeadingRender
        user={user}
        habitName={habit.name}
        pending={pending}
        currentSearch={currentSearch}
        LinkComponent={LinkComponent}
        demo={demo}
        menuAriaLabel={`More options for ${habit.name}`}
        onMenuClick={openResetModal}
        className="mb-4"
      />
      <TextHabitActions habit={habit} pending={pending} onUpdate={onUpdate} />
    </div>
  );
}

export default function HabitHeaderAndActionRenderer({
  user,
  habit,
  pending,
  currentSearch,
  LinkComponent,
  onNavigate,
  demo = false,
  className,
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
        demo={demo}
        openResetModal={openResetModal}
        className={className}
        onUpdate={onUpdate}
      />
    );
  }
  if (habit.type === 'text') {
    return (
      <TextHabitHeader
        user={user}
        habit={habit}
        pending={pending}
        currentSearch={currentSearch}
        LinkComponent={LinkComponent}
        demo={demo}
        openResetModal={openResetModal}
        className={className}
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
      demo={demo}
      openResetModal={openResetModal}
      className={className}
      onUpdate={onUpdate}
    />
  );
}
