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

const FIELD_HELP = {
  name: 'Display name for this habit in config and the app. Must be unique among habits.',
  type: 'Whether this habit tracks a numeric total (summation) or one choice from a list (single select).',
  goal: 'Optional daily or rolling target for the total. Leave blank if you do not use a goal.',
  quickAddOptions:
    'Quick-add amounts shown beside the manual entry field on habit cards (negative values subtract).',
  options: 'Allowed choices for this habit. Use + to add each option.',
  streakEnabled: 'Track consecutive days where the selected option is one of the tracking options.',
  streakOptionsInfo: 'Tap options to include them in consecutive-day tracking.',
  historyEnabled: 'Show a history chart for this habit over a configured time window.',
  historyLength:
    'How far back the habit detail page shows history. Default is 1 week when history is enabled.',
} as const;

type ConfigHabitModalFieldProps = {
  label: string;
  info: string;
  htmlFor?: string;
  className?: string;
  children: ReactNode;
};

function ConfigHabitModalField({
  label,
  info,
  htmlFor,
  className,
  children,
}: ConfigHabitModalFieldProps) {
  return (
    <div className={['config-habit-modal__field', className].filter(Boolean).join(' ')}>
      <div className="config-habit-modal__label">
        <ConfigHabitFieldLabel htmlFor={htmlFor} label={label} info={info} />
      </div>
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
  const [quickAddExpanded, setQuickAddExpanded] = useState(() => initial.quickAddItems.length > 0);
  const [streakExpanded, setStreakExpanded] = useState(() => initial.streakEnabled);
  const [historyExpanded, setHistoryExpanded] = useState(() => initial.historyEnabled);
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

  const onTypeChange = (type: ConfigHabitDraft['type']) => {
    setDraft((prev) => ({
      ...prev,
      type,
      ...(type === 'summation'
        ? { optionsText: '', streakEnabled: false, streakOptionsText: '' }
        : {
            quickAddItems: [],
            goal: '',
            historyEnabled: false,
          }),
    }));
    if (type === 'single_select') {
      setQuickAddExpanded(false);
      setHistoryExpanded(false);
    }
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

  const editingHabitName = draft.name.trim() || habitName;

  return (
    <>
      <ModalHeader>Editing habit: {editingHabitName}</ModalHeader>
      <ModalBody className="config-habit-modal">
        <ConfigHabitModalField label="Name" info={FIELD_HELP.name} htmlFor="habit-name">
          <Input
            id="habit-name"
            className="config-habit-modal__name"
            value={draft.name}
            size="small"
            onChange={(name) => patch({ name })}
            placeholder="Habit name"
          />
        </ConfigHabitModalField>

        <ConfigHabitModalField label="Type" info={FIELD_HELP.type} htmlFor="habit-type">
          <select
            id="habit-type"
            className="config-habit-modal__select text-b-m"
            value={draft.type}
            onChange={(e) =>
              onTypeChange(e.target.value === 'single_select' ? 'single_select' : 'summation')
            }
          >
            <option value="summation">Summation</option>
            <option value="single_select">Single select</option>
          </select>
        </ConfigHabitModalField>

        {draft.type === 'summation' ? (
          <>
            <ConfigHabitModalField label="Goal" info={FIELD_HELP.goal} htmlFor="habit-goal">
              <Input
                id="habit-goal"
                type="number"
                size="small"
                className="config-habit-modal__input"
                value={draft.goal}
                onChange={(goal) => patch({ goal })}
                placeholder="Optional"
              />
            </ConfigHabitModalField>

            <CollapsibleCard
              expanded={quickAddExpanded}
              collapsible={quickAddEnabled}
              onExpandedChange={setQuickAddExpanded}
            >
              <CollapsibleCard.Header>
                <div className="collapsible-card__header-main">
                  <input
                    id="habit-quick-add-enabled"
                    className="config-habit-modal__checkbox"
                    type="checkbox"
                    checked={quickAddEnabled}
                    onClick={(e) => e.stopPropagation()}
                    onChange={(e) => {
                      const enabled = e.target.checked;
                      if (enabled) {
                        patch({
                          quickAddItems:
                            draft.quickAddItems.length > 0
                              ? draft.quickAddItems
                              : sortQuickAddItems(['1', '10']),
                        });
                        setQuickAddExpanded(true);
                        return;
                      }
                      patch({ quickAddItems: [] });
                      setQuickAddExpanded(false);
                    }}
                  />
                  <div
                    className="config-habit-modal__collapsible-header-label"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <ConfigHabitFieldLabel
                      htmlFor="habit-quick-add-enabled"
                      label="Quick add options"
                      info={FIELD_HELP.quickAddOptions}
                    />
                  </div>
                </div>
                <CollapsibleCard.Toggle ariaLabel="Toggle quick add options" />
              </CollapsibleCard.Header>
              <CollapsibleCard.Content>
                <ConfigHabitQuickAddPills
                  values={draft.quickAddItems}
                  onChange={(quickAddItems) => patch({ quickAddItems })}
                />
              </CollapsibleCard.Content>
            </CollapsibleCard>
          </>
        ) : (
          <>
            <ConfigHabitModalField
              label="Options"
              info={FIELD_HELP.options}
              className="config-habit-modal__field--option-pills"
            >
              <ConfigHabitOptionsPills options={habitOptions} onChange={setHabitOptions} />
            </ConfigHabitModalField>

            <CollapsibleCard
              expanded={streakExpanded}
              collapsible={draft.streakEnabled}
              onExpandedChange={setStreakExpanded}
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
                      info={FIELD_HELP.streakEnabled}
                    />
                  </div>
                </div>
                <CollapsibleCard.Toggle ariaLabel="Toggle tracking options" />
              </CollapsibleCard.Header>
              <CollapsibleCard.Content>
                <ConfigHabitModalField
                  label="Streak options"
                  info={FIELD_HELP.streakOptionsInfo}
                  className="config-habit-modal__field--option-pills"
                >
                  <ConfigHabitStreakOptionsPills
                    options={habitOptions}
                    selected={streakOptions}
                    onChange={setStreakOptions}
                  />
                </ConfigHabitModalField>
              </CollapsibleCard.Content>
            </CollapsibleCard>
          </>
        )}

        {draft.type === 'summation' ? (
          <CollapsibleCard
            expanded={historyExpanded}
            collapsible={draft.historyEnabled}
            onExpandedChange={setHistoryExpanded}
          >
            <CollapsibleCard.Header>
              <div className="collapsible-card__header-main">
                <input
                  id="habit-history-enabled"
                  className="config-habit-modal__checkbox"
                  type="checkbox"
                  checked={draft.historyEnabled}
                  onClick={(e) => e.stopPropagation()}
                  onChange={(e) => {
                    const historyEnabled = e.target.checked;
                    patch({
                      historyEnabled,
                      ...(historyEnabled
                        ? {
                            historyPeriodAmount: draft.historyPeriodAmount.trim() || '1',
                            historyPeriodUnit: draft.historyPeriodUnit,
                          }
                        : {}),
                    });
                    setHistoryExpanded(historyEnabled);
                  }}
                />
                <div
                  className="config-habit-modal__collapsible-header-label"
                  onClick={(e) => e.stopPropagation()}
                >
                  <ConfigHabitFieldLabel
                    htmlFor="habit-history-enabled"
                    label="History"
                    info={FIELD_HELP.historyEnabled}
                  />
                </div>
              </div>
              <CollapsibleCard.Toggle ariaLabel="Toggle history options" />
            </CollapsibleCard.Header>
            <CollapsibleCard.Content>
              <ConfigHabitModalField
                label="History length"
                info={FIELD_HELP.historyLength}
                htmlFor="habit-history-amount"
              >
                <div className="config-habit-modal__history-period">
                  <Input
                    id="habit-history-amount"
                    type="number"
                    size="small"
                    className="config-habit-modal__history-period-amount"
                    value={draft.historyPeriodAmount}
                    onChange={(historyPeriodAmount) => patch({ historyPeriodAmount })}
                  />
                  <select
                    id="habit-history-unit"
                    className="config-habit-modal__select config-habit-modal__history-period-unit text-b-m"
                    value={draft.historyPeriodUnit}
                    onChange={(e) =>
                      patch({
                        historyPeriodUnit: e.target.value === 'd' ? 'd' : ('w' as const),
                      })
                    }
                  >
                    <option value="w">Weeks</option>
                    <option value="d">Days</option>
                  </select>
                </div>
              </ConfigHabitModalField>
            </CollapsibleCard.Content>
          </CollapsibleCard>
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
