// exclusive-bem-block: config-habit-modal
import { useMemo, useState, type ReactNode } from 'react';
import { ModalActions, ModalBody, ModalHeader } from '~/context/modal';
import { Button } from '~/core-components/Button';
import { InfoText } from '~/core-components/InfoText';
import { CollapsibleCard } from '~/core-components/CollapsibleCard';
import { Input } from '~/core-components/Input';
import { ConfigHabitFieldLabel } from './ConfigHabitFieldLabel';
import { ConfigHabitQuickAddPills } from './ConfigHabitQuickAddPills';
import { ConfigHabitOptionsPills, ConfigHabitStreakOptionsPills } from './ConfigHabitOptionPills';
import {
  applyHabitDraftToConfigYaml,
  formatOptionLines,
  isHabitDraftDirty,
  parseHabitDraftFromText,
  parseOptionLines,
  sortQuickAddItems,
  type ConfigHabitDraft,
} from '~/utils/configHabitDraft';

type ConfigHabitModalFieldProps = {
  label: string;
  info?: string | null;
  tooltip?: string | null;
  htmlFor?: string;
  className?: string;
  children: ReactNode;
};

function ConfigHabitModalField({
  label,
  info,
  tooltip,
  htmlFor,
  className,
  children,
}: ConfigHabitModalFieldProps) {
  return (
    <div className={['config-habit-modal__field', className].filter(Boolean).join(' ')}>
      <ConfigHabitFieldLabel
        htmlFor={htmlFor}
        label={label}
        info={info ?? undefined}
        tooltip={tooltip ?? undefined}
        className="config-habit-modal__label"
      />
      <div className="config-habit-modal__control">{children}</div>
    </div>
  );
}

export type ConfigCardModalProps = {
  configText: string;
  habitName: string;
  isNewHabit?: boolean;
  onDoneClick: (nextConfigText: string, appliedHabitName: string) => void | Promise<void>;
  onRemoveClick: (habitName: string) => void | Promise<void>;
  onCancel: () => void;
};

export function ConfigCardModal({
  configText,
  habitName,
  isNewHabit = false,
  onDoneClick,
  onRemoveClick,
  onCancel,
}: ConfigCardModalProps) {
  const initial = useMemo(
    () => parseHabitDraftFromText(configText, habitName),
    [configText, habitName],
  );
  const [draft, setDraft] = useState<ConfigHabitDraft>(initial);
  const [streakExpanded, setStreakExpanded] = useState(() => initial.streakEnabled);
  const goalEnabled = draft.goal.trim() !== '';
  const quickAddEnabled = draft.quickAddItems.length > 0;
  const dirty = useMemo(
    () => isHabitDraftDirty(initial, draft) || isNewHabit,
    [draft, initial, isNewHabit],
  );
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const patch = (partial: Partial<ConfigHabitDraft>) => {
    setDraft((prev) => ({ ...prev, ...partial }));
    setError(null);
  };

  const handleRemoveClick = async () => {
    try {
      setSaving(true);
      setError(null);
      await onRemoveClick(habitName);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  };

  const handleDoneClick = async () => {
    try {
      const appliedHabitName = draft.name.trim() || habitName;
      const next = applyHabitDraftToConfigYaml(configText, draft, habitName);
      setSaving(true);
      setError(null);
      await onDoneClick(next, appliedHabitName);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  };

  const habitOptions = parseOptionLines(draft.optionsText);
  const streakOptions = parseOptionLines(draft.streakOptionsText);

  const setHabitOptions = (options: string[]) => {
    const allowed = new Set(options);
    patch({
      optionsText: formatOptionLines(options),
      streakOptionsText: formatOptionLines(streakOptions.filter((opt) => allowed.has(opt))),
    });
  };

  const setStreakOptions = (selected: string[]) => {
    const selectedSet = new Set(selected);
    patch({
      streakOptionsText: formatOptionLines(habitOptions.filter((opt) => selectedSet.has(opt))),
    });
  };

  const setGoalEnabled = (enabled: boolean) => {
    patch({ goal: enabled ? draft.goal.trim() || '1' : '' });
  };

  const setQuickAddEnabled = (enabled: boolean) => {
    if (enabled) {
      patch({
        quickAddItems:
          draft.quickAddItems.length > 0 ? draft.quickAddItems : sortQuickAddItems(['1', '10']),
      });
      return;
    }
    patch({ quickAddItems: [] });
  };

  const setHistoryEnabled = (historyEnabled: boolean) => {
    patch({
      historyEnabled,
      ...(historyEnabled
        ? {
            historyPeriodAmount: draft.historyPeriodAmount.trim() || '1',
            historyPeriodUnit: draft.historyPeriodUnit,
          }
        : {}),
    });
  };

  const editingHabitName = draft.name.trim() || habitName;

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

        {draft.type === 'summation' ? (
          <>
            <div className="config-habit-modal__field">
              <div className="config-habit-modal__label config-habit-modal__checkbox-field">
                <input
                  id="habit-goal-enabled"
                  className="config-habit-modal__checkbox"
                  type="checkbox"
                  checked={goalEnabled}
                  onChange={(e) => setGoalEnabled(e.target.checked)}
                />
                <ConfigHabitFieldLabel
                  htmlFor="habit-goal-enabled"
                  label="Goal"
                  info="Reach this amount to complete the habit."
                />
              </div>
              <div className="config-habit-modal__control">
                {goalEnabled ? (
                  <Input
                    id="habit-goal"
                    type="number"
                    size="small"
                    className="config-habit-modal__input"
                    value={draft.goal}
                    onChange={(goal) => patch({ goal })}
                    placeholder="Goal"
                  />
                ) : null}
              </div>
            </div>

            <div className="config-habit-modal__field config-habit-modal__field--option-pills">
              <div className="config-habit-modal__label config-habit-modal__checkbox-field">
                <input
                  id="habit-quick-add-enabled"
                  className="config-habit-modal__checkbox"
                  type="checkbox"
                  checked={quickAddEnabled}
                  onChange={(e) => setQuickAddEnabled(e.target.checked)}
                />
                <ConfigHabitFieldLabel
                  htmlFor="habit-quick-add-enabled"
                  label="Quick add options"
                  info="Frequently used amounts that can be added with one click."
                />
              </div>
              <div className="config-habit-modal__control">
                {quickAddEnabled ? (
                  <ConfigHabitQuickAddPills
                    values={draft.quickAddItems}
                    onChange={(quickAddItems) => patch({ quickAddItems })}
                  />
                ) : null}
              </div>
            </div>
          </>
        ) : (
          <>
            <ConfigHabitModalField
              label="Values"
              info="Values that can be selected when recording this habit."
              tooltip="The available choices when recording this habit. For example, a mood habit might use values such as “great”, “good”, “okay”, and “bad”."
              className="config-habit-modal__field--option-pills"
            >
              <ConfigHabitOptionsPills options={habitOptions} onChange={setHabitOptions} />
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
          </>
        )}

        {draft.type === 'summation' ? (
          <div className="config-habit-modal__field">
            <div className="config-habit-modal__label config-habit-modal__checkbox-field">
              <input
                id="habit-history-enabled"
                className="config-habit-modal__checkbox"
                type="checkbox"
                checked={draft.historyEnabled}
                onChange={(e) => setHistoryEnabled(e.target.checked)}
              />
              <ConfigHabitFieldLabel
                htmlFor="habit-history-enabled"
                label="History"
                info="Show a chart of past entries for this habit."
              />
            </div>
            <div className="config-habit-modal__control">
              {draft.historyEnabled ? (
                <div className="config-habit-modal__history-length">
                  <Input
                    id="habit-history-amount"
                    type="number"
                    size="small"
                    className="config-habit-modal__history-length-input"
                    value={draft.historyPeriodAmount}
                    onChange={(historyPeriodAmount) => patch({ historyPeriodAmount })}
                    placeholder="Length"
                  />
                  <span className="text-b-m text-light">weeks</span>
                </div>
              ) : null}
            </div>
          </div>
        ) : null}

        {error != null ? (
          <InfoText variant="error" className="config-habit-modal__error">
            {error}
          </InfoText>
        ) : null}
      </ModalBody>
      <ModalActions>
        <div className="config-habit-modal__actions">
          <Button
            type="secondary"
            color="danger"
            text={saving ? 'Removing…' : 'Remove'}
            onClick={() => void handleRemoveClick()}
            disabled={saving}
          />
          <div className="config-habit-modal__actions-main">
            <Button type="secondary" text="Cancel" onClick={onCancel} disabled={saving} />
            <Button
              type="primary"
              text={saving ? 'Saving…' : 'Done'}
              onClick={() => void handleDoneClick()}
              disabled={saving || !dirty}
            />
          </div>
        </div>
      </ModalActions>
    </>
  );
}
