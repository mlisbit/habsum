import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ComponentType,
  type ReactNode,
} from 'react';
import type { Day } from '@habsum/types/common/day';
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
import { TernaryCheckbox, type TernaryCheckboxValue } from '@habsum/ui/components/TernaryCheckbox';
import { useModal } from '@habsum/ui/contexts/modal';
import { classBuilder } from '@habsum/utils/class-builder';
import { isGoalHit } from '@habsum/utils/habit-helpers';

const TEXT_AUTOSAVE_DELAY_MS = 600;

type HabitHeaderAndActionRendererProps = {
  user: string;
  habit: Habit;
  viewDate: Day;
  pending: boolean;
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
  onNavigate,
  onUpdate,
}: {
  user: string;
  habit: Habit;
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
          onNavigate={onNavigate}
          closeModalThen={closeModalThen}
          onReset={async () => {
            await onUpdate({ habit: habit.name, action: 'clear' });
            closeModal();
          }}
        />
      ),
    });
  }, [present, closeModal, closeModalThen, habit.name, onNavigate, onUpdate, user]);
}

function SingleSelectActions({
  habit,
  onUpdate,
}: {
  habit: HabitRowSingleSelect;
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
  viewDate,
  pending,
  LinkComponent,
  demo,
  className,
  openResetModal,
  onUpdate,
}: {
  user: string;
  habit: HabitRowSingleSelect;
  viewDate: Day;
  pending: boolean;
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
      viewDate={viewDate}
      pending={pending}
      goalHit={isGoalHit(habit)}
      LinkComponent={LinkComponent}
      demo={demo}
      menuAriaLabel={`More options for ${habit.name}`}
      onMenuClick={openResetModal}
      className={['mb-4', className].filter(Boolean).join(' ')}
      actions={<SingleSelectActions habit={habit} onUpdate={onUpdate} />}
    />
  );
}

function SummationHabitHeader({
  user,
  habit,
  viewDate,
  pending,
  LinkComponent,
  demo,
  className,
  openResetModal,
  onUpdate,
}: {
  user: string;
  habit: HabitRowSummation;
  viewDate: Day;
  pending: boolean;
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
      viewDate={viewDate}
      pending={pending}
      goalHit={isGoalHit(habit)}
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
  const draftRef = useRef(storedText);
  const lastAttemptedDraftRef = useRef(storedText);

  useEffect(() => {
    if (draftRef.current !== lastAttemptedDraftRef.current) return;
    draftRef.current = storedText;
    lastAttemptedDraftRef.current = storedText;
    setDraft((current) => (current === storedText ? current : storedText));
  }, [storedText]);

  useEffect(() => {
    if (pending || draft === storedText || draft === lastAttemptedDraftRef.current) return;

    const timeout = window.setTimeout(() => {
      lastAttemptedDraftRef.current = draft;
      void onUpdate({ habit: habit.name, text: draft });
    }, TEXT_AUTOSAVE_DELAY_MS);

    return () => window.clearTimeout(timeout);
  }, [draft, habit.name, onUpdate, pending, storedText]);

  return (
    <textarea
      className="habit-text__input text-b-m"
      aria-label={`${habit.name} text for the day`}
      placeholder="Write something for this day…"
      rows={3}
      value={draft}
      aria-busy={pending}
      onChange={(event) => {
        draftRef.current = event.target.value;
        setDraft(event.target.value);
      }}
    />
  );
}

function TextHabitHeader({
  user,
  habit,
  viewDate,
  pending,
  LinkComponent,
  demo,
  className,
  openResetModal,
  onUpdate,
}: {
  user: string;
  habit: HabitRowText;
  viewDate: Day;
  pending: boolean;
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
        viewDate={viewDate}
        pending={pending}
        LinkComponent={LinkComponent}
        demo={demo}
        menuAriaLabel={`More options for ${habit.name}`}
        onMenuClick={openResetModal}
        className="mb-4"
      />
      <TextHabitActions
        key={`${habit.name}:${viewDate}`}
        habit={habit}
        pending={pending}
        onUpdate={onUpdate}
      />
    </div>
  );
}

export default function HabitHeaderAndActionRenderer({
  user,
  habit,
  viewDate,
  pending,
  LinkComponent,
  onNavigate,
  demo = false,
  className,
  onUpdate,
}: HabitHeaderAndActionRendererProps) {
  const openResetModal = useHabitResetMenu({
    user,
    habit,
    onNavigate,
    onUpdate,
  });

  if (habit.type === 'single_select') {
    return (
      <SingleSelectHabitHeader
        user={user}
        habit={habit}
        viewDate={viewDate}
        pending={pending}
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
        viewDate={viewDate}
        pending={pending}
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
      viewDate={viewDate}
      pending={pending}
      LinkComponent={LinkComponent}
      demo={demo}
      openResetModal={openResetModal}
      className={className}
      onUpdate={onUpdate}
    />
  );
}
