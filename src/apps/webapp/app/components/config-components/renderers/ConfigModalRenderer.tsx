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
import { HABIT_REPEAT_DAYS, isHabitDraftDirty, parseOptionLines } from '~/utils/configHabitDraft';

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

function repeatLabel(repeat: string[]): string {
  if (repeat.length === HABIT_REPEAT_DAYS.length) return 'everyday';
  return (
    HABIT_REPEAT_DAYS.filter((day) => repeat.includes(day))
      .map((day) => REPEAT_DAY_LABELS[day].slice(0, 3))
      .join(', ') || 'No days'
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
  const habitOptions = parseOptionLines(draft.optionsText);
  const streakOptions = parseOptionLines(draft.streakOptionsText);
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

  const repeatControl = (
    <Dropdown>
      <Dropdown.Trigger asChild>
        <TriggerPill size="small" className="config-habit-modal__repeat-trigger">
          {repeatLabel(draft.repeat)}
        </TriggerPill>
      </Dropdown.Trigger>
      <Dropdown.Content className="config-habit-modal__repeat-dropdown">
        <div className="config-habit-modal__repeat-options">
          {HABIT_REPEAT_DAYS.map((day) => (
            <label key={day} className="config-habit-modal__repeat-option text-b-s">
              <input
                className="config-habit-modal__checkbox"
                type="checkbox"
                checked={draft.repeat.includes(day)}
                onChange={(event) => {
                  if (event.target.checked) {
                    patch({
                      repeat: HABIT_REPEAT_DAYS.filter(
                        (candidate) => candidate === day || draft.repeat.includes(candidate),
                      ),
                    });
                    return;
                  }
                  if (draft.repeat.length <= 1) return;
                  patch({ repeat: draft.repeat.filter((repeatDay) => repeatDay !== day) });
                }}
              />
              {REPEAT_DAY_LABELS[day]}
            </label>
          ))}
        </div>
      </Dropdown.Content>
    </Dropdown>
  );

  const repeatField = (
    <div className="config-habit-modal__field">
      <div className="config-habit-modal__label">
        <label className="text-b-m">Repeat</label>
      </div>
      <div className="config-habit-modal__control">{repeatControl}</div>
    </div>
  );

  let fields;
  switch (habit.type) {
    case 'single_select':
      fields = (
        <>
          <SingleSelectBaseOptions
            draft={draft}
            habitOptions={habitOptions}
            patch={patch}
            streakOptions={streakOptions}
          />

          {repeatField}

          <div className="config-habit-modal__widgets">
            <DataVisualizationWidget draft={draft} patch={patch} type={['heatmap']} />

            <InsightsWidget
              type="single_select"
              draft={draft}
              habitOptions={habitOptions}
              patch={patch}
              streakOptions={streakOptions}
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
  }

  if (activeView === 'streak-options') {
    return (
      <>
        <ModalHeader onBack={() => setActiveView('habit')}>
          Streak options for "{editingHabitName}"
        </ModalHeader>
        <ModalBody className="config-habit-modal">
          {habit.type === 'single_select' ? (
            <StreakOptionsFields
              type="single_select"
              draft={draft}
              habitOptions={habitOptions}
              patch={patch}
              streakOptions={streakOptions}
            />
          ) : (
            <StreakOptionsFields type="summation" draft={draft} patch={patch} />
          )}
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
