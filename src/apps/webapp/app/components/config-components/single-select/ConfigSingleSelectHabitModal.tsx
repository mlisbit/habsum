import { useState } from 'react';
import { ModalBody, ModalHeader } from '@habsum/ui/contexts/modal';
import { CollapsibleCard } from '@habsum/ui/components/CollapsibleCard';
import { InfoText } from '@habsum/ui/components/InfoText';
import { Input } from '@habsum/ui/components/Input';
import type { UserConfigSingleSelectHabitInsight } from '~/api.client';
import { ConfigHabitFieldLabel } from '../ConfigHabitFieldLabel';
import { ConfigHabitOptionsPills, ConfigHabitStreakOptionsPills } from './ConfigHabitOptionPills';
import {
  ConfigHabitModalActions,
  ConfigHabitModalField,
  useConfigHabitModalDraft,
  type ConfigHabitModalProps,
} from '../ConfigHabitModalShared';
import { formatOptionLines } from '~/utils/configHabitDraft';

type ConfigSingleSelectHabitModalProps = Omit<ConfigHabitModalProps, 'insight'> & {
  insight: UserConfigSingleSelectHabitInsight;
};

function removedOptionsWithoutRename(
  previousOptions: string[],
  currentOptions: string[],
): string[] {
  const previousSet = new Set(previousOptions);
  const currentSet = new Set(currentOptions);
  const removed = previousOptions.filter((option) => !currentSet.has(option));
  const added = currentOptions.filter((option) => !previousSet.has(option));
  const looksLikeRename =
    previousOptions.length === currentOptions.length &&
    removed.length > 0 &&
    removed.length === added.length;

  return looksLikeRename ? [] : removed;
}

function hasYesNoOptions(options: string[]): boolean {
  return options.length === 2 && options.includes('yes') && options.includes('no');
}

export function ConfigSingleSelectHabitModal(props: ConfigSingleSelectHabitModalProps) {
  const {
    draft,
    dirty,
    editingHabitName,
    error,
    habitOptions,
    handleDoneClick,
    handleRemoveClick,
    initialHabitOptions,
    patch,
    saving,
    streakOptions,
  } = useConfigHabitModalDraft(props);
  const { insight, onCancel } = props;
  const [streakExpanded, setStreakExpanded] = useState(() => draft.streakEnabled);
  const optionsWithData = new Set(insight.optionsWithData);
  const removedOptionsWithData = removedOptionsWithoutRename(
    initialHabitOptions,
    habitOptions,
  ).filter((option) => optionsWithData.has(option));
  const removedOptionsWithDataLabel = removedOptionsWithData
    .map((option) => `"${option}"`)
    .join(', ');
  const showCheckboxThemeToggle = hasYesNoOptions(habitOptions);

  const setHabitOptions = (options: string[]) => {
    const allowed = new Set(options);
    patch({
      optionsText: formatOptionLines(options),
      streakOptionsText: formatOptionLines(streakOptions.filter((opt) => allowed.has(opt))),
      ...(hasYesNoOptions(options) ? {} : { theme: '' }),
    });
  };

  const setStreakOptions = (selected: string[]) => {
    const selectedSet = new Set(selected);
    patch({
      streakOptionsText: formatOptionLines(habitOptions.filter((opt) => selectedSet.has(opt))),
    });
  };

  return (
    <>
      <ModalHeader>Editing "{editingHabitName}"</ModalHeader>
      <ModalBody className="config-habit-modal">
        <ConfigHabitModalField label="Name" htmlFor="habit-name">
          <Input
            id="habit-name"
            className="config-habit-modal__name"
            value={draft.name}
            size="small"
            onChange={(name) => patch({ name })}
            placeholder="Habit name"
          />
        </ConfigHabitModalField>

        <ConfigHabitModalField
          label="Values"
          info="Values that can be selected when recording this habit."
          tooltip="The available choices when recording this habit. For example, a mood habit might use values such as “great”, “good”, “okay”, and “bad”."
          className="config-habit-modal__field--option-pills"
        >
          <div className="config-habit-modal__field-control-stack">
            <ConfigHabitOptionsPills options={habitOptions} onChange={setHabitOptions} />
            {showCheckboxThemeToggle ? (
              <div className="config-habit-modal__checkbox-field">
                <input
                  id="habit-theme-checkbox"
                  className="config-habit-modal__checkbox"
                  type="checkbox"
                  checked={draft.theme === 'checkbox'}
                  onChange={(e) => patch({ theme: e.target.checked ? 'checkbox' : '' })}
                />
                <ConfigHabitFieldLabel
                  htmlFor="habit-theme-checkbox"
                  label="Show as checkbox"
                  tooltip="Render yes, no, and empty values as a tri-state checkbox on the habit page."
                />
              </div>
            ) : null}
            {removedOptionsWithData.length > 0 ? (
              <InfoText size="small" variant="warning" className="config-habit-modal__error">
                Your existing entries that use {removedOptionsWithDataLabel} value will also be
                removed.
              </InfoText>
            ) : null}
          </div>
        </ConfigHabitModalField>

        <CollapsibleCard
          expanded={streakExpanded}
          collapsible={draft.streakEnabled}
          onExpandedChange={setStreakExpanded}
          className="config-habit-modal__collpasable-card"
        >
          <CollapsibleCard.Header>
            <div className="collapsible-card__header-main">
              <input
                id="habit-tracking-enabled"
                className="config-habit-modal__checkbox"
                type="checkbox"
                checked={draft.streakEnabled}
                onClick={(e) => e.stopPropagation()}
                onChange={(e) => {
                  const streakEnabled = e.target.checked;
                  patch({ streakEnabled });
                  setStreakExpanded(streakEnabled);
                }}
              />
              <div
                className="config-habit-modal__collapsible-header-label"
                onClick={(e) => e.stopPropagation()}
              >
                <ConfigHabitFieldLabel
                  htmlFor="habit-tracking-enabled"
                  label="Streak tracking"
                  tooltip="Track consecutive successful days for this habit. Disable this if you only want to record entries without streaks."
                />
              </div>
            </div>
            <CollapsibleCard.Toggle ariaLabel="Toggle tracking options" />
          </CollapsibleCard.Header>
          <CollapsibleCard.Content className="flex flex-flow-col gap-3">
            <ConfigHabitModalField
              label="Streak options"
              info="Values that count toward maintaining a streak."
              tooltip="Select which values count as a successful day for streak tracking. If multiple values are selected, any of them will maintain the streak."
              className="config-habit-modal__field--option-pills"
            >
              <ConfigHabitStreakOptionsPills
                options={habitOptions}
                selected={streakOptions}
                onChange={setStreakOptions}
              />
            </ConfigHabitModalField>
            <ConfigHabitModalField
              label="Frequency"
              info="Complete this habit at least this many days each week to continue your streak."
              htmlFor="habit-streak-frequency"
            >
              <select
                id="habit-streak-frequency"
                className="config-habit-modal__select text-b-m"
                value={draft.streakFrequencyPerWeek}
                onChange={(e) => patch({ streakFrequencyPerWeek: e.target.value })}
              >
                {Array.from({ length: 7 }, (_, i) => {
                  const n = i + 1;
                  const value = String(n);
                  const label = n === 1 ? '1 day per week' : `${n} days per week`;
                  return (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  );
                })}
              </select>
            </ConfigHabitModalField>
            <div className="config-habit-modal__checkbox-field">
              <input
                id="habit-streak-show-longest"
                className="config-habit-modal__checkbox"
                type="checkbox"
                checked={draft.streakShowLongest}
                onChange={(e) => patch({ streakShowLongest: e.target.checked })}
              />
              <ConfigHabitFieldLabel
                htmlFor="habit-streak-show-longest"
                label="Show longest streak"
              />
            </div>
          </CollapsibleCard.Content>
        </CollapsibleCard>

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
