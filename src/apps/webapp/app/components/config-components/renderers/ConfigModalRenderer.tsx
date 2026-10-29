import { useMemo, useState } from 'react';
import { Dropdown } from '@habsum/ui/components/Dropdown';
import { TriggerPill } from '@habsum/ui/components/Pill';
import { ModalBody, ModalHeader } from '@habsum/ui/contexts/modal';
import { InfoText } from '@habsum/ui/components/InfoText';
import { Input } from '@habsum/ui/components/Input';
import type { ConfigHabitDraft, UserConfigJsonHabit } from '~/api.client';
import { SingleSelectBaseOptions } from './_private/base-options/SingleSelectBaseOptions';
import { SummationBaseOptions } from './_private/base-options/SummationBaseOptions';
import { ConfigHabitModalActions } from './_private/utils/ConfigHabitModalActions';
import { DataVisualizationWidget } from './_private/widgets/DataVisualizationWidget';
import { InsightsWidget, StreakOptionsFields } from './_private/widgets/InsightsWidget';
import { HABIT_REPEAT_DAYS, isHabitDraftDirty } from '~/utils/configHabitDraft';

type ConfigModalRendererProps = {
  habit: UserConfigJsonHabit;
  initialDraft: ConfigHabitDraft;
  isNewHabit?: boolean;
  onDoneClick: (habitName: string, draft: ConfigHabitDraft) => void | Promise<void>;
  onRemoveClick: (habitName: string) => void | Promise<void>;
  onCancel: () => void;
};

const REPEAT_DAY_LABELS: Record<(typeof HABIT_REPEAT_DAYS)[number], string> = {
  monday: 'Monday',
  tuesday: 'Tuesday',
  wednesday: 'Wednesday',
  thursday: 'Thursday',
  friday: 'Friday',
  saturday: 'Saturday',
  sunday: 'Sunday',
};

function weekdayScheduleLabel(schedule: string[]): string {
  if (schedule.length === HABIT_REPEAT_DAYS.length) return 'Everyday';
  return (
    HABIT_REPEAT_DAYS.filter((day) => schedule.includes(day))
      .map((day) => REPEAT_DAY_LABELS[day].slice(0, 3))
      .join(', ') || 'No days'
  );
}

function WeekdayScheduleField({
  label,
  schedule,
  onChange,
}: {
  label: string;
  schedule: string[];
  onChange: (schedule: string[]) => void;
}) {
  return (
    <div className="config-habit-modal__field">
      <div className="config-habit-modal__label">
        <label className="text-b-m">{label}</label>
      </div>
      <div className="config-habit-modal__control">
        <Dropdown>
          <Dropdown.Trigger asChild>
            <TriggerPill size="small" className="config-habit-modal__repeat-trigger">
              {weekdayScheduleLabel(schedule)}
            </TriggerPill>
          </Dropdown.Trigger>
          <Dropdown.Content className="config-habit-modal__repeat-dropdown">
            <div className="config-habit-modal__repeat-options">
              {HABIT_REPEAT_DAYS.map((day) => (
                <label key={day} className="config-habit-modal__repeat-option text-b-s">
                  <input
                    className="config-habit-modal__checkbox"
                    type="checkbox"
                    checked={schedule.includes(day)}
                    onChange={(event) => {
                      if (event.target.checked) {
                        onChange(
                          HABIT_REPEAT_DAYS.filter(
                            (candidate) => candidate === day || schedule.includes(candidate),
                          ),
                        );
                        return;
                      }
                      if (schedule.length <= 1) return;
                      onChange(schedule.filter((scheduledDay) => scheduledDay !== day));
                    }}
                  />
                  {REPEAT_DAY_LABELS[day]}
                </label>
              ))}
            </div>
          </Dropdown.Content>
        </Dropdown>
      </div>
    </div>
  );
}

export function ConfigModalRenderer({
  habit,
  initialDraft,
  isNewHabit = false,
  onDoneClick,
  onRemoveClick,
  onCancel,
}: ConfigModalRendererProps) {
  const initial = useMemo(() => initialDraft, [initialDraft]);
  const [draft, setDraft] = useState<ConfigHabitDraft>(initial);
  const dirty = useMemo(
    () => isHabitDraftDirty(initial, draft) || isNewHabit,
    [draft, initial, isNewHabit],
  );
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [activeView, setActiveView] = useState<'habit' | 'streak-options'>('habit');
  const editingHabitName = draft.name.trim() || habit.name;

  const patch = (partial: Partial<ConfigHabitDraft>) => {
    setDraft((prev) => ({ ...prev, ...partial }));
    setError(null);
  };

  const handleRemoveClick = async () => {
    try {
      setSaving(true);
      setError(null);
      await onRemoveClick(habit.name);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  };

  const handleDoneClick = async () => {
    try {
      setSaving(true);
      setError(null);
      await onDoneClick(habit.name, draft);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  };

  const repeatField = (
    <WeekdayScheduleField
      label="Repeat"
      schedule={draft.repeat}
      onChange={(repeat) => patch({ repeat })}
    />
  );

  const resetField = (
    <WeekdayScheduleField
      label="Reset"
      schedule={draft.reset}
      onChange={(reset) => patch({ reset })}
    />
  );

  let fields;
  switch (habit.type) {
    case 'single_select':
      fields = (
        <>
          <SingleSelectBaseOptions draft={draft} patch={patch} />

          {repeatField}

          <div className="config-habit-modal__widgets">
            <DataVisualizationWidget draft={draft} patch={patch} type={['heatmap']} />

            <InsightsWidget
              type="single_select"
              draft={draft}
              patch={patch}
              onOpenStreakOptions={() => setActiveView('streak-options')}
            />
          </div>
        </>
      );
      break;
    case 'summation':
      fields = (
        <>
          <SummationBaseOptions draft={draft} patch={patch} />

          {repeatField}

          <div className="config-habit-modal__widgets">
            <DataVisualizationWidget
              draft={draft}
              patch={patch}
              type={['weekly_history', 'heatmap']}
            />

            <InsightsWidget
              type="summation"
              draft={draft}
              patch={patch}
              onOpenStreakOptions={() => setActiveView('streak-options')}
            />
          </div>
        </>
      );
      break;
    case 'text':
      fields = (
        <>
          {repeatField}
          {resetField}
        </>
      );
      break;
  }

  if (activeView === 'streak-options') {
    return (
      <>
        <ModalHeader onBack={() => setActiveView('habit')}>
          Streak options for "{editingHabitName}"
        </ModalHeader>
        <ModalBody className="config-habit-modal">
          {habit.type === 'single_select' ? (
            <StreakOptionsFields type="single_select" draft={draft} patch={patch} />
          ) : habit.type === 'summation' ? (
            <StreakOptionsFields type="summation" draft={draft} patch={patch} />
          ) : null}
        </ModalBody>
      </>
    );
  }

  return (
    <>
      <ModalHeader>Editing "{editingHabitName}"</ModalHeader>
      <ModalBody className="config-habit-modal">
        <div className="config-habit-modal__field config-habit-modal__field--name">
          <label htmlFor="habit-name" className="config-habit-modal__label text-b-m">
            Name
          </label>
          <div className="config-habit-modal__control">
            <Input
              id="habit-name"
              className="config-habit-modal__name"
              value={draft.name}
              size="small"
              onChange={(name) => patch({ name })}
              placeholder="Habit name"
            />
          </div>
        </div>

        {fields}

        {error != null ? (
          <InfoText size="small" variant="error" className="config-habit-modal__error">
            {error}
          </InfoText>
        ) : null}
      </ModalBody>
      <ConfigHabitModalActions
        dirty={dirty}
        saving={saving}
        onCancel={onCancel}
        onRemoveClick={() => void handleRemoveClick()}
        onDoneClick={() => void handleDoneClick()}
      />
    </>
  );
}
