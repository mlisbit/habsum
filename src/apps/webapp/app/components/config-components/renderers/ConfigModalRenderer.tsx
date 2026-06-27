import { useMemo, useState } from 'react';
import { ModalBody, ModalHeader } from '@habsum/ui/contexts/modal';
import { InfoText } from '@habsum/ui/components/InfoText';
import { Input } from '@habsum/ui/components/Input';
import type { ConfigHabitDraft, UserConfigJsonHabit } from '~/api.client';
import { SingleSelectBaseOptions } from './_private/base-options/SingleSelectBaseOptions';
import { SummationBaseOptions } from './_private/base-options/SummationBaseOptions';
import { ConfigHabitModalActions } from './_private/utils/ConfigHabitModalActions';
import { HistoryWidget } from './_private/widgets/HistoryWidget';
import { StreakTrackingWidget } from './_private/widgets/StreakTrackingWidget';
import { isHabitDraftDirty, parseOptionLines } from '~/utils/configHabitDraft';

type ConfigModalRendererProps = {
  habit: UserConfigJsonHabit;
  initialDraft: ConfigHabitDraft;
  isNewHabit?: boolean;
  onDoneClick: (habitName: string, draft: ConfigHabitDraft) => void | Promise<void>;
  onRemoveClick: (habitName: string) => void | Promise<void>;
  onCancel: () => void;
};

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

          <div className="config-habit-modal__widgets">
            <StreakTrackingWidget
              type="single_select"
              draft={draft}
              habitOptions={habitOptions}
              patch={patch}
              streakOptions={streakOptions}
            />
          </div>
        </>
      );
      break;
    case 'summation':
      fields = (
        <>
          <SummationBaseOptions draft={draft} patch={patch} />

          <div className="config-habit-modal__widgets">
            <StreakTrackingWidget type="summation" draft={draft} patch={patch} />

            <HistoryWidget draft={draft} patch={patch} />
          </div>
        </>
      );
      break;
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
